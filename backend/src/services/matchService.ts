// Match analysis service
import { fetchMatchFromOpenDota, getPlayerHeroName, getGameModeName, getLobbyTypeName, isRadiantPlayer, hasTimelineData, requestMatchParsing } from './openDotaService.js'
import { getHeroImageUrl } from './heroDataService.js'
import { analyzePlayerPerformance, analyzeTimelineInsights, generateAnalysisSummary } from './analysisService.js'
import { saveMatchAnalysis } from './databaseService.js'
import { v4 as uuidv4 } from 'uuid'

export async function getMatchPlayers(matchId: string): Promise<any | null> {
  console.log(`Fetching players for match: ${matchId}`)

  const matchData = await fetchMatchFromOpenDota(matchId)

  if (!matchData) {
    return null
  }

  // Build player list with hero names and images
  const players = await Promise.all(
    matchData.players.map(async (player) => ({
      playerSlot: player.player_slot,
      heroId: player.hero_id,
      heroName: await getPlayerHeroName(player.hero_id),
      heroImage: getHeroImageUrl(player.hero_id),
      team: isRadiantPlayer(player.player_slot) ? 'radiant' : 'dire',
      kills: player.kills,
      deaths: player.deaths,
      assists: player.assists,
      accountId: player.account_id,
      laneRole: player.lane_role,
    }))
  )

  return {
    matchId: matchData.match_id,
    duration: matchData.duration,
    gameMode: getGameModeName(matchData.game_mode),
    radiantWin: matchData.radiant_win,
    players,
  }
}

export async function getMatchAnalysis(matchId: string, playerSlot?: number): Promise<any | null> {
  console.log(`Fetching analysis for match: ${matchId}`)

  // Fetch match data from OpenDota API
  const matchData = await fetchMatchFromOpenDota(matchId)

  if (!matchData) {
    return null
  }

  // If no player slot specified, analyze the first player (player slot 0)
  const targetPlayerSlot = playerSlot !== undefined ? playerSlot : 0
  const targetPlayer = matchData.players.find(p => p.player_slot === targetPlayerSlot)

  if (!targetPlayer) {
    console.error(`Player slot ${targetPlayerSlot} not found in match`)
    return null
  }

  const isRadiant = isRadiantPlayer(targetPlayer.player_slot)
  const heroName = await getPlayerHeroName(targetPlayer.hero_id)

  // Check if match has timeline data, if not request parsing
  if (!hasTimelineData(matchData)) {
    console.log('⚠️  Match missing timeline data - requesting parse from OpenDota')
    const parseResult = await requestMatchParsing(matchId)
    if (parseResult.success) {
      console.log('✓ Parse request submitted. Timeline insights will be available after parsing completes (5-30 minutes)')
    } else {
      console.log(`✗ Could not request parsing: ${parseResult.message}`)
    }
  }

  // Analyze player performance
  const insights = analyzePlayerPerformance(
    {
      heroId: targetPlayer.hero_id,
      playerSlot: targetPlayer.player_slot,
      kills: targetPlayer.kills,
      deaths: targetPlayer.deaths,
      assists: targetPlayer.assists,
      lastHits: targetPlayer.last_hits,
      denies: targetPlayer.denies,
      goldPerMin: targetPlayer.gold_per_min,
      xpPerMin: targetPlayer.xp_per_min,
      level: targetPlayer.level,
      heroDamage: targetPlayer.hero_damage,
      towerDamage: targetPlayer.tower_damage,
      netWorth: targetPlayer.net_worth,
      obsPlaced: targetPlayer.obs_placed,
      senPlaced: targetPlayer.sen_placed,
      campsStacked: targetPlayer.camps_stacked,
      laneRole: targetPlayer.lane_role,
    },
    matchData.duration,
    isRadiant
  )

  // Analyze timeline insights
  const timelineData = {
    killsLog: targetPlayer.kills_log,
    goldTimeline: targetPlayer.gold_t,
    xpTimeline: targetPlayer.xp_t,
    lhTimeline: targetPlayer.lh_t,
    teamfights: matchData.teamfights,
  }
  console.log('Timeline data:', {
    killsLogCount: timelineData.killsLog?.length || 0,
    lhTimelineCount: timelineData.lhTimeline?.length || 0,
    teamfightsCount: timelineData.teamfights?.length || 0,
  })
  const timelineInsights = analyzeTimelineInsights(
    timelineData,
    targetPlayer.player_slot,
    matchData.duration
  )
  console.log('Timeline insights generated:', timelineInsights.length)

  // Combine all insights
  const allInsights = [...insights, ...timelineInsights]

  const summary = generateAnalysisSummary(allInsights)

  // Build response matching AnalysisResult interface
  const insightsWithIds = allInsights.map(insight => ({
    id: uuidv4(),
    matchId: matchId,
    playerPerformanceId: uuidv4(),
    ...insight,
    createdAt: new Date().toISOString(),
  }))

  const result = {
    match: {
      id: matchId,
      userId: null,
      matchId: matchData.match_id,
      gameMode: getGameModeName(matchData.game_mode),
      lobbyType: getLobbyTypeName(matchData.lobby_type),
      duration: matchData.duration,
      radiantWin: matchData.radiant_win,
      startTime: matchData.start_time,
      analysisStatus: 'completed',
      parsedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    playerPerformance: {
      id: uuidv4(),
      matchId,
      isPrimaryPlayer: true,
      heroId: targetPlayer.hero_id,
      heroName,
      heroImage: getHeroImageUrl(targetPlayer.hero_id),
      playerSlot: targetPlayer.player_slot,
      team: isRadiant ? 'radiant' : 'dire',
      kills: targetPlayer.kills,
      deaths: targetPlayer.deaths,
      assists: targetPlayer.assists,
      lastHits: targetPlayer.last_hits,
      denies: targetPlayer.denies,
      goldPerMin: targetPlayer.gold_per_min,
      xpPerMin: targetPlayer.xp_per_min,
      heroDamage: targetPlayer.hero_damage,
      towerDamage: targetPlayer.tower_damage,
      heroHealing: targetPlayer.hero_healing,
      level: targetPlayer.level,
      netWorth: targetPlayer.net_worth,
      campsStacked: targetPlayer.camps_stacked || 0,
      runesPickedUp: targetPlayer.runes_picked_up || 0,
      observerWardsPlaced: targetPlayer.obs_placed || 0,
      sentryWardsPlaced: targetPlayer.sen_placed || 0,
      wardsDestroyed: targetPlayer.observer_kills || 0,
      stunsDuration: targetPlayer.stuns || 0,
      finalItems: [
        targetPlayer.item_0,
        targetPlayer.item_1,
        targetPlayer.item_2,
        targetPlayer.item_3,
        targetPlayer.item_4,
        targetPlayer.item_5,
      ].filter(item => item !== undefined && item !== 0),
    },
    insights: insightsWithIds,
    summary,
  }

  // Save to database for match history (fire and forget - don't block response)
  saveMatchAnalysis({
    matchId: matchId,
    heroName,
    heroImage: getHeroImageUrl(targetPlayer.hero_id),
    playerSlot: targetPlayer.player_slot,
    kills: targetPlayer.kills,
    deaths: targetPlayer.deaths,
    assists: targetPlayer.assists,
    gameMode: getGameModeName(matchData.game_mode),
    duration: matchData.duration,
    radiantWin: matchData.radiant_win,
  }).catch(err => console.error('Failed to save match to database:', err))

  return result
}

export async function getUserMatches(
  userId: string,
  limit: number = 10,
  offset: number = 0
): Promise<any[]> {
  // TODO: Implement database query to get user matches
  console.log(`Fetching matches for user: ${userId} (limit: ${limit}, offset: ${offset})`)

  return []
}
