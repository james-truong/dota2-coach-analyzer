// Simple mistake detection logic based on stats
// This will evolve into more sophisticated analysis over time
import { getHeroRoles, getHeroName } from './heroDataService.js'

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

export function analyzePlayerPerformance(
  stats: PlayerStats,
  duration: number,
  isRadiant: boolean
): Insight[] {
  const insights: Insight[] = []
  const durationMinutes = duration / 60

  // Determine role based on player slot (simplified)
  const isCore = stats.playerSlot % 128 < 3 // Slots 0-2 or 128-130 are typically cores
  const isSupport = !isCore

  // 0. Hero-Role Mismatch Detection (Smart)
  if (stats.laneRole && stats.heroId) {
    const heroRoles = getHeroRoles(stats.heroId)
    const heroName = getHeroName(stats.heroId)

    // Infer actual position from lane_role + stats
    // lane_role tells us WHERE they laned, not WHAT position they played
    let actualPosition: number = stats.laneRole

    // Smart detection: If in safe lane (lane_role 1), distinguish carry from support
    if (stats.laneRole === 1) {
      const isLikelySupport =
        heroRoles.includes('Support') || // Hero is tagged as support
        (stats.goldPerMin < 300 && (stats.obsPlaced || 0) > 2) || // Low farm + wards
        (stats.lastHits < durationMinutes * 2) // Very low CS (< 2/min)

      if (isLikelySupport) {
        actualPosition = 5 // This is Position 5 (Hard Support), not Position 1
      }
    }

    // Similarly for offlane (lane_role 3), could be Pos 3 or Pos 4 roaming
    if (stats.laneRole === 3) {
      const isLikelySupport =
        heroRoles.includes('Support') &&
        stats.goldPerMin < 350 &&
        (stats.obsPlaced || 0) > 1

      if (isLikelySupport) {
        actualPosition = 4 // Position 4 (Soft Support)
      }
    }

    const positionNames: Record<number, string> = {
      1: 'Position 1 (Safe Lane Carry)',
      2: 'Position 2 (Mid Lane)',
      3: 'Position 3 (Off Lane)',
      4: 'Position 4 (Soft Support)',
      5: 'Position 5 (Hard Support)'
    }

    const expectedRolesForPosition: Record<number, string[]> = {
      1: ['Carry', 'Nuker'],  // Pos 1 needs scaling carries
      2: ['Nuker', 'Initiator', 'Disabler'],  // Pos 2 needs playmakers
      3: ['Durable', 'Initiator', 'Disabler'],  // Pos 3 needs tanky initiators
      4: ['Support', 'Disabler', 'Initiator'],  // Pos 4 needs utility
      5: ['Support', 'Disabler', 'Nuker']  // Pos 5 needs babysitters
    }

    const positionName = positionNames[actualPosition]
    const expectedRoles = expectedRolesForPosition[actualPosition]

    if (positionName && expectedRoles && heroRoles.length > 0) {
      // Check if hero has at least one expected role for this position
      const hasMatchingRole = heroRoles.some(role => expectedRoles.includes(role))
      const primaryHeroRole = heroRoles[0]  // First role is primary

      if (!hasMatchingRole) {
        // Hero role doesn't match the actual position
        insights.push({
          insightType: 'mistake',
          category: 'decision_making',
          severity: 'high',
          title: 'Hero-role mismatch detected',
          description: `${heroName} is primarily a ${primaryHeroRole} hero, but you played it in ${positionName}. This hero's strengths (${heroRoles.slice(0, 3).join(', ')}) don't align well with this position's requirements.`,
          recommendation: `For ${positionName}, consider heroes with these traits: ${expectedRoles.join(', ')}. ${heroName} would be better suited for a different position that matches its ${primaryHeroRole} role.`
        })
      }
    }
  }

  // 1. Farm Efficiency Check (for cores)
  if (isCore) {
    const expectedLastHits = durationMinutes * 7 // ~7 CS/min is average
    if (stats.lastHits < expectedLastHits * 0.6) {
      insights.push({
        insightType: 'mistake',
        category: 'farm_efficiency',
        severity: 'high',
        title: 'Low last hit count for a core role',
        description: `You only secured ${stats.lastHits} last hits in ${Math.floor(durationMinutes)} minutes (${(stats.lastHits / durationMinutes).toFixed(1)} CS/min). For a core player, aim for at least 5-6 CS/min.`,
        recommendation: 'Focus on last hitting in lane and utilize jungle camps between waves. Practice last hit training in demo mode.',
      })
    }

    // GPM check for cores
    if (stats.goldPerMin < 400) {
      insights.push({
        insightType: 'mistake',
        category: 'farm_efficiency',
        severity: 'medium',
        title: 'Low gold per minute',
        description: `Your GPM was ${stats.goldPerMin}, which is below average for core roles (target: 500+).`,
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

  if (isCore && stats.lastHits > durationMinutes * 8) {
    insights.push({
      insightType: 'good_play',
      category: 'farm_efficiency',
      severity: 'low',
      title: 'Excellent farming',
      description: `${stats.lastHits} last hits (${(stats.lastHits / durationMinutes).toFixed(1)} CS/min) is very strong farming.`,
      recommendation: 'Convert your farm advantage into objectives. Push towers and control the map.',
    })
  }

  return insights
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
