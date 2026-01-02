// Service for fetching and backfilling player match history from OpenDota
import axios from 'axios'
import { saveMatchAnalysis } from './databaseService.js'
import { getPlayerHeroName, getGameModeName, isRadiantPlayer } from './openDotaService.js'
import { getHeroImageUrl } from './heroDataService.js'
import { updateHeroStatistics } from './heroStatisticsService.js'

const OPENDOTA_API_BASE = 'https://api.opendota.com/api'

interface OpenDotaRecentMatch {
  match_id: number
  player_slot: number
  radiant_win: boolean
  duration: number
  game_mode: number
  lobby_type: number
  hero_id: number
  start_time: number
  kills: number
  deaths: number
  assists: number
  skill?: number
  leaver_status?: number
  party_size?: number
}

/**
 * Fetch recent matches from OpenDota for a player
 */
export async function fetchRecentMatches(accountId: number, limit: number = 20): Promise<OpenDotaRecentMatch[]> {
  try {
    console.log(`Fetching last ${limit} matches for account ${accountId} from OpenDota...`)

    const config: any = {
      headers: {
        'User-Agent': 'Dota2CoachAnalyzer/1.0',
        'Accept': 'application/json',
      },
      timeout: 15000,
    }

    // Add API key if available
    const apiKey = process.env.OPENDOTA_API_KEY
    if (apiKey && apiKey.trim()) {
      config.params = { api_key: apiKey }
    }

    const response = await axios.get(
      `${OPENDOTA_API_BASE}/players/${accountId}/recentMatches`,
      config
    )

    if (response.status === 200 && response.data) {
      const matches = response.data.slice(0, limit)
      console.log(`✓ Fetched ${matches.length} recent matches for account ${accountId}`)
      return matches
    }

    return []
  } catch (error: any) {
    console.error(`Error fetching recent matches for account ${accountId}:`, error.message)
    return []
  }
}

/**
 * Fetch detailed match data from OpenDota
 */
async function fetchMatchDetails(matchId: number): Promise<any | null> {
  try {
    const config: any = {
      headers: {
        'User-Agent': 'Dota2CoachAnalyzer/1.0',
        'Accept': 'application/json',
      },
      timeout: 10000,
    }

    const apiKey = process.env.OPENDOTA_API_KEY
    if (apiKey && apiKey.trim()) {
      config.params = { api_key: apiKey }
    }

    const response = await axios.get(`${OPENDOTA_API_BASE}/matches/${matchId}`, config)
    return response.status === 200 ? response.data : null
  } catch (error) {
    console.error(`Error fetching match ${matchId}:`, error)
    return null
  }
}

/**
 * Backfill user's match history from OpenDota into database
 * This fetches recent matches and saves them with full stats
 */
export async function backfillUserMatches(
  userId: string,
  accountId: number,
  limit: number = 20
): Promise<{ success: boolean; matchesBackfilled: number; errors: number }> {
  console.log(`🔄 Starting backfill for user ${userId} (account ${accountId})...`)

  const recentMatches = await fetchRecentMatches(accountId, limit)

  if (recentMatches.length === 0) {
    console.log('No matches found to backfill')
    return { success: true, matchesBackfilled: 0, errors: 0 }
  }

  let successCount = 0
  let errorCount = 0

  for (const match of recentMatches) {
    try {
      // Get detailed match data
      const matchDetails = await fetchMatchDetails(match.match_id)

      if (!matchDetails) {
        console.log(`Skipping match ${match.match_id} - could not fetch details`)
        errorCount++
        continue
      }

      // Find the player's data in the detailed match
      const playerData = matchDetails.players?.find((p: any) => p.account_id === accountId)

      if (!playerData) {
        console.log(`Skipping match ${match.match_id} - player data not found`)
        errorCount++
        continue
      }

      const isRadiant = isRadiantPlayer(playerData.player_slot)
      const heroName = await getPlayerHeroName(playerData.hero_id)
      const playerWon = (isRadiant && matchDetails.radiant_win) || (!isRadiant && !matchDetails.radiant_win)

      // Detect role based on stats
      const detectedRole = detectRole(playerData)

      // Save to database
      await saveMatchAnalysis({
        matchId: match.match_id.toString(),
        userId,
        accountId,
        heroName,
        heroId: playerData.hero_id,
        heroImage: getHeroImageUrl(playerData.hero_id),
        playerSlot: playerData.player_slot,
        team: isRadiant ? 'radiant' : 'dire',
        detectedRole,
        kills: playerData.kills || 0,
        deaths: playerData.deaths || 0,
        assists: playerData.assists || 0,
        lastHits: playerData.last_hits || 0,
        denies: playerData.denies || 0,
        goldPerMin: playerData.gold_per_min || 0,
        xpPerMin: playerData.xp_per_min || 0,
        heroDamage: playerData.hero_damage || 0,
        towerDamage: playerData.tower_damage || 0,
        heroHealing: playerData.hero_healing || 0,
        netWorth: playerData.net_worth || 0,
        level: playerData.level || 0,
        obsPlaced: playerData.obs_placed || 0,
        senPlaced: playerData.sen_placed || 0,
        campsStacked: playerData.camps_stacked || 0,
        gameMode: getGameModeName(matchDetails.game_mode),
        duration: matchDetails.duration,
        radiantWin: matchDetails.radiant_win,
        won: playerWon,
      })

      // Update hero statistics
      await updateHeroStatistics({
        heroName,
        heroId: playerData.hero_id,
        duration: matchDetails.duration,
        gpm: playerData.gold_per_min || 0,
        xpm: playerData.xp_per_min || 0,
        lastHits: playerData.last_hits || 0,
        denies: playerData.denies || 0,
        kills: playerData.kills || 0,
        deaths: playerData.deaths || 0,
        assists: playerData.assists || 0,
        heroDamage: playerData.hero_damage || 0,
        towerDamage: playerData.tower_damage || 0,
        heroHealing: playerData.hero_healing || 0,
        observerWardsPlaced: playerData.obs_placed || 0,
        sentryWardsPlaced: playerData.sen_placed || 0,
        campsStacked: playerData.camps_stacked || 0,
      })

      successCount++
      console.log(`✓ Backfilled match ${match.match_id} (${successCount}/${recentMatches.length})`)

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))

    } catch (error: any) {
      console.error(`Error backfilling match ${match.match_id}:`, error.message)
      errorCount++
    }
  }

  console.log(`✅ Backfill complete: ${successCount} matches saved, ${errorCount} errors`)
  return { success: true, matchesBackfilled: successCount, errors: errorCount }
}

/**
 * Simple role detection based on stats
 */
function detectRole(playerData: any): string {
  const gpm = playerData.gold_per_min || 0
  const obsPlaced = playerData.obs_placed || 0
  const senPlaced = playerData.sen_placed || 0

  // Support indicators: low GPM and ward placement
  if ((obsPlaced > 0 || senPlaced > 0) && gpm < 400) {
    return 'Support'
  }

  // Core: high GPM
  if (gpm >= 400) {
    return 'Core'
  }

  // Default to Core for ambiguous cases
  return 'Core'
}
