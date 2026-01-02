// Match analysis service
import { fetchMatchFromOpenDota, getPlayerHeroName, getGameModeName, getLobbyTypeName, isRadiantPlayer, hasTimelineData, requestMatchParsing } from './openDotaService.js'
import { getHeroImageUrl } from './heroDataService.js'
import { analyzePlayerPerformance, analyzeTimelineInsights, generateAnalysisSummary } from './analysisService.js'
import { generateAICoachingInsights } from './aiCoachingService.js'
import { saveMatchAnalysis, getCachedMatchAnalysis } from './databaseService.js'
import { updateHeroStatistics } from './heroStatisticsService.js'
import { analyzeItemBuild } from './itemBuildService.js'
import { extractKeyMoments, generateReplayDeepLink, generateOpenDotaLink } from './keyMomentsService.js'
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

export async function getMatchAnalysis(matchId: string, playerSlot?: number, currentUser?: any): Promise<any | null> {
  console.log(`Fetching analysis for match: ${matchId}${currentUser ? ` (User: ${currentUser})` : ''}`)

  // If player slot is specified, check if we've already analyzed this match
  if (playerSlot !== undefined) {
    const cachedAnalysis = await getCachedMatchAnalysis(matchId, playerSlot)

    if (cachedAnalysis) {
      console.log(`💾 Cache HIT! Returning cached analysis for match ${matchId} (player slot ${playerSlot})`)
      console.log(`💰 SAVED ~$0.03 CAD by skipping AI analysis!`)

      // Return fully cached data without any AI calls
      return {
        match: {
          id: matchId,
          userId: null,
          matchId: cachedAnalysis.matchId,
          gameMode: cachedAnalysis.gameMode,
          lobbyType: 'Ranked',
          duration: cachedAnalysis.duration,
          radiantWin: cachedAnalysis.radiantWin,
          startTime: null,
          analysisStatus: 'completed',
          parsedAt: cachedAnalysis.analyzedAt,
          createdAt: cachedAnalysis.analyzedAt,
        },
        playerPerformance: {
          id: cachedAnalysis.id,
          matchId,
          isPrimaryPlayer: true,
          heroId: cachedAnalysis.heroId,
          heroName: cachedAnalysis.heroName,
          heroImage: getHeroImageUrl(cachedAnalysis.heroId),
          playerSlot: cachedAnalysis.playerSlot,
          team: cachedAnalysis.team,
          detectedRole: cachedAnalysis.detectedRole,
          kills: cachedAnalysis.kills,
          deaths: cachedAnalysis.deaths,
          assists: cachedAnalysis.assists,
          lastHits: cachedAnalysis.lastHits,
          denies: cachedAnalysis.denies,
          goldPerMin: cachedAnalysis.goldPerMin,
          xpPerMin: cachedAnalysis.xpPerMin,
          heroDamage: cachedAnalysis.heroDamage,
          towerDamage: cachedAnalysis.towerDamage,
          heroHealing: cachedAnalysis.heroHealing,
          level: cachedAnalysis.level,
          netWorth: cachedAnalysis.netWorth,
          campsStacked: cachedAnalysis.campsStacked || 0,
          runesPickedUp: 0,
          observerWardsPlaced: cachedAnalysis.obsPlaced || 0,
          sentryWardsPlaced: cachedAnalysis.senPlaced || 0,
          wardsDestroyed: 0,
          stunsDuration: 0,
          finalItems: [],
        },
        insights: [],
        summary: {
          strengths: ['Previously analyzed match - stats loaded from cache'],
          weaknesses: [],
          keyRecommendation: `Match analyzed on ${new Date(cachedAnalysis.analyzedAt).toLocaleDateString()}. View "My Matches" for full history.`,
        },
        itemBuild: {
          items: [],
          score: 7,
          keyIssues: [],
          positives: ['Cached analysis - full item analysis not stored'],
        },
        keyMoments: {
          moments: [],
          topMoments: [],
          deepLink: generateReplayDeepLink(matchId),
          openDotaLink: generateOpenDotaLink(matchId),
        },
        cached: true,
      }
    }
  }

  console.log(`🔍 No cache found - performing full analysis for match ${matchId}`)

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

  // Analyze player performance to get detected role
  const performanceAnalysis = await analyzePlayerPerformance(
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
    isRadiant,
    heroName
  )
  const detectedRole = performanceAnalysis.detectedRole

  // Generate AI-powered coaching insights
  const aiInsights = await generateAICoachingInsights({
    heroName,
    team: isRadiant ? 'radiant' : 'dire',
    detectedRole,
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
    heroHealing: targetPlayer.hero_healing || 0,
    netWorth: targetPlayer.net_worth,
    observerWardsPlaced: targetPlayer.obs_placed || 0,
    sentryWardsPlaced: targetPlayer.sen_placed || 0,
    campsStacked: targetPlayer.camps_stacked || 0,
    duration: matchData.duration,
    gameMode: getGameModeName(matchData.game_mode),
    radiantWin: matchData.radiant_win,
  })

  // Fallback to rule-based insights if AI fails
  const allInsights = aiInsights.length > 0 ? aiInsights : performanceAnalysis.insights

  // Analyze item build
  const playerWon = (isRadiant && matchData.radiant_win) || (!isRadiant && !matchData.radiant_win)
  const itemBuildAnalysis = analyzeItemBuild(
    heroName,
    detectedRole,
    [
      targetPlayer.item_0,
      targetPlayer.item_1,
      targetPlayer.item_2,
      targetPlayer.item_3,
      targetPlayer.item_4,
      targetPlayer.item_5,
    ].filter((item): item is number => item !== undefined && item !== 0),
    getGameModeName(matchData.game_mode),
    matchData.duration,
    playerWon,
    {
      kills: targetPlayer.kills,
      deaths: targetPlayer.deaths,
      gpm: targetPlayer.gold_per_min,
      netWorth: targetPlayer.net_worth,
    }
  )

  // Extract key moments for replay highlights
  const keyMomentsAnalysis = await extractKeyMoments(matchData, targetPlayer.account_id)

  // Combine all insights including item build insights
  const combinedInsights = [
    ...allInsights,
    ...itemBuildAnalysis.insights.map(insight => ({
      category: insight.category,
      severity: insight.severity,
      message: insight.message,
      suggestion: insight.recommendation || '',
      impact: insight.severity === 'critical' ? 'high' : insight.severity === 'important' ? 'medium' : 'low',
    }))
  ]

  const summary = generateAnalysisSummary(combinedInsights)

  // Build response matching AnalysisResult interface
  const insightsWithIds = combinedInsights.map(insight => ({
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
      detectedRole,
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
      ].filter((item): item is number => item !== undefined && item !== 0),
    },
    insights: insightsWithIds,
    summary,
    itemBuild: {
      items: itemBuildAnalysis.finalItems,
      score: itemBuildAnalysis.itemScore,
      keyIssues: itemBuildAnalysis.keyIssues,
      positives: itemBuildAnalysis.positives,
    },
    keyMoments: {
      moments: keyMomentsAnalysis.moments,
      topMoments: keyMomentsAnalysis.topMoments,
      deepLink: generateReplayDeepLink(matchId),
      openDotaLink: generateOpenDotaLink(matchId),
    },
  }

  // Save to database for match history (fire and forget - don't block response)
  saveMatchAnalysis({
    matchId: matchId,
    userId: currentUser?.id,
    accountId: targetPlayer.account_id,
    heroName,
    heroId: targetPlayer.hero_id,
    heroImage: getHeroImageUrl(targetPlayer.hero_id),
    playerSlot: targetPlayer.player_slot,
    team: isRadiant ? 'radiant' : 'dire',
    detectedRole,
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
    netWorth: targetPlayer.net_worth,
    level: targetPlayer.level,
    obsPlaced: targetPlayer.obs_placed,
    senPlaced: targetPlayer.sen_placed,
    campsStacked: targetPlayer.camps_stacked,
    gameMode: getGameModeName(matchData.game_mode),
    duration: matchData.duration,
    radiantWin: matchData.radiant_win,
    won: playerWon,
  }).catch(err => console.error('Failed to save match to database:', err))

  // Update hero statistics (fire and forget - don't block response)
  updateHeroStatistics({
    heroName,
    heroId: targetPlayer.hero_id,
    duration: matchData.duration,
    gpm: targetPlayer.gold_per_min,
    xpm: targetPlayer.xp_per_min,
    lastHits: targetPlayer.last_hits,
    denies: targetPlayer.denies,
    kills: targetPlayer.kills,
    deaths: targetPlayer.deaths,
    assists: targetPlayer.assists,
    heroDamage: targetPlayer.hero_damage,
    towerDamage: targetPlayer.tower_damage,
    heroHealing: targetPlayer.hero_healing || 0,
    observerWardsPlaced: targetPlayer.obs_placed || 0,
    sentryWardsPlaced: targetPlayer.sen_placed || 0,
    campsStacked: targetPlayer.camps_stacked || 0,
  }).catch(err => console.error('Failed to update hero statistics:', err))

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
