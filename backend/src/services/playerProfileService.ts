// Player profile and statistics service
import pg from 'pg'
import { backfillUserMatches } from './matchHistoryService.js'
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

export interface PlayerProfile {
  user: {
    id: string
    displayName: string
    avatar: string
    accountId: number
  }
  statistics: {
    totalMatches: number
    totalWins: number
    totalLosses: number
    winRate: number

    // Overall averages
    avgKills: number
    avgDeaths: number
    avgAssists: number
    avgGpm: number
    avgXpm: number
    avgLastHits: number
    avgHeroDamage: number

    // Recent performance (last 20 games)
    recentWinRate: number
    recentAvgGpm: number
    recentAvgKills: number
    recentAvgDeaths: number

    // Best performances
    bestGpm: number
    bestKills: number
    bestHeroDamage: number

    // Role distribution
    coreGames: number
    supportGames: number
  }
  recentMatches: any[]
  topHeroes: Array<{
    heroName: string
    heroImage: string
    gamesPlayed: number
    wins: number
    winRate: number
    avgKills: number
    avgDeaths: number
    avgAssists: number
    avgGpm: number
  }>
}

/**
 * Get comprehensive player profile with stats and match history
 * Automatically backfills from OpenDota if no matches exist
 */
export async function getPlayerProfile(userId: string, autoBackfill: boolean = true): Promise<PlayerProfile | null> {
  try {
    // Get user info
    const userResult = await getPool().query(
      'SELECT id, display_name, avatar, account_id FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return null
    }

    const user = userResult.rows[0]

    // Get all matches for this user
    const matchesResult = await getPool().query(
      `SELECT * FROM analyzed_matches
       WHERE user_id = $1
       ORDER BY analyzed_at DESC`,
      [userId]
    )

    let matches = matchesResult.rows

    // If no matches and autoBackfill is enabled, fetch from OpenDota
    if (matches.length === 0 && autoBackfill && user.account_id) {
      console.log(`No matches found for user ${userId}, triggering backfill from OpenDota...`)

      // Backfill in background (don't wait for it to complete)
      backfillUserMatches(user.id, user.account_id, 20)
        .then(result => {
          console.log(`Backfill completed: ${result.matchesBackfilled} matches added`)
        })
        .catch(err => {
          console.error('Backfill failed:', err)
        })

      // For now, return empty profile - user can refresh to see backfilled data
      // (Alternatively, we could wait for backfill to complete, but that would be slow)
    }

    if (matches.length === 0) {
      // No matches yet, return empty profile
      return {
        user: {
          id: user.id,
          displayName: user.display_name,
          avatar: user.avatar,
          accountId: user.account_id,
        },
        statistics: {
          totalMatches: 0,
          totalWins: 0,
          totalLosses: 0,
          winRate: 0,
          avgKills: 0,
          avgDeaths: 0,
          avgAssists: 0,
          avgGpm: 0,
          avgXpm: 0,
          avgLastHits: 0,
          avgHeroDamage: 0,
          recentWinRate: 0,
          recentAvgGpm: 0,
          recentAvgKills: 0,
          recentAvgDeaths: 0,
          bestGpm: 0,
          bestKills: 0,
          bestHeroDamage: 0,
          coreGames: 0,
          supportGames: 0,
        },
        recentMatches: [],
        topHeroes: [],
      }
    }

    // Calculate statistics
    const totalMatches = matches.length
    const totalWins = matches.filter(m => m.won).length
    const totalLosses = totalMatches - totalWins
    const winRate = (totalWins / totalMatches) * 100

    // Overall averages
    const avgKills = matches.reduce((sum, m) => sum + m.kills, 0) / totalMatches
    const avgDeaths = matches.reduce((sum, m) => sum + m.deaths, 0) / totalMatches
    const avgAssists = matches.reduce((sum, m) => sum + m.assists, 0) / totalMatches
    const avgGpm = matches.reduce((sum, m) => sum + m.gold_per_min, 0) / totalMatches
    const avgXpm = matches.reduce((sum, m) => sum + m.xp_per_min, 0) / totalMatches
    const avgLastHits = matches.reduce((sum, m) => sum + m.last_hits, 0) / totalMatches
    const avgHeroDamage = matches.reduce((sum, m) => sum + m.hero_damage, 0) / totalMatches

    // Recent performance (last 20 games)
    const recentMatches = matches.slice(0, 20)
    const recentWins = recentMatches.filter(m => m.won).length
    const recentWinRate = recentMatches.length > 0 ? (recentWins / recentMatches.length) * 100 : 0
    const recentAvgGpm = recentMatches.length > 0
      ? recentMatches.reduce((sum, m) => sum + m.gold_per_min, 0) / recentMatches.length
      : 0
    const recentAvgKills = recentMatches.length > 0
      ? recentMatches.reduce((sum, m) => sum + m.kills, 0) / recentMatches.length
      : 0
    const recentAvgDeaths = recentMatches.length > 0
      ? recentMatches.reduce((sum, m) => sum + m.deaths, 0) / recentMatches.length
      : 0

    // Best performances
    const bestGpm = Math.max(...matches.map(m => m.gold_per_min))
    const bestKills = Math.max(...matches.map(m => m.kills))
    const bestHeroDamage = Math.max(...matches.map(m => m.hero_damage))

    // Role distribution
    const coreGames = matches.filter(m => m.detected_role === 'Core').length
    const supportGames = matches.filter(m => m.detected_role === 'Support').length

    // Top heroes (by games played)
    const heroStats = new Map<string, any>()
    matches.forEach(match => {
      const heroName = match.hero_name
      if (!heroStats.has(heroName)) {
        heroStats.set(heroName, {
          heroName,
          heroImage: match.hero_image,
          games: [],
        })
      }
      heroStats.get(heroName).games.push(match)
    })

    const topHeroes = Array.from(heroStats.values())
      .map(hero => {
        const gamesPlayed = hero.games.length
        const wins = hero.games.filter((m: any) => m.won).length
        return {
          heroName: hero.heroName,
          heroImage: hero.heroImage,
          gamesPlayed,
          wins,
          winRate: (wins / gamesPlayed) * 100,
          avgKills: hero.games.reduce((sum: number, m: any) => sum + m.kills, 0) / gamesPlayed,
          avgDeaths: hero.games.reduce((sum: number, m: any) => sum + m.deaths, 0) / gamesPlayed,
          avgAssists: hero.games.reduce((sum: number, m: any) => sum + m.assists, 0) / gamesPlayed,
          avgGpm: hero.games.reduce((sum: number, m: any) => sum + m.gold_per_min, 0) / gamesPlayed,
        }
      })
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
      .slice(0, 5)

    return {
      user: {
        id: user.id,
        displayName: user.display_name,
        avatar: user.avatar,
        accountId: user.account_id,
      },
      statistics: {
        totalMatches,
        totalWins,
        totalLosses,
        winRate,
        avgKills: parseFloat(avgKills.toFixed(2)),
        avgDeaths: parseFloat(avgDeaths.toFixed(2)),
        avgAssists: parseFloat(avgAssists.toFixed(2)),
        avgGpm: Math.round(avgGpm),
        avgXpm: Math.round(avgXpm),
        avgLastHits: Math.round(avgLastHits),
        avgHeroDamage: Math.round(avgHeroDamage),
        recentWinRate: parseFloat(recentWinRate.toFixed(1)),
        recentAvgGpm: Math.round(recentAvgGpm),
        recentAvgKills: parseFloat(recentAvgKills.toFixed(2)),
        recentAvgDeaths: parseFloat(recentAvgDeaths.toFixed(2)),
        bestGpm,
        bestKills,
        bestHeroDamage,
        coreGames,
        supportGames,
      },
      recentMatches: recentMatches.slice(0, 10).map(m => ({
        matchId: m.match_id,
        heroName: m.hero_name,
        heroImage: m.hero_image,
        kills: m.kills,
        deaths: m.deaths,
        assists: m.assists,
        gpm: m.gold_per_min,
        won: m.won,
        detectedRole: m.detected_role,
        duration: m.duration,
        analyzedAt: m.analyzed_at,
      })),
      topHeroes,
    }
  } catch (error) {
    console.error('Error fetching player profile:', error)
    throw error
  }
}

/**
 * Get match history for a user
 */
export async function getUserMatchHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<any[]> {
  try {
    const result = await getPool().query(
      `SELECT * FROM analyzed_matches
       WHERE user_id = $1
       ORDER BY analyzed_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )

    return result.rows.map(m => ({
      matchId: m.match_id,
      heroName: m.hero_name,
      heroImage: m.hero_image,
      heroId: m.hero_id,
      kills: m.kills,
      deaths: m.deaths,
      assists: m.assists,
      gpm: m.gold_per_min,
      xpm: m.xp_per_min,
      lastHits: m.last_hits,
      heroDamage: m.hero_damage,
      won: m.won,
      detectedRole: m.detected_role,
      team: m.team,
      duration: m.duration,
      gameMode: m.game_mode,
      analyzedAt: m.analyzed_at,
    }))
  } catch (error) {
    console.error('Error fetching user match history:', error)
    return []
  }
}
