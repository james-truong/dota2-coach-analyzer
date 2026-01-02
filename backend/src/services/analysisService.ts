// Simple mistake detection logic based on stats
// This will evolve into more sophisticated analysis over time

import { getHeroStatistics, type HeroStats } from './heroStatisticsService.js'

interface PlayerStats {
  heroId: number
  playerSlot: number
  kills: number
  deaths: number
  assists: number
  lastHits: number
  denies: number
  goldPerMin: number
  xpPerMin: number
  level: number
  heroDamage: number
  towerDamage: number
  netWorth: number
  obsPlaced?: number
  senPlaced?: number
  campsStacked?: number
  laneRole?: number | null  // 1=Safe, 2=Mid, 3=Off, 4=Jungle
}

interface Insight {
  insightType: 'mistake' | 'missed_opportunity' | 'good_play'
  category: 'positioning' | 'itemization' | 'farm_efficiency' | 'vision' | 'teamfight' | 'decision_making'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  recommendation: string
  gameTime?: number  // Timestamp in seconds for timeline insights
}

interface KillLogEntry {
  time: number
  key: string
}

interface TeamfightData {
  start: number
  end: number
  deaths: number
  players: Array<{
    deaths: number
    damage: number
    healing: number
    gold_delta: number
    xp_delta: number
  }>
}

interface TimelineData {
  killsLog?: KillLogEntry[]
  goldTimeline?: number[]  // gold_t array
  xpTimeline?: number[]    // xp_t array
  lhTimeline?: number[]    // lh_t array (cumulative last hits)
  teamfights?: TeamfightData[]
}

export interface AnalysisResult {
  insights: Insight[]
  detectedRole: 'Core' | 'Support'
}

export async function analyzePlayerPerformance(
  stats: PlayerStats,
  duration: number,
  isRadiant: boolean,
  heroName: string
): Promise<AnalysisResult> {
  const insights: Insight[] = []
  const durationMinutes = duration / 60

  // Try to get hero-specific benchmarks
  const heroStats = await getHeroStatistics(heroName)

  // Smart role detection based on actual gameplay stats
  // This is much more accurate than slot-based detection
  // A player is considered a core if they:
  // - Have high GPM (> 350), OR
  // - Have decent farm (> 3 CS/min)
  const csPerMin = stats.lastHits / durationMinutes
  const isCore = stats.goldPerMin > 350 || csPerMin > 3
  const isSupport = !isCore
  const detectedRole: 'Core' | 'Support' = isCore ? 'Core' : 'Support'

  // 1. Farm Efficiency Check (for cores)
  if (isCore) {
    // Use hero-specific benchmarks if available, otherwise fall back to generic thresholds
    const avgCsPerMin = heroStats?.avgCsPerMin || 7
    const avgGpm = heroStats?.avgGpm || 500
    const expectedCsPerMin = avgCsPerMin * 0.85 // 85% of hero average is the minimum acceptable

    if (csPerMin < expectedCsPerMin) {
      const comparisonText = heroStats
        ? `For ${heroName}, the average is ${avgCsPerMin.toFixed(1)} CS/min based on ${heroStats.totalMatches} analyzed matches`
        : 'For a core player, aim for at least 5-6 CS/min'

      insights.push({
        insightType: 'mistake',
        category: 'farm_efficiency',
        severity: 'high',
        title: 'Low last hit count for a core role',
        description: `You only secured ${stats.lastHits} last hits in ${Math.floor(durationMinutes)} minutes (${csPerMin.toFixed(1)} CS/min). ${comparisonText}.`,
        recommendation: 'Focus on last hitting in lane and utilize jungle camps between waves. Practice last hit training in demo mode.',
      })
    }

    // GPM check for cores using hero-specific benchmarks
    const minAcceptableGpm = avgGpm * 0.8 // 80% of hero average
    if (stats.goldPerMin < minAcceptableGpm) {
      const comparisonText = heroStats
        ? `For ${heroName}, average GPM is ${Math.round(avgGpm)} based on ${heroStats.totalMatches} matches`
        : 'target: 500+ for core roles'

      insights.push({
        insightType: 'mistake',
        category: 'farm_efficiency',
        severity: 'medium',
        title: 'Low gold per minute',
        description: `Your GPM was ${stats.goldPerMin}, which is below average (${comparisonText}).`,
        recommendation: 'Minimize downtime between farming waves and camps. Look for opportunities to take towers and participate in kills.',
      })
    }
  }

  // 2. Death Analysis
  const kdaRatio = stats.deaths === 0 ? stats.kills + stats.assists : (stats.kills + stats.assists) / stats.deaths

  if (stats.deaths > 8) {
    insights.push({
      insightType: 'mistake',
      category: 'positioning',
      severity: stats.deaths > 12 ? 'critical' : 'high',
      title: 'High death count',
      description: `You died ${stats.deaths} times this game. Your KDA ratio is ${kdaRatio.toFixed(2)}.`,
      recommendation: 'Focus on map awareness and positioning. Check minimap every 3-5 seconds and avoid pushing without vision.',
    })
  }

  if (kdaRatio < 2 && stats.deaths > 5) {
    insights.push({
      insightType: 'mistake',
      category: 'teamfight',
      severity: 'medium',
      title: 'Low KDA ratio',
      description: `Your KDA ratio of ${kdaRatio.toFixed(2)} suggests you're trading your life inefficiently.`,
      recommendation: 'Position more carefully in fights. Wait for initiators to go first and focus on staying alive while dealing damage.',
    })
  }

  // 3. Vision Analysis (for supports)
  if (isSupport) {
    const expectedWards = Math.floor(durationMinutes / 2) // Rough estimate
    const wardsPlaced = (stats.obsPlaced || 0) + (stats.senPlaced || 0)

    if (wardsPlaced < expectedWards * 0.5) {
      insights.push({
        insightType: 'mistake',
        category: 'vision',
        severity: 'high',
        title: 'Insufficient ward placement',
        description: `You only placed ${wardsPlaced} wards in a ${Math.floor(durationMinutes)}-minute game. As a support, vision control is crucial.`,
        recommendation: 'Place observer wards every time they come off cooldown. Prioritize high-traffic areas and objectives.',
      })
    }

    // Support GPM/XPM check
    if (stats.goldPerMin < 250) {
      insights.push({
        insightType: 'missed_opportunity',
        category: 'farm_efficiency',
        severity: 'low',
        title: 'Very low GPM for support',
        description: `GPM of ${stats.goldPerMin} is quite low. Even supports need some farm for key items.`,
        recommendation: 'Stack camps for your cores and take the bounty runes. Farm empty lanes when cores are elsewhere.',
      })
    }
  }

  // 4. Impact Analysis
  if (stats.heroDamage < 5000 && durationMinutes > 25) {
    insights.push({
      insightType: 'mistake',
      category: 'teamfight',
      severity: 'medium',
      title: 'Low hero damage output',
      description: `You dealt only ${stats.heroDamage} hero damage in a ${Math.floor(durationMinutes)}-minute game.`,
      recommendation: 'Participate more actively in teamfights. Position to maximize damage output while staying safe.',
    })
  }

  // 5. Positive Feedback
  if (kdaRatio > 5 && stats.kills > 5) {
    insights.push({
      insightType: 'good_play',
      category: 'teamfight',
      severity: 'low',
      title: 'Excellent KDA ratio',
      description: `Great job! Your KDA ratio of ${kdaRatio.toFixed(2)} shows strong performance.`,
      recommendation: 'Keep up this level of efficiency. Focus on closing games faster when ahead.',
    })
  }

  // Use hero-specific benchmarks for positive feedback
  const excellentCsThreshold = heroStats?.avgCsPerMin ? heroStats.avgCsPerMin * 1.2 : 8
  if (isCore && csPerMin > excellentCsThreshold) {
    const comparisonText = heroStats
      ? `well above the ${heroName} average of ${heroStats.avgCsPerMin.toFixed(1)} CS/min`
      : 'very strong farming'

    insights.push({
      insightType: 'good_play',
      category: 'farm_efficiency',
      severity: 'low',
      title: 'Excellent farming',
      description: `${stats.lastHits} last hits (${csPerMin.toFixed(1)} CS/min) is ${comparisonText}.`,
      recommendation: 'Convert your farm advantage into objectives. Push towers and control the map.',
    })
  }

  return {
    insights,
    detectedRole
  }
}

export function analyzeTimelineInsights(
  timelineData: TimelineData,
  playerSlot: number,
  duration: number
): Insight[] {
  const insights: Insight[] = []

  // 1. Death Pattern Analysis - detect death clusters
  if (timelineData.killsLog && timelineData.killsLog.length > 0) {
    const deaths = timelineData.killsLog

    // Look for death clusters (3+ deaths within 5 minutes)
    for (let i = 0; i < deaths.length - 2; i++) {
      const firstDeath = deaths[i].time
      const thirdDeath = deaths[i + 2].time
      const timeWindow = thirdDeath - firstDeath

      if (timeWindow <= 300) { // 5 minutes = 300 seconds
        const deathCount = deaths.filter(d => d.time >= firstDeath && d.time <= thirdDeath).length
        const timeMin = Math.floor(firstDeath / 60)

        insights.push({
          insightType: 'mistake',
          category: 'positioning',
          severity: deathCount >= 4 ? 'critical' : 'high',
          title: 'Death cluster detected',
          description: `You died ${deathCount} times between ${timeMin}:${String(Math.floor(firstDeath % 60)).padStart(2, '0')} and ${Math.floor(thirdDeath / 60)}:${String(Math.floor(thirdDeath % 60)).padStart(2, '0')}. This suggests tilt or poor decision-making.`,
          recommendation: 'When you die repeatedly, take a moment to reset mentally. Avoid revenge plays and focus on safer farming patterns.',
          gameTime: firstDeath
        })

        // Skip ahead to avoid overlapping clusters
        i += 2
      }
    }
  }

  // 2. Farm Efficiency Timeline Analysis
  if (timelineData.lhTimeline && timelineData.lhTimeline.length > 10) {
    const lhPerMinute: number[] = []

    // Calculate CS per minute for each minute
    for (let i = 1; i < timelineData.lhTimeline.length; i++) {
      const csThisMinute = timelineData.lhTimeline[i] - timelineData.lhTimeline[i - 1]
      lhPerMinute.push(csThisMinute)
    }

    // Find significant farm drops (CS drops below 2/min for 3+ consecutive minutes after minute 10)
    for (let i = 10; i < lhPerMinute.length - 2; i++) {
      if (lhPerMinute[i] < 2 && lhPerMinute[i + 1] < 2 && lhPerMinute[i + 2] < 2) {
        const dropStartTime = i * 60
        const dropEndTime = (i + 3) * 60

        insights.push({
          insightType: 'missed_opportunity',
          category: 'farm_efficiency',
          severity: 'medium',
          title: 'Extended farm drought',
          description: `Between ${i}:00 and ${i + 3}:00, you averaged less than 2 CS/min. You secured only ${lhPerMinute[i] + lhPerMinute[i + 1] + lhPerMinute[i + 2]} last hits in 3 minutes.`,
          recommendation: 'Even during active periods, try to find farm between fights. Push out side lanes and rotate to jungle camps.',
          gameTime: dropStartTime
        })

        // Skip ahead
        i += 2
      }
    }
  }

  // 3. Teamfight Performance Analysis
  if (timelineData.teamfights && timelineData.teamfights.length > 0) {
    let poorPerformanceFights = 0
    let excellentPerformanceFights = 0

    timelineData.teamfights.forEach((fight, index) => {
      const playerData = fight.players[playerSlot % 128] // Normalize slot for indexing

      if (playerData) {
        const fightTime = fight.start
        const fightMin = Math.floor(fightTime / 60)
        const fightSec = Math.floor(fightTime % 60)

        // Poor performance: died and dealt very low damage
        if (playerData.deaths > 0 && playerData.damage < 500) {
          poorPerformanceFights++

          if (poorPerformanceFights === 1) { // Only report first poor fight to avoid spam
            insights.push({
              insightType: 'mistake',
              category: 'teamfight',
              severity: 'medium',
              title: 'Poor teamfight execution',
              description: `At ${fightMin}:${String(fightSec).padStart(2, '0')}, you died while dealing only ${playerData.damage} damage in a major teamfight. This suggests poor positioning or premature engagement.`,
              recommendation: 'In teamfights, position safely and wait for key enemy cooldowns before committing. Focus on staying alive while dealing consistent damage.',
              gameTime: fightTime
            })
          }
        }

        // Excellent performance: high damage, no deaths, positive gold swing
        if (playerData.deaths === 0 && playerData.damage > 2000 && playerData.gold_delta > 500) {
          excellentPerformanceFights++

          if (excellentPerformanceFights === 1) { // Report first excellent fight
            insights.push({
              insightType: 'good_play',
              category: 'teamfight',
              severity: 'low',
              title: 'Excellent teamfight performance',
              description: `At ${fightMin}:${String(fightSec).padStart(2, '0')}, you dealt ${playerData.damage} damage without dying and gained ${playerData.gold_delta} net worth. Great execution!`,
              recommendation: 'This is the kind of teamfight positioning and execution to replicate. Analyze what you did right here.',
              gameTime: fightTime
            })
          }
        }
      }
    })
  }

  return insights
}

export function generateAnalysisSummary(insights: Insight[]) {
  return {
    criticalMistakes: insights.filter(i => i.severity === 'critical').length,
    highMistakes: insights.filter(i => i.severity === 'high').length,
    mediumMistakes: insights.filter(i => i.severity === 'medium').length,
    lowMistakes: insights.filter(i => i.severity === 'low').length,
    topCategories: [...new Set(insights.map(i => i.category))].slice(0, 5),
  }
}
