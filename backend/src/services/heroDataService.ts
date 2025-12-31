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
