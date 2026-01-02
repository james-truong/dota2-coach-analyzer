import axios from 'axios'
import { DEMO_MATCH_DATA, isDemoMatchId } from './demoDataService.js'

const OPENDOTA_API_BASE = 'https://api.opendota.com/api'

interface OpenDotaMatch {
  match_id: number
  duration: number
  game_mode: number
  lobby_type: number
  radiant_win: boolean
  start_time: number
  players: OpenDotaPlayer[]
}

interface OpenDotaPlayer {
  account_id: number
  player_slot: number
  hero_id: number
  kills: number
  deaths: number
  assists: number
  last_hits: number
  denies: number
  gold_per_min: number
  xp_per_min: number
  level: number
  hero_damage: number
  tower_damage: number
  hero_healing: number
  net_worth: number
  obs_placed?: number
  sen_placed?: number
  observer_kills?: number
  camps_stacked?: number
  runes_picked_up?: number
  stuns?: number
  item_0?: number
  item_1?: number
  item_2?: number
  item_3?: number
  item_4?: number
  item_5?: number
  lane_role?: number
}

export async function fetchMatchFromOpenDota(matchId: string, retryCount: number = 0): Promise<OpenDotaMatch | null> {
  // Check if demo mode is requested
  if (isDemoMatchId(matchId)) {
    console.log('Using DEMO match data (bypassing OpenDota API)')
    return DEMO_MATCH_DATA as OpenDotaMatch
  }

  try {
    console.log(`Fetching match ${matchId} from OpenDota API${retryCount > 0 ? ` (retry ${retryCount}/3)` : ''}...`)

    // Build request config with headers
    const config: any = {
      headers: {
        'User-Agent': 'Dota2CoachAnalyzer/1.0',
        'Accept': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    }

    // Add API key if available (higher rate limits)
    const apiKey = process.env.OPENDOTA_API_KEY
    if (apiKey && apiKey.trim()) {
      config.params = { api_key: apiKey }
      if (retryCount === 0) {
        console.log('Using OpenDota API key for higher rate limits')
      }
    } else {
      if (retryCount === 0) {
        console.log('No API key - using anonymous access (limited rate)')
      }
    }

    const response = await axios.get(`${OPENDOTA_API_BASE}/matches/${matchId}`, config)

    if (response.status === 200 && response.data) {
      console.log(`Successfully fetched match ${matchId}`)
      return response.data
    }

    return null
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.error(`Match ${matchId} not found on OpenDota`)
      return null
    }
    if (error.response?.status === 403 || error.response?.status === 429) {
      // Rate limited - retry with exponential backoff
      if (retryCount < 3) {
        const delayMs = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
        console.warn(`⏳ Rate limited by OpenDota. Retrying in ${delayMs}ms...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
        return fetchMatchFromOpenDota(matchId, retryCount + 1)
      }

      console.error(`❌ Rate limited for match ${matchId} after 3 retries.`)
      console.error('🎮 TIP: Use "DEMO" as the Match ID to test with sample data!')
      console.error('Or wait a few minutes before trying again.')
      throw new Error('Rate limit exceeded - please try again later')
    }
    // For any other error, log it but return null instead of throwing
    console.error('Error fetching from OpenDota:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
    }
    return null
  }
}

export async function getPlayerHeroName(heroId: number): Promise<string> {
  // Import at runtime to avoid circular dependency
  const { getHeroName } = await import('./heroDataService.js')
  return getHeroName(heroId)
}

// Cache for hero data to avoid repeated API calls
let heroDataCache: any = null

export async function fetchHeroConstants(): Promise<any> {
  if (heroDataCache) {
    return heroDataCache
  }

  try {
    const response = await axios.get(`${OPENDOTA_API_BASE}/constants/heroes`)
    heroDataCache = response.data
    return response.data
  } catch (error) {
    console.error('Error fetching hero constants:', error)
    return {}
  }
}

export function getGameModeName(gameModeId: number): string {
  const gameModes: { [key: number]: string } = {
    0: 'Unknown',
    1: 'All Pick',
    2: 'Captains Mode',
    3: 'Random Draft',
    4: 'Single Draft',
    5: 'All Random',
    6: 'Intro',
    7: 'Diretide',
    8: 'Reverse Captains Mode',
    9: 'Greeviling',
    10: 'Tutorial',
    11: 'Mid Only',
    12: 'Least Played',
    13: 'Limited Heroes',
    14: 'Compendium Matchmaking',
    15: 'Custom',
    16: 'Captains Draft',
    17: 'Balanced Draft',
    18: 'Ability Draft',
    19: 'Event',
    20: 'All Random Deathmatch',
    21: '1v1 Mid',
    22: 'All Pick',
    23: 'Turbo',
  }

  return gameModes[gameModeId] || 'Unknown'
}

export function getLobbyTypeName(lobbyTypeId: number): string {
  const lobbyTypes: { [key: number]: string } = {
    0: 'Normal',
    1: 'Practice',
    2: 'Tournament',
    3: 'Tutorial',
    4: 'Co-op Bots',
    5: 'Team Match',
    6: 'Solo Queue',
    7: 'Ranked',
    8: 'Solo Mid',
    9: 'Battle Cup',
  }

  return lobbyTypes[lobbyTypeId] || 'Normal'
}

export function isRadiantPlayer(playerSlot: number): boolean {
  // Player slots 0-4 are Radiant, 128-132 are Dire
  return playerSlot < 128
}

// Cache to prevent duplicate parse requests in the same session
const parseRequestCache = new Set<string>()

export async function requestMatchParsing(matchId: string): Promise<{ success: boolean; message: string; job_id?: number }> {
  // Check if we already requested parsing for this match
  if (parseRequestCache.has(matchId)) {
    console.log(`Parse already requested for match ${matchId} in this session - skipping duplicate request`)
    return {
      success: true,
      message: 'Parse request already submitted in this session'
    }
  }

  try {
    console.log(`Requesting parsing for match ${matchId}...`)

    const config: any = {
      headers: {
        'User-Agent': 'Dota2CoachAnalyzer/1.0',
        'Accept': 'application/json',
      },
      timeout: 10000,
    }

    // Add API key if available
    const apiKey = process.env.OPENDOTA_API_KEY
    if (apiKey && apiKey.trim()) {
      config.params = { api_key: apiKey }
    }

    const response = await axios.post(`${OPENDOTA_API_BASE}/request/${matchId}`, {}, config)

    if (response.status === 200 && response.data) {
      console.log(`Parse request submitted for match ${matchId}. Job ID: ${response.data.job?.jobId || 'unknown'}`)

      // Add to cache to prevent duplicate requests
      parseRequestCache.add(matchId)

      return {
        success: true,
        message: 'Match parsing requested successfully',
        job_id: response.data.job?.jobId
      }
    }

    return {
      success: false,
      message: 'Failed to request match parsing'
    }
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.error('Rate limited when requesting parse')
      return {
        success: false,
        message: 'Rate limited. Please wait a few minutes before requesting parsing again.'
      }
    }
    console.error('Error requesting match parsing:', error.message)
    return {
      success: false,
      message: error.response?.data?.error || 'Failed to request match parsing'
    }
  }
}

export function hasTimelineData(matchData: any): boolean {
  if (!matchData) return false

  // Check if match has been parsed (version field exists)
  if (!matchData.version) return false

  // Check if at least one of the timeline data sources exists
  const hasTeamfights = matchData.teamfights && matchData.teamfights.length > 0
  const hasPlayerTimeline = matchData.players && matchData.players.length > 0 &&
    (matchData.players[0].lh_t && matchData.players[0].lh_t.length > 0)

  return hasTeamfights || hasPlayerTimeline
}

// Fetch player's recent matches from OpenDota
export async function fetchPlayerMatches(accountId: number, limit: number = 20): Promise<any[]> {
  try {
    console.log(`Fetching recent matches for account ID ${accountId}...`)

    const config: any = {
      headers: {
        'User-Agent': 'Dota2CoachAnalyzer/1.0',
        'Accept': 'application/json',
      },
      timeout: 10000,
      params: {
        limit,
      },
    }

    // Add API key if available
    const apiKey = process.env.OPENDOTA_API_KEY
    if (apiKey && apiKey.trim()) {
      config.params.api_key = apiKey
    }

    const response = await axios.get(
      `${OPENDOTA_API_BASE}/players/${accountId}/matches`,
      config
    )

    if (response.status === 200 && response.data) {
      console.log(`Successfully fetched ${response.data.length} matches for account ${accountId}`)
      return response.data
    }

    return []
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.error(`Player ${accountId} not found on OpenDota`)
      return []
    }
    if (error.response?.status === 429) {
      console.error('Rate limited when fetching player matches')
      return []
    }
    console.error('Error fetching player matches:', error.message)
    return []
  }
}
