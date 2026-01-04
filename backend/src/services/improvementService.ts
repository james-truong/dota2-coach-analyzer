// Service for tracking player improvement over time
// Calculates trends, habits, and progress metrics

import pool from '../db/index.js'

export interface RoleStats {
  role: 'core' | 'support'
  totalMatches: number
  wins: number
  winRate: number
  avgKDA: number
  avgGPM: number
}

export interface ImprovementMetrics {
  currentPeriod: PeriodStats
  previousPeriod: PeriodStats | null
  improvement: {
    winRate: number // percentage change
    avgKDA: number // percentage change
    avgGPM: number // percentage change
    mistakeReduction: number // percentage reduction
  }
  habits: PlayerHabit[]
  recentTrend: 'improving' | 'declining' | 'stable'
  roleStats: RoleStats[] // NEW: Role-specific breakdown
  aiCoachingSummary?: string // NEW: AI-generated coaching advice
}

export interface PeriodStats {
  periodStart: string
  periodEnd: string
  totalMatches: number
  wins: number
  losses: number
  winRate: number
  avgKills: number
  avgDeaths: number
  avgAssists: number
  avgKDA: number
  avgLastHits: number
  avgGPM: number
  avgXPM: number
  totalCriticalMistakes: number
  totalHighMistakes: number
  totalMediumMistakes: number
  topMistakeCategories: Array<{ category: string; count: number }>
}

export interface PlayerHabit {
  id: string
  habitType: string
  category: string
  occurrences: number
  firstDetectedAt: string
  lastDetectedAt: string
  status: 'active' | 'improving' | 'resolved'
  improvementPercentage: number
  description: string
}

/**
 * Get improvement metrics for a user
 */
export async function getImprovementMetrics(
  userId: string,
  daysBack: number = 30
): Promise<ImprovementMetrics> {
  const currentPeriod = await calculatePeriodStats(userId, daysBack)
  const previousPeriod = await calculatePeriodStats(userId, daysBack * 2, daysBack)
  const habits = await getPlayerHabits(userId)
  const roleStats = await calculateRoleStats(userId, daysBack)

  // Calculate improvement percentages
  // Only calculate % change if we have valid previous period data
  const improvement = {
    winRate: previousPeriod && previousPeriod.totalMatches > 0
      ? currentPeriod.winRate - previousPeriod.winRate // Absolute difference in percentage points
      : 0,
    avgKDA: previousPeriod && previousPeriod.totalMatches > 0 && previousPeriod.avgKDA > 0
      ? ((currentPeriod.avgKDA - previousPeriod.avgKDA) / previousPeriod.avgKDA) * 100
      : 0,
    avgGPM: previousPeriod && previousPeriod.totalMatches > 0 && previousPeriod.avgGPM > 0
      ? ((currentPeriod.avgGPM - previousPeriod.avgGPM) / previousPeriod.avgGPM) * 100
      : 0,
    mistakeReduction: previousPeriod && previousPeriod.totalMatches > 0
      ? ((previousPeriod.totalHighMistakes + previousPeriod.totalCriticalMistakes -
          (currentPeriod.totalHighMistakes + currentPeriod.totalCriticalMistakes)) /
          ((previousPeriod.totalHighMistakes + previousPeriod.totalCriticalMistakes) || 1)) *
        100
      : 0,
  }

  // Determine overall trend
  let recentTrend: 'improving' | 'declining' | 'stable' = 'stable'
  if (previousPeriod && previousPeriod.totalMatches > 0) {
    const positiveSignals = [
      improvement.winRate > 5,
      improvement.avgKDA > 5,
      improvement.avgGPM > 5,
      improvement.mistakeReduction > 10,
    ].filter(Boolean).length

    const negativeSignals = [
      improvement.winRate < -5,
      improvement.avgKDA < -5,
      improvement.avgGPM < -5,
      improvement.mistakeReduction < -10,
    ].filter(Boolean).length

    if (positiveSignals >= 2) recentTrend = 'improving'
    else if (negativeSignals >= 2) recentTrend = 'declining'
  }

  // Generate AI coaching summary
  const aiCoachingSummary = await generateAICoachingSummary(
    currentPeriod,
    previousPeriod,
    roleStats,
    improvement,
    recentTrend
  )

  return {
    currentPeriod,
    previousPeriod,
    improvement,
    habits,
    recentTrend,
    roleStats,
    aiCoachingSummary,
  }
}

/**
 * Calculate stats for a specific time period
 */
async function calculatePeriodStats(
  userId: string,
  daysBack: number,
  skipDays: number = 0
): Promise<PeriodStats> {
  const periodEnd = new Date()
  periodEnd.setDate(periodEnd.getDate() - skipDays)

  const periodStart = new Date(periodEnd)
  periodStart.setDate(periodStart.getDate() - daysBack)

  // Get all matches in this period from analyzed_matches table (including ai_insights)
  const matchesQuery = await pool.query(
    `
    SELECT
      id,
      match_id,
      radiant_win,
      team,
      kills,
      deaths,
      assists,
      last_hits,
      gold_per_min,
      xp_per_min,
      won,
      ai_insights
    FROM analyzed_matches
    WHERE user_id = $1
      AND analyzed_at BETWEEN $2 AND $3
    ORDER BY analyzed_at DESC
    `,
    [userId, periodStart, periodEnd]
  )

  const matches = matchesQuery.rows

  if (matches.length === 0) {
    return {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalMatches: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      avgKills: 0,
      avgDeaths: 0,
      avgAssists: 0,
      avgKDA: 0,
      avgLastHits: 0,
      avgGPM: 0,
      avgXPM: 0,
      totalCriticalMistakes: 0,
      totalHighMistakes: 0,
      totalMediumMistakes: 0,
      topMistakeCategories: [],
    }
  }

  // Calculate aggregates
  const wins = matches.filter((m: any) => m.won === true).length

  const totalKills = matches.reduce((sum: number, m: any) => sum + (m.kills || 0), 0)
  const totalDeaths = matches.reduce((sum: number, m: any) => sum + (m.deaths || 0), 0)
  const totalAssists = matches.reduce((sum: number, m: any) => sum + (m.assists || 0), 0)
  const totalLastHits = matches.reduce((sum: number, m: any) => sum + (m.last_hits || 0), 0)
  const totalGPM = matches.reduce((sum: number, m: any) => sum + (m.gold_per_min || 0), 0)
  const totalXPM = matches.reduce((sum: number, m: any) => sum + (m.xp_per_min || 0), 0)

  const avgKills = totalKills / matches.length
  const avgDeaths = totalDeaths / matches.length || 1
  const avgAssists = totalAssists / matches.length

  // Extract mistake counts from ai_insights JSONB
  let totalCriticalMistakes = 0
  let totalHighMistakes = 0
  let totalMediumMistakes = 0
  const categoryMap: Record<string, number> = {}

  matches.forEach((match: any) => {
    if (!match.ai_insights || !Array.isArray(match.ai_insights)) return

    match.ai_insights.forEach((insight: any) => {
      // Only count mistakes, not good plays
      if (insight.insightType !== 'mistake') return

      const severity = insight.severity
      const category = insight.category

      if (severity === 'critical') totalCriticalMistakes++
      else if (severity === 'high') totalHighMistakes++
      else if (severity === 'medium') totalMediumMistakes++

      if (category) {
        categoryMap[category] = (categoryMap[category] || 0) + 1
      }
    })
  })

  const topMistakeCategories = Object.entries(categoryMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    totalMatches: matches.length,
    wins,
    losses: matches.length - wins,
    winRate: (wins / matches.length) * 100,
    avgKills,
    avgDeaths,
    avgAssists,
    avgKDA: (avgKills + avgAssists) / avgDeaths,
    avgLastHits: totalLastHits / matches.length,
    avgGPM: totalGPM / matches.length,
    avgXPM: totalXPM / matches.length,
    totalCriticalMistakes,
    totalHighMistakes,
    totalMediumMistakes,
    topMistakeCategories,
  }
}

/**
 * Get player habits (recurring mistakes)
 */
async function getPlayerHabits(userId: string): Promise<PlayerHabit[]> {
  const result = await pool.query(
    `
    SELECT
      id,
      habit_type,
      category,
      occurrences,
      first_detected_at,
      last_detected_at,
      status,
      improvement_percentage,
      description
    FROM player_habits
    WHERE user_id = $1
    ORDER BY
      CASE status
        WHEN 'active' THEN 1
        WHEN 'improving' THEN 2
        WHEN 'resolved' THEN 3
      END,
      occurrences DESC
    LIMIT 10
    `,
    [userId]
  )

  return result.rows.map((row: any) => ({
    id: row.id,
    habitType: row.habit_type,
    category: row.category,
    occurrences: row.occurrences,
    firstDetectedAt: row.first_detected_at,
    lastDetectedAt: row.last_detected_at,
    status: row.status,
    improvementPercentage: row.improvement_percentage || 0,
    description: row.description,
  }))
}

/**
 * Update or create player habits based on recent match insights
 */
export async function updatePlayerHabits(userId: string, matchId: string): Promise<void> {
  // Get insights from the match
  const insightsQuery = await pool.query(
    `
    SELECT
      category,
      insight_type,
      severity,
      description
    FROM match_insights mi
    JOIN player_performances pp ON pp.id = mi.player_performance_id
    WHERE pp.user_id = $1
      AND mi.match_id = (SELECT id FROM matches WHERE match_id = $2::BIGINT)
      AND severity IN ('high', 'critical')
    `,
    [userId, matchId]
  )

  // Group by category
  const categoryGroups: Record<string, any[]> = {}
  insightsQuery.rows.forEach((row: any) => {
    if (!categoryGroups[row.category]) {
      categoryGroups[row.category] = []
    }
    categoryGroups[row.category].push(row)
  })

  // Update or create habits for each category
  for (const [category, insights] of Object.entries(categoryGroups)) {
    if (insights.length === 0) continue

    const habitType = `recurring_${category}_issues`
    const description = `Repeated ${category} mistakes detected in recent matches`

    // Check if habit exists
    const existingHabit = await pool.query(
      `SELECT id, occurrences FROM player_habits WHERE user_id = $1 AND habit_type = $2`,
      [userId, habitType]
    )

    if (existingHabit.rows.length > 0) {
      // Update existing habit
      await pool.query(
        `
        UPDATE player_habits
        SET
          occurrences = occurrences + $1,
          last_detected_at = CURRENT_TIMESTAMP,
          status = CASE
            WHEN improvement_percentage > 50 THEN 'improving'
            WHEN improvement_percentage > 80 THEN 'resolved'
            ELSE 'active'
          END
        WHERE id = $2
        `,
        [insights.length, existingHabit.rows[0].id]
      )
    } else {
      // Create new habit
      await pool.query(
        `
        INSERT INTO player_habits (user_id, habit_type, category, occurrences, description)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [userId, habitType, category, insights.length, description]
      )
    }
  }
}

/**
 * Get weekly focus area recommendation
 */
export async function getWeeklyFocusArea(userId: string): Promise<{
  category: string
  description: string
  goal: string
  currentStatus: string
}> {
  const metrics = await getImprovementMetrics(userId, 7)

  // Find the most common mistake category from recent matches
  const topCategory = metrics.currentPeriod.topMistakeCategories[0]

  if (!topCategory) {
    return {
      category: 'general',
      description: 'Keep playing more matches to identify areas for improvement',
      goal: 'Complete 5 matches this week',
      currentStatus: `${metrics.currentPeriod.totalMatches} matches played in the last 7 days`,
    }
  }

  const focusAreas: Record<
    string,
    { description: string; goal: string }
  > = {
    positioning: {
      description: 'Work on map awareness and safer positioning in teamfights',
      goal: 'Reduce positioning-related deaths by 30%',
    },
    itemization: {
      description: 'Focus on building optimal items for each situation',
      goal: 'Achieve 8+ item build score in next 3 matches',
    },
    farm_efficiency: {
      description: 'Improve last hitting and farming patterns',
      goal: 'Increase average GPM by 50',
    },
    vision: {
      description: 'Place more wards and improve map vision control',
      goal: 'Place 15+ observer wards per match',
    },
    teamfight: {
      description: 'Better teamfight positioning and ability usage',
      goal: 'Improve KDA ratio by 20%',
    },
    decision_making: {
      description: 'Make smarter decisions about when to fight or farm',
      goal: 'Reduce critical mistakes by 50%',
    },
  }

  const focus = focusAreas[topCategory.category] || focusAreas.general

  return {
    category: topCategory.category,
    description: focus.description,
    goal: focus.goal,
    currentStatus: `${topCategory.count} ${topCategory.category} mistakes in last 7 days`,
  }
}

/**
 * Calculate role-specific stats (Core vs Support)
 */
async function calculateRoleStats(userId: string, daysBack: number): Promise<RoleStats[]> {
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd)
  periodStart.setDate(periodStart.getDate() - daysBack)

  const result = await pool.query(
    `
    SELECT
      detected_role,
      COUNT(*) as total_matches,
      SUM(CASE WHEN won = true THEN 1 ELSE 0 END) as wins,
      AVG(kills) as avg_kills,
      AVG(deaths) as avg_deaths,
      AVG(assists) as avg_assists,
      AVG(gold_per_min) as avg_gpm
    FROM analyzed_matches
    WHERE user_id = $1
      AND analyzed_at BETWEEN $2 AND $3
      AND detected_role IS NOT NULL
    GROUP BY detected_role
    `,
    [userId, periodStart, periodEnd]
  )

  const roleStats: RoleStats[] = []

  // Aggregate core roles (carry, mid, offlane)
  const coreRoles = ['carry', 'mid', 'midlane', 'offlane', 'core', 'position 1', 'position 2', 'position 3']
  const supportRoles = ['support', 'hard support', 'soft support', 'position 4', 'position 5', 'roamer']

  let coreMatches = 0, coreWins = 0, coreKills = 0, coreDeaths = 0, coreAssists = 0, coreGPM = 0
  let supportMatches = 0, supportWins = 0, supportKills = 0, supportDeaths = 0, supportAssists = 0, supportGPM = 0

  result.rows.forEach((row: any) => {
    const role = (row.detected_role || '').toLowerCase()
    const matches = parseInt(row.total_matches)
    const wins = parseInt(row.wins)
    const avgKills = parseFloat(row.avg_kills) || 0
    const avgDeaths = parseFloat(row.avg_deaths) || 1
    const avgAssists = parseFloat(row.avg_assists) || 0
    const avgGPM = parseFloat(row.avg_gpm) || 0

    if (coreRoles.some(r => role.includes(r))) {
      coreMatches += matches
      coreWins += wins
      coreKills += avgKills * matches
      coreDeaths += avgDeaths * matches
      coreAssists += avgAssists * matches
      coreGPM += avgGPM * matches
    } else if (supportRoles.some(r => role.includes(r))) {
      supportMatches += matches
      supportWins += wins
      supportKills += avgKills * matches
      supportDeaths += avgDeaths * matches
      supportAssists += avgAssists * matches
      supportGPM += avgGPM * matches
    }
  })

  if (coreMatches > 0) {
    const avgDeaths = coreDeaths / coreMatches || 1
    roleStats.push({
      role: 'core',
      totalMatches: coreMatches,
      wins: coreWins,
      winRate: (coreWins / coreMatches) * 100,
      avgKDA: ((coreKills / coreMatches) + (coreAssists / coreMatches)) / avgDeaths,
      avgGPM: coreGPM / coreMatches,
    })
  }

  if (supportMatches > 0) {
    const avgDeaths = supportDeaths / supportMatches || 1
    roleStats.push({
      role: 'support',
      totalMatches: supportMatches,
      wins: supportWins,
      winRate: (supportWins / supportMatches) * 100,
      avgKDA: ((supportKills / supportMatches) + (supportAssists / supportMatches)) / avgDeaths,
      avgGPM: supportGPM / supportMatches,
    })
  }

  return roleStats
}

/**
 * Generate AI-powered coaching summary using Claude
 */
async function generateAICoachingSummary(
  currentPeriod: PeriodStats,
  previousPeriod: PeriodStats | null,
  roleStats: RoleStats[],
  improvement: { winRate: number; avgKDA: number; avgGPM: number; mistakeReduction: number },
  trend: 'improving' | 'declining' | 'stable'
): Promise<string | undefined> {
  // Don't generate if not enough data
  if (currentPeriod.totalMatches < 3) {
    return undefined
  }

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return undefined
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey })

    // Build context about the player
    const coreStats = roleStats.find(r => r.role === 'core')
    const supportStats = roleStats.find(r => r.role === 'support')

    const prompt = `You are a Dota 2 coach analyzing a player's recent performance. Generate a brief, personalized coaching summary (2-3 sentences max) that:
1. Acknowledges their current trend
2. Highlights one specific strength or concern
3. Gives one actionable tip for improvement

Player Stats (Last ${currentPeriod.totalMatches} matches):
- Win Rate: ${currentPeriod.winRate.toFixed(1)}% (${improvement.winRate > 0 ? '+' : ''}${improvement.winRate.toFixed(1)}% change)
- KDA: ${currentPeriod.avgKDA.toFixed(2)} (${improvement.avgKDA > 0 ? '+' : ''}${improvement.avgKDA.toFixed(1)}% change)
- GPM: ${Math.round(currentPeriod.avgGPM)} (${improvement.avgGPM > 0 ? '+' : ''}${improvement.avgGPM.toFixed(1)}% change)
- Avg Deaths: ${currentPeriod.avgDeaths.toFixed(1)}
- Overall Trend: ${trend}
${coreStats ? `- Core Games: ${coreStats.totalMatches} matches, ${coreStats.winRate.toFixed(0)}% win rate` : ''}
${supportStats ? `- Support Games: ${supportStats.totalMatches} matches, ${supportStats.winRate.toFixed(0)}% win rate` : ''}
- Top Mistake Categories: ${currentPeriod.topMistakeCategories.map(c => c.category.replace('_', ' ')).join(', ') || 'None identified'}
- Critical+High Mistakes: ${currentPeriod.totalCriticalMistakes + currentPeriod.totalHighMistakes}

Be encouraging but honest. Focus on actionable advice. Do NOT use generic advice - reference their actual stats.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = response.content.find((block: any) => block.type === 'text')
    return textBlock ? (textBlock as any).text : undefined
  } catch (error) {
    console.error('Error generating AI coaching summary:', error)
    return undefined
  }
}
