// Match analysis service
import { fetchMatchFromOpenDota, getPlayerHeroName, getGameModeName, getLobbyTypeName, isRadiantPlayer, hasTimelineData, requestMatchParsing } from './openDotaService.js'
import { getHeroImageUrl } from './heroDataService.js'
import { analyzePlayerPerformance, analyzeTimelineInsights, generateAnalysisSummary } from './analysisService.js'
import { generateAICoachingInsights } from './aiCoachingService.js'
import { saveMatchAnalysis, getCachedMatchAnalysis } from './databaseService.js'
import { updateHeroStatistics } from './heroStatisticsService.js'
import { analyzeItemBuild, getItemNamesFromPurchaseLog, getItemNamesFromIds } from './itemBuildService.js'
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

export async function getMatchAnalysis(matchId: string, playerSlot?: number, currentUser?: any, accountId?: number): Promise<any | null> {
  console.log(`Fetching analysis for match: ${matchId}${currentUser?.id ? ` (User ID: ${currentUser.id})` : ''}${accountId ? ` (Account ID: ${accountId})` : ''}`)

  // If accountId is provided but playerSlot is not, we need to fetch match data first to find the player
  // Otherwise, check cache with playerSlot
  let resolvedPlayerSlot = playerSlot
  let prefetchedMatchData: any = null

  // If we have accountId but no playerSlot, fetch match data to resolve it
  if (resolvedPlayerSlot === undefined && accountId !== undefined) {
    prefetchedMatchData = await fetchMatchFromOpenDota(matchId)
    if (prefetchedMatchData) {
      const playerByAccount = prefetchedMatchData.players.find((p: any) => p.account_id === accountId)
      if (playerByAccount) {
        resolvedPlayerSlot = playerByAccount.player_slot
        console.log(`📍 Resolved account_id ${accountId} to player_slot ${resolvedPlayerSlot}`)
      }
    }
  }

  // If player slot is specified (or resolved), check if we've already analyzed this match
  if (resolvedPlayerSlot !== undefined) {
    const cachedAnalysis = await getCachedMatchAnalysis(matchId, resolvedPlayerSlot)

    if (cachedAnalysis) {
      console.log(`💾 Cache HIT! Returning cached analysis for match ${matchId} (player slot ${playerSlot}) with item data`)
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
          finalItems: cachedAnalysis.finalItems || [],
        },
        insights: cachedAnalysis.aiInsights || [],
        summary: cachedAnalysis.aiSummary || {
          strengths: ['Previously analyzed match - stats loaded from cache'],
          weaknesses: [],
          keyRecommendation: `Match analyzed on ${new Date(cachedAnalysis.analyzedAt).toLocaleDateString()}. View "My Matches" for full history.`,
        },
        itemBuild: cachedAnalysis.itemBuildAnalysis ? {
          ...cachedAnalysis.itemBuildAnalysis,
          purchaseHistory: cachedAnalysis.purchaseHistory || cachedAnalysis.itemBuildAnalysis.purchaseHistory || [],
          recommendations: cachedAnalysis.itemBuildAnalysis.recommendations,
        } : {
          items: [],
          score: 0,
          keyIssues: [],
          positives: ['v2: Item data not cached - re-analyze for full items'],
          purchaseHistory: [],
        },
        keyMoments: cachedAnalysis.aiKeyMoments || {
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

  // Fetch match data from OpenDota API (reuse prefetched data if available)
  const matchData = prefetchedMatchData || await fetchMatchFromOpenDota(matchId)

  if (!matchData) {
    return null
  }

  // Use resolved player slot, or default to 0
  const targetPlayerSlot = resolvedPlayerSlot !== undefined ? resolvedPlayerSlot : 0
  const targetPlayer = matchData.players.find((p: any) => p.player_slot === targetPlayerSlot)

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

  // Calculate team kills for kill participation
  const teamPlayers = matchData.players.filter(p => isRadiantPlayer(p.player_slot) === isRadiant)
  const teamKills = teamPlayers.reduce((sum, p) => sum + p.kills, 0)

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
      teamKills,  // For kill participation calculation
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
    teamKills,  // For kill participation in AI prompts
  })

  // Fallback to rule-based insights if AI fails
  const allInsights = aiInsights.length > 0 ? aiInsights : performanceAnalysis.insights

  // Analyze item build
  const playerWon = (isRadiant && matchData.radiant_win) || (!isRadiant && !matchData.radiant_win)

  // Collect all final items (inventory + backpack + neutral)
  const allFinalItems = [
    targetPlayer.item_0,
    targetPlayer.item_1,
    targetPlayer.item_2,
    targetPlayer.item_3,
    targetPlayer.item_4,
    targetPlayer.item_5,
    targetPlayer.backpack_0,
    targetPlayer.backpack_1,
    targetPlayer.backpack_2,
    targetPlayer.item_neutral,
  ].filter((item): item is number => item !== undefined && item !== 0)

  // Extract enemy players for item recommendation analysis
  const enemyPlayers = matchData.players
    .filter((p: any) => isRadiantPlayer(p.player_slot) !== isRadiant)
    .map((p: any) => ({
      hero_id: p.hero_id,
      hero_damage: p.hero_damage,
      kills: p.kills,
    }))
  console.log(`👥 Extracted ${enemyPlayers.length} enemy players for item recommendations`)

  const itemBuildAnalysis = await analyzeItemBuild(
    heroName,
    detectedRole,
    allFinalItems,
    getGameModeName(matchData.game_mode),
    matchData.duration,
    playerWon,
    {
      kills: targetPlayer.kills,
      deaths: targetPlayer.deaths,
      gpm: targetPlayer.gold_per_min,
      netWorth: targetPlayer.net_worth,
    },
    enemyPlayers  // Pass enemy data for AI recommendations
  )

  // Get full purchase history with display names
  const purchaseLog = targetPlayer.purchase_log || []
  const purchaseHistory = await getItemNamesFromPurchaseLog(purchaseLog)

  // Get display names for final items (from API, not static mapping)
  const finalItemNames = await getItemNamesFromIds(allFinalItems)

  // Extract key moments for replay highlights
  const keyMomentsAnalysis = await extractKeyMoments(matchData, targetPlayer.account_id)

  // Combine all insights including item build insights
  // Transform item build insights to match the Insight interface
  const itemBuildInsights = itemBuildAnalysis.insights.map(insight => {
    const mappedInsight: any = {
      insightType: (insight.severity === 'critical' || insight.severity === 'important') ? 'mistake' : 'missed_opportunity',
      category: 'itemization',
      severity: insight.severity === 'critical' ? 'critical' : insight.severity === 'important' ? 'high' : 'medium',
      title: insight.category,
      description: insight.message,
      recommendation: insight.recommendation || '',
    }
    return mappedInsight
  })

  const combinedInsights: any[] = [...allInsights, ...itemBuildInsights]
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
      items: finalItemNames, // Use API-resolved names for final items
      score: itemBuildAnalysis.itemScore,
      keyIssues: itemBuildAnalysis.keyIssues,
      positives: itemBuildAnalysis.positives,
      purchaseHistory: purchaseHistory, // Full list of items purchased during the match
      recommendations: itemBuildAnalysis.recommendations, // AI-powered recommendations when score < 60
      _debug: itemBuildAnalysis._debug, // Temporary debug info
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
    aiInsights: insightsWithIds,
    aiSummary: summary,
    aiKeyMoments: {
      moments: keyMomentsAnalysis.moments,
      topMoments: keyMomentsAnalysis.topMoments,
      deepLink: generateReplayDeepLink(matchId),
      openDotaLink: generateOpenDotaLink(matchId),
    },
    startTime: matchData.start_time, // Unix timestamp for session analysis
    // Item build data
    finalItems: allFinalItems,
    purchaseHistory: purchaseHistory,
    itemBuildAnalysis: {
      items: finalItemNames,
      score: itemBuildAnalysis.itemScore,
      keyIssues: itemBuildAnalysis.keyIssues,
      positives: itemBuildAnalysis.positives,
    },
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
