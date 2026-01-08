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
 *
 * Key insight: The "Carry" tag means the hero is designed to farm and scale.
 * Heroes with Carry tag should be treated as Core even if they also have Support tag
 * (e.g., Wraith King has Support tag for his aura/stun, but is played as pos 1/3).
 */
export function getHeroPrimaryRole(heroId: number): 'Support' | 'Core' | 'Flexible' {
  const roles = getHeroRoles(heroId)

  if (roles.length === 0) {
    return 'Flexible' // No data, use stats to determine
  }

  const hasSupport = roles.includes('Support')
  const hasCarry = roles.includes('Carry')

  // Any hero with Carry tag is a core hero - they're designed to farm and scale
  // e.g., Anti-Mage, Phantom Assassin, Juggernaut, Wraith King
  // Even if they have Support tag (like WK), they're played as cores
  if (hasCarry) {
    return 'Core'
  }

  // Pure support heroes (Support tag, no Carry tag)
  // e.g., Crystal Maiden, Witch Doctor, Lion, Shadow Shaman
  if (hasSupport) {
    return 'Support'
  }

  // Heroes without Carry or Support tags - these are flexible
  // e.g., Puck, Magnus, Tidehunter, Mars - can be played as core or support
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

/**
 * Detailed role type that distinguishes between core positions
 */
export type DetailedRole = 'Carry' | 'Mid' | 'Offlane' | 'Support'

/**
 * Check if a hero has offlane-style characteristics based on their role tags.
 * Offlane heroes typically have Initiator, Durable, or Disabler tags.
 */
export function isOfflaneStyleHero(heroId: number): boolean {
  const roles = getHeroRoles(heroId)

  // Heroes with these tags are typically played as offlaners
  const offlaneIndicators = ['Initiator', 'Durable']
  const hasOfflaneTag = offlaneIndicators.some(tag => roles.includes(tag))

  // Pure carries are less likely to be offlaners even with Durable tag
  const hasCarry = roles.includes('Carry')
  const hasEscape = roles.includes('Escape')

  // Heroes like Tidehunter, Mars, Centaur, Bristleback, Axe have Initiator/Durable
  // Heroes like AM, PA have Carry + Escape - these are safelane carries
  if (hasOfflaneTag && !hasEscape) {
    return true
  }

  // Some heroes with Carry + Durable are offlaners (like Bristleback, Centaur)
  // But we'll rely more on lane_role for these edge cases
  return hasOfflaneTag && !hasCarry
}

/**
 * Detailed role detection that distinguishes between Carry, Mid, Offlane, and Support.
 * Uses lane_role from OpenDota as primary signal, with hero tags and stats as fallback.
 *
 * @param heroId - The hero ID
 * @param laneRole - OpenDota lane_role (1=Safe, 2=Mid, 3=Off, 4=Jungle)
 * @param stats - Player stats for fallback detection
 * @returns DetailedRole - 'Carry' | 'Mid' | 'Offlane' | 'Support'
 */
export function detectDetailedRole(
  heroId: number,
  laneRole: number | null | undefined,
  stats: {
    goldPerMin: number
    lastHits: number
    duration: number // in seconds
    obsPlaced?: number
    senPlaced?: number
    kills?: number
    assists?: number
    teamKills?: number // Total kills by player's team
  }
): DetailedRole {
  // First, determine if they're playing Core or Support using existing logic
  const baseRole = detectPlayerRole(heroId, stats)

  // If Support, return Support (no further distinction needed for now)
  if (baseRole === 'Support') {
    return 'Support'
  }

  // For Core players, determine specific position
  // Primary signal: lane_role from OpenDota (most reliable)
  if (laneRole !== null && laneRole !== undefined) {
    switch (laneRole) {
      case 1: // Safe lane
        return 'Carry'
      case 2: // Mid lane
        return 'Mid'
      case 3: // Off lane
        return 'Offlane'
      case 4: // Jungle - treat as offlane/utility core
        return 'Offlane'
    }
  }

  // Fallback: Use hero characteristics and stats
  const heroPrimaryRole = getHeroPrimaryRole(heroId)
  const isOfflaneHero = isOfflaneStyleHero(heroId)

  // If hero has strong offlane characteristics, likely offlane
  if (isOfflaneHero) {
    return 'Offlane'
  }

  // Use stats to distinguish Carry vs Mid
  // Carries typically have higher GPM and CS
  // Mids have more balanced stats, often higher XPM relative to GPM
  const csPerMin = stats.lastHits / (stats.duration / 60)

  // High farming stats suggest Carry
  if (stats.goldPerMin > 550 && csPerMin > 7) {
    return 'Carry'
  }

  // Kill participation can indicate Mid (tempo) vs Carry (farming)
  if (stats.kills !== undefined && stats.assists !== undefined && stats.teamKills !== undefined && stats.teamKills > 0) {
    const killParticipation = (stats.kills + stats.assists) / stats.teamKills
    // High kill participation with moderate farm suggests Mid/tempo player
    if (killParticipation > 0.6 && stats.goldPerMin < 550) {
      return 'Mid'
    }
  }

  // Moderate farm with offlane-style hero → Offlane
  if (stats.goldPerMin < 500 && csPerMin < 6) {
    // Check if hero leans toward initiation
    const roles = getHeroRoles(heroId)
    if (roles.includes('Initiator') || roles.includes('Durable') || roles.includes('Disabler')) {
      return 'Offlane'
    }
  }

  // Default to Carry for high-farm cores
  if (stats.goldPerMin > 500 || csPerMin > 6) {
    return 'Carry'
  }

  // Default fallback for uncertain cases - use hero type
  if (heroPrimaryRole === 'Core') {
    // True carry heroes default to Carry
    const roles = getHeroRoles(heroId)
    if (roles.includes('Carry') && roles.includes('Escape')) {
      return 'Carry'
    }
  }

  // Final fallback: Mid (balanced core)
  return 'Mid'
}
