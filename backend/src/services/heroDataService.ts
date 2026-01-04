// Hero data service - comprehensive hero mapping
import axios from 'axios'

const OPENDOTA_API_BASE = 'https://api.opendota.com/api'

interface HeroData {
  id: number
  name: string  // e.g., "npc_dota_hero_antimage"
  localized_name: string  // e.g., "Anti-Mage"
  roles: string[]  // e.g., ["Carry", "Escape", "Nuker"]
}

// In-memory cache for hero data
let heroCache: Map<number, { name: string; localized_name: string; short_name: string; roles: string[] }> | null = null

export async function initializeHeroData(): Promise<void> {
  if (heroCache) {
    return // Already initialized
  }

  try {
    console.log('Fetching hero data from OpenDota...')
    const response = await axios.get<HeroData[]>(`${OPENDOTA_API_BASE}/heroes`)

    heroCache = new Map()
    response.data.forEach((hero) => {
      // Extract short name from "npc_dota_hero_antimage" -> "antimage"
      const shortName = hero.name.replace('npc_dota_hero_', '')
      heroCache!.set(hero.id, {
        name: hero.name,
        localized_name: hero.localized_name,
        short_name: shortName,
        roles: hero.roles || [],
      })
    })

    console.log(`✓ Loaded ${heroCache.size} heroes`)
  } catch (error) {
    console.error('Error fetching hero data:', error)
    // Initialize empty cache to prevent repeated failed requests
    heroCache = new Map()
  }
}

export function getHeroName(heroId: number): string {
  if (!heroCache) {
    return `Hero ${heroId}`
  }

  const hero = heroCache.get(heroId)
  return hero ? hero.localized_name : `Hero ${heroId}`
}

export function getHeroShortName(heroId: number): string {
  if (!heroCache) {
    return 'default'
  }

  const hero = heroCache.get(heroId)
  return hero ? hero.short_name : 'default'
}

export function getHeroImageUrl(heroId: number): string {
  const shortName = getHeroShortName(heroId)
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${shortName}.png`
}

export function getHeroRoles(heroId: number): string[] {
  if (!heroCache) {
    return []
  }

  const hero = heroCache.get(heroId)
  return hero ? hero.roles : []
}

export function getAllHeroes(): { id: number; name: string; image: string }[] {
  if (!heroCache) {
    return []
  }

  return Array.from(heroCache.entries()).map(([id, hero]) => ({
    id,
    name: hero.localized_name,
    image: getHeroImageUrl(id),
  }))
}

/**
 * Determines if a hero is primarily a Support or Core based on OpenDota role data.
 * Returns 'Support', 'Core', or 'Flexible' for heroes that can play both.
 */
export function getHeroPrimaryRole(heroId: number): 'Support' | 'Core' | 'Flexible' {
  const roles = getHeroRoles(heroId)

  if (roles.length === 0) {
    return 'Flexible' // No data, use stats to determine
  }

  const hasSupport = roles.includes('Support')
  const hasCarry = roles.includes('Carry')

  // Clear support heroes (Support tag, no Carry tag)
  // e.g., Crystal Maiden, Witch Doctor, Lion, Shadow Shaman
  if (hasSupport && !hasCarry) {
    return 'Support'
  }

  // Clear carry/core heroes (Carry tag, no Support tag)
  // e.g., Anti-Mage, Phantom Assassin, Juggernaut
  if (hasCarry && !hasSupport) {
    return 'Core'
  }

  // Heroes with both tags are flexible (rare)
  if (hasCarry && hasSupport) {
    return 'Flexible'
  }

  // Heroes without Carry or Support tags - check other indicators
  // Nuker/Disabler/Initiator without Support = likely mid/offlane core
  // e.g., Puck, Magnus, Tidehunter
  const coreIndicators = ['Nuker', 'Initiator', 'Durable', 'Pusher', 'Escape']
  const hasCoreIndicator = coreIndicators.some(role => roles.includes(role))

  if (hasCoreIndicator) {
    return 'Flexible' // Could be core or support depending on how played
  }

  return 'Flexible'
}

/**
 * Smart role detection that combines hero type with gameplay stats.
 * This is the primary function to use for detecting player role.
 */
export function detectPlayerRole(
  heroId: number,
  stats: {
    goldPerMin: number
    lastHits: number
    duration: number // in seconds
    obsPlaced?: number
    senPlaced?: number
  }
): 'Core' | 'Support' {
  const heroPrimaryRole = getHeroPrimaryRole(heroId)

  // If hero is clearly a support (Witch Doctor, CM, Lion, etc.), return Support
  // unless they have truly exceptional core-like stats
  if (heroPrimaryRole === 'Support') {
    // Only override if stats are EXTREMELY core-like (pos 1/2 levels)
    const isPlayingAsHardCore = stats.goldPerMin > 550 &&
      (stats.lastHits / (stats.duration / 60)) > 6

    return isPlayingAsHardCore ? 'Core' : 'Support'
  }

  // If hero is clearly a core (AM, PA, Jugg, etc.), return Core
  // unless they have truly support-like stats
  if (heroPrimaryRole === 'Core') {
    // Only override if stats are EXTREMELY support-like
    const wardsPlaced = (stats.obsPlaced || 0) + (stats.senPlaced || 0)
    const isPlayingAsHardSupport = stats.goldPerMin < 300 &&
      wardsPlaced > 5 &&
      (stats.lastHits / (stats.duration / 60)) < 2

    return isPlayingAsHardSupport ? 'Support' : 'Core'
  }

  // Flexible heroes - use stats to determine
  const csPerMin = stats.lastHits / (stats.duration / 60)
  const wardsPlaced = (stats.obsPlaced || 0) + (stats.senPlaced || 0)

  // Support indicators for flexible heroes
  const supportScore =
    (stats.goldPerMin < 350 ? 2 : 0) +
    (csPerMin < 3 ? 2 : 0) +
    (wardsPlaced > 3 ? 2 : 0) +
    (wardsPlaced > 8 ? 1 : 0)

  // Core indicators for flexible heroes
  const coreScore =
    (stats.goldPerMin > 450 ? 2 : 0) +
    (csPerMin > 5 ? 2 : 0) +
    (stats.lastHits > 150 ? 1 : 0)

  return supportScore > coreScore ? 'Support' : 'Core'
}
