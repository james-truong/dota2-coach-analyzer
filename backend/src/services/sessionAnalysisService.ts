// Service for session/tilt detection and analysis
import pg from 'pg'

const Pool = pg.Pool

let pool: pg.Pool | null = null

function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  }
  return pool
}

interface SessionMatch {
  matchId: string
  heroName: string
  heroImage: string
  won: boolean
  kills: number
  deaths: number
  assists: number
  gpm: number
  startTime: number
  duration: number
}

export interface PlaySession {
  sessionId: string
  startTime: Date
  endTime: Date
  matches: SessionMatch[]
  stats: {
    totalMatches: number
    wins: number
    losses: number
    winRate: number
    avgKDA: number
    avgGpm: number
    longestLosingStreak: number
    performanceTrend: 'improving' | 'declining' | 'stable'
  }
}

export interface TiltAnalysis {
  currentTiltRisk: 'low' | 'medium' | 'high'
  recentLosingStreak: number
  lastMatchWon: boolean | null
  activeWarnings: Array<{
    type: 'losing_streak' | 'declining_performance' | 'long_session' | 'late_night'
    message: string
    severity: 'warning' | 'danger'
  }>
  patterns: {
    performanceAfterLoss: number // Win rate after a loss
    lateNightWinRate: number // Win rate after midnight
    longSessionWinRate: number // Win rate in games 4+ of a session
  }
}

export interface TimeOfDayStats {
  morning: { games: number; wins: number; winRate: number }
  afternoon: { games: number; wins: number; winRate: number }
  evening: { games: number; wins: number; winRate: number }
  night: { games: number; wins: number; winRate: number }
  bestTimeToPlay: string
}

export interface DayOfWeekStats {
  days: Array<{
    day: string
    games: number
    wins: number
    winRate: number
  }>
  bestDay: string
  worstDay: string
}

/**
 * Group matches into play sessions based on time gaps
 * A new session starts if there's more than 45 minutes between matches
 */
export async function getPlaySessions(userId: string, daysBack: number = 30): Promise<PlaySession[]> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)

    const result = await getPool().query(`
      SELECT
        match_id,
        hero_name,
        hero_image,
        won,
        kills,
        deaths,
        assists,
        gold_per_min,
        start_time,
        duration
      FROM analyzed_matches
      WHERE user_id = $1
        AND start_time IS NOT NULL
        AND analyzed_at > $2
      ORDER BY start_time ASC
    `, [userId, cutoffDate])

    if (result.rows.length === 0) {
      return []
    }

    const matches: SessionMatch[] = result.rows.map(row => ({
      matchId: row.match_id,
      heroName: row.hero_name,
      heroImage: row.hero_image,
      won: row.won,
      kills: row.kills,
      deaths: row.deaths,
      assists: row.assists,
      gpm: row.gold_per_min,
      startTime: row.start_time,
      duration: row.duration,
    }))

    // Group into sessions (45 minute gap = new session)
    const sessions: PlaySession[] = []
    let currentSession: SessionMatch[] = []
    let sessionId = 1

    for (const match of matches) {
      if (currentSession.length === 0) {
        currentSession.push(match)
      } else {
        const lastMatch = currentSession[currentSession.length - 1]
        const lastMatchEndTime = lastMatch.startTime + lastMatch.duration
        const gapMinutes = (match.startTime - lastMatchEndTime) / 60

        if (gapMinutes <= 45) {
          currentSession.push(match)
        } else {
          // Finalize current session
          sessions.push(buildSession(currentSession, sessionId++))
          currentSession = [match]
        }
      }
    }

    // Don't forget the last session
    if (currentSession.length > 0) {
      sessions.push(buildSession(currentSession, sessionId))
    }

    // Return in reverse chronological order
    return sessions.reverse()
  } catch (error) {
    console.error('Error getting play sessions:', error)
    return []
  }
}

function buildSession(matches: SessionMatch[], sessionId: number): PlaySession {
  const wins = matches.filter(m => m.won).length
  const losses = matches.length - wins
  const winRate = matches.length > 0 ? (wins / matches.length) * 100 : 0

  const avgKDA = matches.reduce((sum, m) => {
    const kda = m.deaths > 0 ? (m.kills + m.assists) / m.deaths : m.kills + m.assists
    return sum + kda
  }, 0) / matches.length

  const avgGpm = matches.reduce((sum, m) => sum + m.gpm, 0) / matches.length

  // Calculate longest losing streak
  let longestLosingStreak = 0
  let currentStreak = 0
  for (const match of matches) {
    if (!match.won) {
      currentStreak++
      longestLosingStreak = Math.max(longestLosingStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }

  // Determine performance trend (compare first half to second half)
  let performanceTrend: 'improving' | 'declining' | 'stable' = 'stable'
  if (matches.length >= 4) {
    const mid = Math.floor(matches.length / 2)
    const firstHalf = matches.slice(0, mid)
    const secondHalf = matches.slice(mid)

    const firstHalfWinRate = firstHalf.filter(m => m.won).length / firstHalf.length
    const secondHalfWinRate = secondHalf.filter(m => m.won).length / secondHalf.length

    if (secondHalfWinRate > firstHalfWinRate + 0.15) {
      performanceTrend = 'improving'
    } else if (secondHalfWinRate < firstHalfWinRate - 0.15) {
      performanceTrend = 'declining'
    }
  }

  const firstMatch = matches[0]
  const lastMatch = matches[matches.length - 1]

  return {
    sessionId: `session-${sessionId}`,
    startTime: new Date(firstMatch.startTime * 1000),
    endTime: new Date((lastMatch.startTime + lastMatch.duration) * 1000),
    matches,
    stats: {
      totalMatches: matches.length,
      wins,
      losses,
      winRate,
      avgKDA,
      avgGpm,
      longestLosingStreak,
      performanceTrend,
    },
  }
}

/**
 * Analyze current tilt status and patterns
 */
export async function getTiltAnalysis(userId: string): Promise<TiltAnalysis> {
  try {
    // Get recent matches (last 20)
    const result = await getPool().query(`
      SELECT
        match_id, won, kills, deaths, assists, gold_per_min, start_time
      FROM analyzed_matches
      WHERE user_id = $1
      ORDER BY analyzed_at DESC
      LIMIT 20
    `, [userId])

    if (result.rows.length === 0) {
      return {
        currentTiltRisk: 'low',
        recentLosingStreak: 0,
        lastMatchWon: null,
        activeWarnings: [],
        patterns: {
          performanceAfterLoss: 50,
          lateNightWinRate: 50,
          longSessionWinRate: 50,
        },
      }
    }

    const matches = result.rows
    const lastMatchWon = matches[0]?.won ?? null

    // Count current losing streak (from most recent)
    let recentLosingStreak = 0
    for (const match of matches) {
      if (!match.won) {
        recentLosingStreak++
      } else {
        break
      }
    }

    // Calculate patterns
    const performanceAfterLoss = await calculatePerformanceAfterLoss(userId)
    const lateNightWinRate = await calculateLateNightWinRate(userId)
    const longSessionWinRate = await calculateLongSessionWinRate(userId)

    // Determine warnings
    const activeWarnings: TiltAnalysis['activeWarnings'] = []

    if (recentLosingStreak >= 3) {
      activeWarnings.push({
        type: 'losing_streak',
        message: `You're on a ${recentLosingStreak} game losing streak. Consider taking a break!`,
        severity: recentLosingStreak >= 5 ? 'danger' : 'warning',
      })
    }

    if (lateNightWinRate < 40) {
      activeWarnings.push({
        type: 'late_night',
        message: `Your late night win rate is only ${lateNightWinRate.toFixed(0)}%. You play better earlier!`,
        severity: 'warning',
      })
    }

    if (longSessionWinRate < 40) {
      activeWarnings.push({
        type: 'long_session',
        message: `Your win rate drops to ${longSessionWinRate.toFixed(0)}% after 3+ games. Take breaks!`,
        severity: 'warning',
      })
    }

    // Determine overall tilt risk
    let currentTiltRisk: 'low' | 'medium' | 'high' = 'low'
    if (recentLosingStreak >= 5 || activeWarnings.some(w => w.severity === 'danger')) {
      currentTiltRisk = 'high'
    } else if (recentLosingStreak >= 3 || activeWarnings.length >= 2) {
      currentTiltRisk = 'medium'
    }

    return {
      currentTiltRisk,
      recentLosingStreak,
      lastMatchWon,
      activeWarnings,
      patterns: {
        performanceAfterLoss,
        lateNightWinRate,
        longSessionWinRate,
      },
    }
  } catch (error) {
    console.error('Error getting tilt analysis:', error)
    return {
      currentTiltRisk: 'low',
      recentLosingStreak: 0,
      lastMatchWon: null,
      activeWarnings: [],
      patterns: {
        performanceAfterLoss: 50,
        lateNightWinRate: 50,
        longSessionWinRate: 50,
      },
    }
  }
}

async function calculatePerformanceAfterLoss(userId: string): Promise<number> {
  try {
    // Get matches ordered by time
    const result = await getPool().query(`
      SELECT won FROM analyzed_matches
      WHERE user_id = $1
      ORDER BY analyzed_at ASC
    `, [userId])

    if (result.rows.length < 2) return 50

    let afterLossWins = 0
    let afterLossGames = 0

    for (let i = 1; i < result.rows.length; i++) {
      if (!result.rows[i - 1].won) {
        afterLossGames++
        if (result.rows[i].won) {
          afterLossWins++
        }
      }
    }

    return afterLossGames > 0 ? (afterLossWins / afterLossGames) * 100 : 50
  } catch {
    return 50
  }
}

async function calculateLateNightWinRate(userId: string): Promise<number> {
  try {
    // Late night = midnight to 4am (0-4 hours)
    const result = await getPool().query(`
      SELECT won FROM analyzed_matches
      WHERE user_id = $1
        AND start_time IS NOT NULL
        AND EXTRACT(HOUR FROM TO_TIMESTAMP(start_time)) >= 0
        AND EXTRACT(HOUR FROM TO_TIMESTAMP(start_time)) < 4
    `, [userId])

    if (result.rows.length < 3) return 50 // Not enough data

    const wins = result.rows.filter(r => r.won).length
    return (wins / result.rows.length) * 100
  } catch {
    return 50
  }
}

async function calculateLongSessionWinRate(userId: string): Promise<number> {
  try {
    const sessions = await getPlaySessions(userId, 60)

    let longSessionWins = 0
    let longSessionGames = 0

    for (const session of sessions) {
      // Games 4+ in a session
      for (let i = 3; i < session.matches.length; i++) {
        longSessionGames++
        if (session.matches[i].won) {
          longSessionWins++
        }
      }
    }

    return longSessionGames > 0 ? (longSessionWins / longSessionGames) * 100 : 50
  } catch {
    return 50
  }
}

/**
 * Get win rate by time of day
 */
export async function getTimeOfDayStats(userId: string): Promise<TimeOfDayStats> {
  const defaultStats = {
    morning: { games: 0, wins: 0, winRate: 0 },
    afternoon: { games: 0, wins: 0, winRate: 0 },
    evening: { games: 0, wins: 0, winRate: 0 },
    night: { games: 0, wins: 0, winRate: 0 },
    bestTimeToPlay: 'Not enough data',
  }

  try {
    const result = await getPool().query(`
      SELECT
        EXTRACT(HOUR FROM TO_TIMESTAMP(start_time)) as hour,
        won
      FROM analyzed_matches
      WHERE user_id = $1 AND start_time IS NOT NULL
    `, [userId])

    if (result.rows.length < 5) {
      return defaultStats
    }

    const stats = {
      morning: { games: 0, wins: 0 },   // 6am - 12pm
      afternoon: { games: 0, wins: 0 }, // 12pm - 6pm
      evening: { games: 0, wins: 0 },   // 6pm - 12am
      night: { games: 0, wins: 0 },     // 12am - 6am
    }

    for (const row of result.rows) {
      const hour = parseInt(row.hour)
      let period: keyof typeof stats

      if (hour >= 6 && hour < 12) {
        period = 'morning'
      } else if (hour >= 12 && hour < 18) {
        period = 'afternoon'
      } else if (hour >= 18 && hour < 24) {
        period = 'evening'
      } else {
        period = 'night'
      }

      stats[period].games++
      if (row.won) {
        stats[period].wins++
      }
    }

    const calculateWinRate = (s: { games: number; wins: number }) =>
      s.games > 0 ? (s.wins / s.games) * 100 : 0

    const timeOfDayStats = {
      morning: { ...stats.morning, winRate: calculateWinRate(stats.morning) },
      afternoon: { ...stats.afternoon, winRate: calculateWinRate(stats.afternoon) },
      evening: { ...stats.evening, winRate: calculateWinRate(stats.evening) },
      night: { ...stats.night, winRate: calculateWinRate(stats.night) },
      bestTimeToPlay: '',
    }

    // Find best time with at least 3 games
    let bestTime = 'morning'
    let bestWinRate = -1
    for (const [time, data] of Object.entries(timeOfDayStats)) {
      if (time !== 'bestTimeToPlay' && typeof data === 'object' && 'games' in data) {
        if (data.games >= 3 && data.winRate > bestWinRate) {
          bestWinRate = data.winRate
          bestTime = time
        }
      }
    }

    timeOfDayStats.bestTimeToPlay = bestTime.charAt(0).toUpperCase() + bestTime.slice(1)

    return timeOfDayStats
  } catch (error) {
    console.error('Error getting time of day stats:', error)
    return defaultStats
  }
}

/**
 * Get win rate by day of week
 */
export async function getDayOfWeekStats(userId: string): Promise<DayOfWeekStats> {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const defaultStats: DayOfWeekStats = {
    days: dayNames.map(day => ({ day, games: 0, wins: 0, winRate: 0 })),
    bestDay: 'Not enough data',
    worstDay: 'Not enough data',
  }

  try {
    const result = await getPool().query(`
      SELECT
        EXTRACT(DOW FROM TO_TIMESTAMP(start_time)) as day_of_week,
        won
      FROM analyzed_matches
      WHERE user_id = $1 AND start_time IS NOT NULL
    `, [userId])

    if (result.rows.length < 7) {
      return defaultStats
    }

    const dayStats: { [key: number]: { games: number; wins: number } } = {}
    for (let i = 0; i < 7; i++) {
      dayStats[i] = { games: 0, wins: 0 }
    }

    for (const row of result.rows) {
      const dow = parseInt(row.day_of_week)
      dayStats[dow].games++
      if (row.won) {
        dayStats[dow].wins++
      }
    }

    const days = dayNames.map((day, idx) => ({
      day,
      games: dayStats[idx].games,
      wins: dayStats[idx].wins,
      winRate: dayStats[idx].games > 0 ? (dayStats[idx].wins / dayStats[idx].games) * 100 : 0,
    }))

    // Find best and worst days (min 3 games)
    const qualifiedDays = days.filter(d => d.games >= 3)
    let bestDay = 'Not enough data'
    let worstDay = 'Not enough data'

    if (qualifiedDays.length > 0) {
      const sorted = [...qualifiedDays].sort((a, b) => b.winRate - a.winRate)
      bestDay = sorted[0].day
      worstDay = sorted[sorted.length - 1].day
    }

    return { days, bestDay, worstDay }
  } catch (error) {
    console.error('Error getting day of week stats:', error)
    return defaultStats
  }
}
