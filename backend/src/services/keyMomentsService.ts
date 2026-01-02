// Service for extracting key moments from Dota 2 matches
// Identifies important events for replay highlights

export interface KeyMoment {
  timestamp: number // Seconds from match start
  type: 'kill' | 'death' | 'multikill' | 'objective' | 'item_purchase' | 'comeback' | 'team_fight'
  title: string
  description: string
  importance: 'high' | 'medium' | 'low'
  metadata?: {
    heroKilled?: string
    itemPurchased?: string
    goldSwing?: number
    killStreak?: number
  }
}

export interface KeyMomentsAnalysis {
  moments: KeyMoment[]
  topMoments: KeyMoment[] // Top 5 most important moments
  matchId: string
  duration: number
}

/**
 * Extract key moments from match data
 */
export async function extractKeyMoments(
  matchData: any,
  playerAccountId: number
): Promise<KeyMomentsAnalysis> {
  const moments: KeyMoment[] = []

  // Find the player's data
  const player = matchData.players?.find((p: any) => p.account_id === playerAccountId)

  if (!player) {
    return {
      moments: [],
      topMoments: [],
      matchId: matchData.match_id?.toString() || '',
      duration: matchData.duration || 0,
    }
  }

  // Extract kills timeline
  if (player.kills_log && Array.isArray(player.kills_log)) {
    player.kills_log.forEach((kill: any) => {
      const isFirstBlood = kill.time < 120 && moments.filter(m => m.type === 'kill').length === 0

      moments.push({
        timestamp: kill.time,
        type: 'kill',
        title: isFirstBlood ? '⚔️ First Blood!' : '⚔️ Kill',
        description: `Killed ${getHeroNameFromId(kill.key, matchData)}`,
        importance: isFirstBlood ? 'high' : 'medium',
        metadata: {
          heroKilled: getHeroNameFromId(kill.key, matchData),
        },
      })
    })
  }

  // Extract deaths
  if (player.life_state && Array.isArray(player.life_state)) {
    let deathCount = 0
    player.life_state.forEach((state: any, index: number) => {
      if (state === 2) { // Dead state
        deathCount++
        const timestamp = index * 60 // life_state is per minute

        moments.push({
          timestamp,
          type: 'death',
          title: '💀 Death',
          description: `Died (Death #${deathCount})`,
          importance: deathCount <= 3 ? 'high' : 'medium',
        })
      }
    })
  }

  // Detect multi-kills (from kills_log timing)
  detectMultiKills(player, moments, matchData)

  // Extract objective moments (Roshan, towers, barracks)
  if (matchData.objectives && Array.isArray(matchData.objectives)) {
    matchData.objectives.forEach((objective: any) => {
      const playerTeam = player.player_slot < 128 ? 'radiant' : 'dire'
      const objectiveTeam = objective.team === 2 ? 'radiant' : 'dire'

      // Only include objectives for player's team or enemy Roshan kills
      if (objectiveTeam === playerTeam || objective.type === 'CHAT_MESSAGE_ROSHAN_KILL') {
        const isRoshan = objective.type === 'CHAT_MESSAGE_ROSHAN_KILL'
        const importance = isRoshan ? 'high' : 'medium'

        moments.push({
          timestamp: objective.time,
          type: 'objective',
          title: isRoshan ? '🐲 Roshan Slain' : `🏰 ${objective.key || 'Objective'}`,
          description: getObjectiveDescription(objective, playerTeam),
          importance,
        })
      }
    })
  }

  // Extract major item purchases
  if (player.purchase_log && Array.isArray(player.purchase_log)) {
    const majorItems = [
      'blink', 'black_king_bar', 'butterfly', 'daedalus', 'monkey_king_bar',
      'radiance', 'battle_fury', 'mjollnir', 'assault', 'heart', 'skadi',
      'ethereal_blade', 'aghanims_scepter', 'refresher', 'manta', 'satanic',
      'abyssal_blade', 'bloodstone', 'shivas_guard', 'scythe', 'nullifier',
      'overwhelming_blink', 'swift_blink', 'arcane_blink',
    ]

    player.purchase_log.forEach((purchase: any) => {
      const itemKey = purchase.key?.toLowerCase() || ''
      const isMajorItem = majorItems.some(major => itemKey.includes(major))

      if (isMajorItem) {
        moments.push({
          timestamp: purchase.time,
          type: 'item_purchase',
          title: '🛡️ Major Item',
          description: `Purchased ${formatItemName(purchase.key)}`,
          importance: 'medium',
          metadata: {
            itemPurchased: purchase.key,
          },
        })
      }
    })
  }

  // Detect comeback moments (gold/XP swings)
  detectComebackMoments(matchData, player, moments)

  // Detect team fights (clusters of kills/deaths)
  detectTeamFights(player, moments, matchData)

  // Sort moments by timestamp
  moments.sort((a, b) => a.timestamp - b.timestamp)

  // Get top 5 most important moments
  const topMoments = getTopMoments(moments, 5)

  return {
    moments,
    topMoments,
    matchId: matchData.match_id?.toString() || '',
    duration: matchData.duration || 0,
  }
}

/**
 * Detect multi-kills from kills timeline
 */
function detectMultiKills(player: any, moments: KeyMoment[], _matchData: any): void {
  if (!player.kills_log || !Array.isArray(player.kills_log)) return

  const kills = player.kills_log.map((k: any) => k.time).sort((a: number, b: number) => a - b)

  for (let i = 0; i < kills.length - 1; i++) {
    const timeDiff = kills[i + 1] - kills[i]

    // Multi-kill if kills within 18 seconds
    if (timeDiff <= 18) {
      let streakCount = 2
      let j = i + 1

      // Count consecutive kills in the streak
      while (j < kills.length - 1 && kills[j + 1] - kills[j] <= 18) {
        streakCount++
        j++
      }

      const streakName = getStreakName(streakCount)

      moments.push({
        timestamp: kills[i],
        type: 'multikill',
        title: `🔥 ${streakName}!`,
        description: `${streakCount} kills in quick succession`,
        importance: 'high',
        metadata: {
          killStreak: streakCount,
        },
      })

      // Skip the kills we've already counted
      i = j
    }
  }
}

/**
 * Detect comeback moments from gold/XP advantage changes
 */
function detectComebackMoments(matchData: any, player: any, moments: KeyMoment[]): void {
  if (!matchData.radiant_gold_adv || !Array.isArray(matchData.radiant_gold_adv)) return

  const playerTeam = player.player_slot < 128 ? 'radiant' : 'dire'
  const goldAdv = matchData.radiant_gold_adv

  for (let i = 5; i < goldAdv.length; i++) {
    const current = playerTeam === 'radiant' ? goldAdv[i] : -goldAdv[i]
    const previous = playerTeam === 'radiant' ? goldAdv[i - 5] : -goldAdv[i - 5]

    // Detect significant comeback (5k+ gold swing in 5 minutes from behind)
    if (previous < -3000 && current > previous + 5000) {
      moments.push({
        timestamp: i * 60,
        type: 'comeback',
        title: '📈 Comeback Moment',
        description: `Gold swing: ${Math.round((current - previous) / 1000)}k gold gained`,
        importance: 'high',
        metadata: {
          goldSwing: current - previous,
        },
      })
    }
  }
}

/**
 * Detect team fights (clusters of kills/deaths within short time)
 */
function detectTeamFights(player: any, moments: KeyMoment[], _matchData: any): void {
  // Combine all kills and deaths timestamps
  const events: number[] = []

  if (player.kills_log) {
    player.kills_log.forEach((kill: any) => events.push(kill.time))
  }

  if (player.life_state && Array.isArray(player.life_state)) {
    player.life_state.forEach((state: any, index: number) => {
      if (state === 2) events.push(index * 60)
    })
  }

  events.sort((a, b) => a - b)

  // Find clusters of 3+ events within 30 seconds
  for (let i = 0; i < events.length - 2; i++) {
    if (events[i + 2] - events[i] <= 30) {
      const clusterStart = events[i]
      let clusterEnd = events[i + 2]
      let clusterSize = 3

      // Extend cluster
      let j = i + 3
      while (j < events.length && events[j] - clusterStart <= 30) {
        clusterEnd = events[j]
        clusterSize++
        j++
      }

      moments.push({
        timestamp: clusterStart,
        type: 'team_fight',
        title: '⚔️ Team Fight',
        description: `Major engagement (${clusterSize} events in ${Math.round(clusterEnd - clusterStart)}s)`,
        importance: clusterSize >= 5 ? 'high' : 'medium',
      })

      // Skip events in this cluster
      i = j - 1
    }
  }
}

/**
 * Get top N most important moments
 */
function getTopMoments(moments: KeyMoment[], count: number): KeyMoment[] {
  // Priority scoring
  const scoreMoment = (moment: KeyMoment): number => {
    let score = 0

    // Importance base score
    if (moment.importance === 'high') score += 10
    else if (moment.importance === 'medium') score += 5
    else score += 2

    // Type bonuses
    if (moment.type === 'multikill') score += 8
    if (moment.type === 'comeback') score += 7
    if (moment.type === 'team_fight') score += 6
    if (moment.type === 'objective' && moment.title.includes('Roshan')) score += 5
    if (moment.title.includes('First Blood')) score += 5

    return score
  }

  return moments
    .map(m => ({ moment: m, score: scoreMoment(m) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(item => item.moment)
    .sort((a, b) => a.timestamp - b.timestamp) // Re-sort by time
}

/**
 * Get hero name from hero ID using match data
 */
function getHeroNameFromId(heroId: number | string, matchData: any): string {
  const hero = matchData.players?.find((p: any) => p.hero_id === Number(heroId))
  return hero?.hero_id ? `Hero ${heroId}` : 'Unknown Hero'
}

/**
 * Get streak name from kill count
 */
function getStreakName(count: number): string {
  if (count >= 5) return 'RAMPAGE'
  if (count === 4) return 'Ultra Kill'
  if (count === 3) return 'Triple Kill'
  return 'Double Kill'
}

/**
 * Format item name for display
 */
function formatItemName(itemKey: string): string {
  if (!itemKey) return 'Unknown Item'

  return itemKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get objective description
 */
function getObjectiveDescription(objective: any, playerTeam: string): string {
  const isPlayerTeam = (objective.team === 2 ? 'radiant' : 'dire') === playerTeam
  const teamText = isPlayerTeam ? 'Your team' : 'Enemy team'

  if (objective.type === 'CHAT_MESSAGE_ROSHAN_KILL') {
    return `${teamText} slayed Roshan`
  }

  if (objective.key) {
    return `${teamText} destroyed ${objective.key}`
  }

  return `${teamText} completed objective`
}

/**
 * Generate deep link for Dota 2 client to jump to specific timestamp
 * Note: This downloads the replay and starts playback
 * User may need to manually skip to timestamp if auto-seek doesn't work
 */
export function generateReplayDeepLink(matchId: string, timestamp?: number): string {
  // Steam protocol for launching Dota 2 with console commands
  // Format: steam://rungame/570/76561202255233023/+command1+command2

  if (timestamp !== undefined) {
    // Download replay and attempt to jump to timestamp
    // Commands: download replay, then play at specific time
    return `steam://rungame/570/76561202255233023/+download_match ${matchId} +playdemo replays/${matchId}.dem ${timestamp}`
  }

  // Just download and play the replay from the start
  return `steam://rungame/570/76561202255233023/+download_match ${matchId} +playdemo replays/${matchId}.dem`
}

/**
 * Generate OpenDota web link for match replay
 */
export function generateOpenDotaLink(matchId: string): string {
  return `https://www.opendota.com/matches/${matchId}`
}
