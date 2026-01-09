// Item build analysis and recommendations service
import axios from 'axios'
import Anthropic from '@anthropic-ai/sdk'
import { getHeroName, getHeroRoles } from './heroDataService.js'

const OPENDOTA_API_BASE = 'https://api.opendota.com/api'

// Lazy initialize Anthropic client
let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return anthropicClient
}

// Cache for item data from OpenDota API
let itemDataCache: Record<string, { id: number; dname: string; img: string }> | null = null
let itemIdToNameCache: Record<number, string> | null = null

/**
 * Fetch item constants from OpenDota and cache them
 */
async function fetchItemConstants(): Promise<Record<string, { id: number; dname: string; img: string }>> {
  if (itemDataCache) {
    return itemDataCache
  }

  try {
    const response = await axios.get(`${OPENDOTA_API_BASE}/constants/items`)
    itemDataCache = response.data

    // Build ID to name mapping
    itemIdToNameCache = {}
    for (const [, item] of Object.entries(itemDataCache!)) {
      if (item.id && item.dname) {
        itemIdToNameCache[item.id] = item.dname
      }
    }

    console.log(`✓ Loaded ${Object.keys(itemDataCache!).length} items from OpenDota`)
    return itemDataCache!
  } catch (error) {
    console.error('Error fetching item constants:', error)
    return {}
  }
}

/**
 * Get item display name from item ID
 */
export async function getItemNameById(itemId: number): Promise<string> {
  await fetchItemConstants() // Ensure cache is loaded
  if (itemIdToNameCache && itemIdToNameCache[itemId]) {
    return itemIdToNameCache[itemId]
  }
  // Fallback to static mapping
  return ITEM_NAMES[itemId] || `Unknown Item (${itemId})`
}

/**
 * Get item display names from item IDs
 */
export async function getItemNamesFromIds(itemIds: number[]): Promise<string[]> {
  await fetchItemConstants() // Ensure cache is loaded
  return itemIds.map(id => {
    if (itemIdToNameCache && itemIdToNameCache[id]) {
      return itemIdToNameCache[id]
    }
    return ITEM_NAMES[id] || `Unknown Item (${id})`
  })
}

/**
 * Get item display name from item key (e.g., "bfury" -> "Battle Fury")
 */
export async function getItemDisplayName(itemKey: string): Promise<string> {
  const items = await fetchItemConstants()
  const item = items[itemKey]
  if (item) {
    return item.dname
  }
  // Fallback: convert key to readable name
  return itemKey.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

/**
 * Get item display names from purchase log
 */
export async function getItemNamesFromPurchaseLog(
  purchaseLog: Array<{ time: number; key: string }>
): Promise<Array<{ time: number; name: string; key: string }>> {
  const items = await fetchItemConstants()

  return purchaseLog.map(entry => ({
    time: entry.time,
    key: entry.key,
    name: items[entry.key]?.dname || entry.key.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }))
}

// Item ID to name mapping (common items) - fallback for when API is unavailable
const ITEM_NAMES: Record<number, string> = {
  1: 'Blink Dagger',
  2: 'Blades of Attack',
  3: 'Broadsword',
  4: 'Chainmail',
  5: 'Claymore',
  6: 'Helm of Iron Will',
  7: 'Javelin',
  8: 'Mithril Hammer',
  9: 'Platemail',
  10: 'Quarterstaff',
  11: 'Quelling Blade',
  12: 'Ring of Protection',
  13: 'Gauntlets of Strength',
  14: 'Slippers of Agility',
  15: 'Mantle of Intelligence',
  16: 'Iron Branch',
  17: 'Belt of Strength',
  18: 'Band of Elvenskin',
  19: 'Robe of the Magi',
  20: 'Circlet',
  21: 'Ogre Axe',
  22: 'Blade of Alacrity',
  23: 'Staff of Wizardry',
  25: 'Ultimate Orb',
  26: 'Gloves of Haste',
  27: 'Morbid Mask',
  29: 'Boots of Speed',
  30: 'Gem of True Sight',
  31: 'Cloak',
  32: 'Talisman of Evasion',
  33: 'Cheese',
  34: 'Magic Stick',
  36: 'Ring of Regen',
  37: 'Ring of Health',
  38: 'Void Stone',
  39: 'Mystic Staff',
  40: 'Energy Booster',
  41: 'Point Booster',
  42: 'Vitality Booster',
  43: 'Power Treads',
  44: 'Hand of Midas',
  45: 'Oblivion Staff',
  46: 'Perseverance',
  47: 'Poor Man\'s Shield',
  48: 'Phase Boots',
  50: 'Demon Edge',
  51: 'Eagle Song',
  52: 'Reaver',
  53: 'Relic',
  54: 'Hyperstone',
  55: 'Ring of Basilius',
  56: 'Headdress',
  57: 'Scythe of Vyse',
  58: 'Monkey King Bar',
  59: 'Radiance',
  60: 'Butterfly',
  61: 'Daedalus',
  62: 'Skull Basher',
  63: 'Battle Fury',
  64: 'Manta Style',
  65: 'Crystalys',
  66: 'Armlet of Mordiggian',
  67: 'Shadow Blade',
  68: 'Sange and Yasha',
  69: 'Satanic',
  70: 'Mjollnir',
  71: 'Ethereal Blade',
  72: 'Aghanim\'s Scepter',
  73: 'Refresher Orb',
  74: 'Assault Cuirass',
  75: 'Heart of Tarrasque',
  76: 'Black King Bar',
  77: 'Aegis of the Immortal',
  79: 'Linken\'s Sphere',
  80: 'Vanguard',
  81: 'Blade Mail',
  82: 'Soul Ring',
  84: 'Arcane Boots',
  85: 'Heaven\'s Halberd',
  86: 'Ring of Aquila',
  88: 'Rod of Atos',
  90: 'Abyssal Blade',
  91: 'Bloodstone',
  92: 'Eul\'s Scepter of Divinity',
  96: 'Orchid Malevolence',
  98: 'Shiva\'s Guard',
  100: 'Bloodthorn',
  102: 'Drum of Endurance',
  104: 'Force Staff',
  105: 'Dagon',
  106: 'Necronomicon',
  108: 'Aghanim\'s Shard',
  109: 'Mekansm',
  110: 'Vladimir\'s Offering',
  112: 'Pipe of Insight',
  113: 'Urn of Shadows',
  114: 'Scythe of Vyse',
  116: 'Veil of Discord',
  117: 'Blade Mail',
  119: 'Helm of the Dominator',
  121: 'Diffusal Blade',
  122: 'Desolator',
  123: 'Guardian Greaves',
  125: 'Yasha',
  127: 'Mask of Madness',
  129: 'Maelstrom',
  131: 'Eye of Skadi',
  135: 'Glimmer Cape',
  139: 'Solar Crest',
  141: 'Aether Lens',
  147: 'Dragon Lance',
  151: 'Faerie Fire',
  154: 'Blight Stone',
  156: 'Tome of Knowledge',
  157: 'Infused Raindrop',
  158: 'Wind Lace',
  166: 'Echo Sabre',
  168: 'Glimmer Cape',
  172: 'Crimson Guard',
  178: 'Kaya',
  181: 'Hurricane Pike',
  182: 'Lotus Orb',
  185: 'Aeon Disk',
  190: 'Nullifier',
  196: 'Spirit Vessel',
  201: 'Meteor Hammer',
  204: 'Kaya and Sange',
  206: 'Yasha and Kaya',
  208: 'Trident',
  214: 'Helm of the Overlord',
  220: 'Overwhelming Blink',
  221: 'Swift Blink',
  222: 'Arcane Blink',
  223: 'Mage Slayer',
  226: 'Falcon Blade',
  229: 'Witch Blade',
  232: 'Gleipnir',
  235: 'Eternal Shroud',
  236: 'Wind Waker',
  242: 'Wraith Pact',
  249: 'Phylactery',
  250: 'Disperser',
  253: 'Khanda',
  257: 'Harpoon',
  259: 'Pavise',
  265: 'Boots of Bearing',
}

interface ItemBuildAnalysis {
  insights: Array<{
    category: string
    severity: 'critical' | 'important' | 'suggestion'
    message: string
    recommendation?: string
  }>
  finalItems: string[]
  itemScore: number // 0-100
  keyIssues: string[]
  positives: string[]
  recommendations?: BuildRecommendation  // AI-powered recommendations when score < 60
}

/**
 * Analyze player's item build and provide feedback
 */
export async function analyzeItemBuild(
  heroName: string,
  detectedRole: string,
  finalItems: number[],
  gameMode: string,
  duration: number,
  won: boolean,
  stats: {
    kills: number
    deaths: number
    gpm: number
    netWorth: number
  },
  enemyPlayers?: Array<{ hero_id: number; hero_damage?: number; kills?: number }>
): Promise<ItemBuildAnalysis> {
  // Use API-resolved item names for accurate analysis
  const itemNames = await getItemNamesFromIds(finalItems)
  const insights: ItemBuildAnalysis['insights'] = []
  const positives: string[] = []
  const keyIssues: string[] = []
  let itemScore = 70 // Base score

  // Check for essential items based on role
  // Handle both legacy 'Core' and detailed roles 'Carry', 'Mid', 'Offlane'
  const isCore = detectedRole === 'Core' || detectedRole === 'Carry' || detectedRole === 'Mid' || detectedRole === 'Offlane'
  if (isCore) {
    analyzeCoreItems(heroName, itemNames, duration, stats, insights, positives, keyIssues)
  } else {
    analyzeSupportItems(heroName, itemNames, duration, insights, positives, keyIssues)
  }

  // Check for BKB on cores (very important)
  if (isCore && duration > 25 * 60) {
    const hasBKB = itemNames.some(item => item.includes('Black King Bar'))
    if (!hasBKB) {
      insights.push({
        category: 'Survivability',
        severity: 'critical',
        message: 'Missing Black King Bar in a long game',
        recommendation: 'BKB is essential for most cores in team fights. Consider buying it to avoid getting locked down by stuns and magic damage.',
      })
      keyIssues.push('No BKB in 25+ min game')
      itemScore -= 15
    } else {
      positives.push('Built BKB for survivability')
      itemScore += 5
    }
  }

  // Check for mobility items
  const hasMobility = itemNames.some(item =>
    item.includes('Blink') || item.includes('Force Staff') || item.includes('Hurricane Pike')
  )
  if (!hasMobility && isCore) {
    insights.push({
      category: 'Mobility',
      severity: 'important',
      message: 'No mobility item detected',
      recommendation: 'Consider Blink Dagger, Force Staff, or Hurricane Pike for better positioning in fights.',
    })
    itemScore -= 8
  } else if (hasMobility) {
    positives.push('Good mobility item choice')
    itemScore += 3
  }

  // Check item slot efficiency (late game)
  if (duration > 35 * 60) {
    const hasBoots = itemNames.some(item => item.includes('Boots'))
    const lowValueItems = itemNames.filter(item =>
      item.includes('Wraith Band') || item.includes('Null Talisman') || item.includes('Bracer')
    )

    if (lowValueItems.length > 0) {
      insights.push({
        category: 'Item Efficiency',
        severity: 'suggestion',
        message: `Still carrying early-game items: ${lowValueItems.join(', ')}`,
        recommendation: 'In late game, consider selling early-game items to make room for more impactful items.',
      })
      itemScore -= 5
    }

    if (!hasBoots) {
      positives.push('Sold boots for extra item slot (late game)')
      itemScore += 5
    }
  }

  // Check for damage items on cores
  if (isCore) {
    const damageItems = itemNames.filter(item =>
      item.includes('Daedalus') || item.includes('Monkey King Bar') || item.includes('Butterfly') ||
      item.includes('Desolator') || item.includes('Bloodthorn') || item.includes('Mjollnir') ||
      item.includes('Radiance') || item.includes('Battle Fury')
    )

    if (damageItems.length === 0 && stats.netWorth > 15000) {
      insights.push({
        category: 'Damage Output',
        severity: 'critical',
        message: 'No major damage items despite high net worth',
        recommendation: 'Build damage items like Daedalus, MKB, or Butterfly to increase your impact in fights.',
      })
      keyIssues.push('No damage items')
      itemScore -= 12
    } else if (damageItems.length >= 2) {
      positives.push(`Good damage itemization: ${damageItems.join(', ')}`)
      itemScore += 8
    }
  }

  // Check for defensive items when dying a lot
  if (stats.deaths > 8) {
    const defensiveItems = itemNames.filter(item =>
      item.includes('BKB') || item.includes('Linken') || item.includes('Aeon Disk') ||
      item.includes('Lotus Orb') || item.includes('Heart') || item.includes('Skadi')
    )

    if (defensiveItems.length === 0) {
      insights.push({
        category: 'Survivability',
        severity: 'critical',
        message: `${stats.deaths} deaths with no defensive items`,
        recommendation: 'You\'re dying frequently. Consider BKB, Linken\'s Sphere, or Aeon Disk to stay alive longer in fights.',
      })
      keyIssues.push('High deaths, no defensive items')
      itemScore -= 15
    }
  }

  // Positive feedback for good GPM
  if (stats.gpm > 550 && isCore) {
    const farmItems = itemNames.filter(item =>
      item.includes('Battle Fury') || item.includes('Maelstrom') || item.includes('Mjollnir') ||
      item.includes('Radiance') || item.includes('Midas')
    )

    if (farmItems.length > 0) {
      positives.push(`Excellent farming with ${farmItems[0]}`)
      itemScore += 5
    }
  }

  // Cap score between 0-100
  itemScore = Math.max(0, Math.min(100, itemScore))

  // Generate AI-powered recommendations if score is poor (< 60) and enemy data available
  let recommendations: BuildRecommendation | undefined
  if (itemScore < 60 && enemyPlayers && enemyPlayers.length > 0) {
    try {
      const enemyThreats = await analyzeEnemyThreats(enemyPlayers)
      const aiRecommendations = await generateItemRecommendations(
        heroName,
        detectedRole,
        itemNames,
        enemyThreats,
        duration,
        itemScore,
        keyIssues
      )
      if (aiRecommendations) {
        recommendations = aiRecommendations
      }
    } catch (error) {
      console.error('Error generating item recommendations:', error)
    }
  }

  return {
    insights,
    finalItems: itemNames,
    itemScore,
    keyIssues,
    positives,
    recommendations,
  }
}

/**
 * Analyze core-specific item choices
 */
function analyzeCoreItems(
  heroName: string,
  items: string[],
  duration: number,
  stats: { gpm: number; netWorth: number },
  insights: ItemBuildAnalysis['insights'],
  positives: string[],
  keyIssues: string[]
): void {
  // Check for farming items if low GPM
  if (stats.gpm < 450 && duration > 20 * 60) {
    const hasFarmItem = items.some(item =>
      item.includes('Battle Fury') || item.includes('Maelstrom') || item.includes('Radiance')
    )

    if (!hasFarmItem) {
      insights.push({
        category: 'Farming',
        severity: 'important',
        message: 'Low GPM without farming accelerator',
        recommendation: 'Consider Battle Fury, Maelstrom, or Radiance to farm faster and catch up in net worth.',
      })
    }
  }

  // Check for Aghanim's Scepter
  if (items.some(item => item.includes('Scepter'))) {
    positives.push('Built Aghanim\'s Scepter for power spike')
  }

  // Check for luxury items in very long games
  if (duration > 40 * 60) {
    const luxuryItems = items.filter(item =>
      item.includes('Daedalus') || item.includes('Butterfly') || item.includes('Abyssal') ||
      item.includes('Bloodthorn') || item.includes('Skadi') || item.includes('Satanic')
    )

    if (luxuryItems.length >= 2) {
      positives.push('Strong late-game itemization')
    }
  }
}

/**
 * Analyze support-specific item choices
 */
function analyzeSupportItems(
  heroName: string,
  items: string[],
  duration: number,
  insights: ItemBuildAnalysis['insights'],
  positives: string[],
  keyIssues: string[]
): void {
  // Check for essential support items
  const hasGlimmer = items.some(item => item.includes('Glimmer'))
  const hasForceStaff = items.some(item => item.includes('Force Staff'))
  const hasMek = items.some(item => item.includes('Mekansm') || item.includes('Guardian Greaves'))
  const utilityItems = [hasGlimmer, hasForceStaff, hasMek].filter(Boolean).length

  if (utilityItems === 0) {
    insights.push({
      category: 'Utility',
      severity: 'critical',
      message: 'No utility items as support',
      recommendation: 'Build Glimmer Cape, Force Staff, or Mekansm to save teammates and provide utility in fights.',
    })
    keyIssues.push('No utility items')
  } else {
    positives.push(`Good support itemization (${utilityItems} utility items)`)
  }

  // Check for vision items
  if (items.some(item => item.includes('Gem'))) {
    positives.push('Bought Gem for vision control')
  }

  // Warn if building expensive carry items as support
  const carryItems = items.filter(item =>
    item.includes('Daedalus') || item.includes('Butterfly') || item.includes('Radiance') ||
    item.includes('Battle Fury') || item.includes('Monkey King Bar')
  )

  if (carryItems.length > 0) {
    insights.push({
      category: 'Role Understanding',
      severity: 'important',
      message: `Building carry items as support: ${carryItems.join(', ')}`,
      recommendation: 'As a support, focus on utility items that help your team rather than expensive damage items.',
    })
  }
}

/**
 * Get item name from ID
 */
export function getItemName(itemId: number): string {
  return ITEM_NAMES[itemId] || `Unknown Item (${itemId})`
}

/**
 * Get all item names from IDs
 */
export function getItemNames(itemIds: number[]): string[] {
  return itemIds
    .map(id => ITEM_NAMES[id])
    .filter((name): name is string => name !== undefined)
}

// ============== ITEM RECOMMENDATION SYSTEM ==============

/**
 * Enemy team threat analysis
 */
export interface EnemyThreats {
  highPhysical: string[]    // Heroes dealing high physical damage
  highMagical: string[]     // Heroes dealing high magic damage
  heavyDisable: string[]    // Heroes with stuns/silences/roots
  healers: string[]         // Heroes with healing abilities
  evasion: string[]         // Heroes that build evasion or have innate evasion
  invisibility: string[]    // Heroes with invisibility
}

/**
 * Item recommendation structure
 */
export interface ItemRecommendation {
  itemName: string
  priority: 'critical' | 'important' | 'situational'
  reason: string
  gameTime: string          // e.g., "12:00-15:00"
  buildOrder: number        // 1 = first core item
  counters: string[]        // Enemy heroes it counters
}

/**
 * Full build recommendation
 */
export interface BuildRecommendation {
  recommendations: ItemRecommendation[]
  enemyThreats: EnemyThreats
  buildPath: string         // e.g., "Boots → Blink → BKB → Shiva's"
}

/**
 * Enemy player data structure (minimal needed for analysis)
 */
interface EnemyPlayer {
  hero_id: number
  hero_damage?: number
  kills?: number
}

/**
 * Analyze enemy team composition to identify threats
 */
export async function analyzeEnemyThreats(enemyPlayers: EnemyPlayer[]): Promise<EnemyThreats> {
  const threats: EnemyThreats = {
    highPhysical: [],
    highMagical: [],
    heavyDisable: [],
    healers: [],
    evasion: [],
    invisibility: [],
  }

  for (const player of enemyPlayers) {
    const heroName = await getHeroName(player.hero_id)
    const roles = getHeroRoles(player.hero_id)

    // Physical damage dealers (Carry heroes, typically right-click based)
    if (roles.includes('Carry') || roles.includes('Pusher')) {
      threats.highPhysical.push(heroName)
    }

    // Magical damage dealers (Nuker heroes)
    if (roles.includes('Nuker')) {
      threats.highMagical.push(heroName)
    }

    // Disablers (stuns, silences, roots)
    if (roles.includes('Disabler')) {
      threats.heavyDisable.push(heroName)
    }

    // Healers and sustain
    const healerHeroes = ['Dazzle', 'Oracle', 'Witch Doctor', 'Omniknight', 'Chen', 'Enchantress', 'Io', 'Warlock', 'Necrophos', 'Abaddon']
    if (healerHeroes.some(h => heroName.includes(h))) {
      threats.healers.push(heroName)
    }

    // Evasion heroes
    const evasionHeroes = ['Phantom Assassin', 'Windranger', 'Brewmaster', 'Terrorblade']
    if (evasionHeroes.some(h => heroName.includes(h))) {
      threats.evasion.push(heroName)
    }

    // Invisibility heroes
    const inviHeroes = ['Riki', 'Bounty Hunter', 'Clinkz', 'Nyx Assassin', 'Weaver', 'Invoker', 'Sand King', 'Treant Protector']
    if (inviHeroes.some(h => heroName.includes(h))) {
      threats.invisibility.push(heroName)
    }
  }

  return threats
}

/**
 * Generate AI-powered item recommendations based on enemy team
 */
export async function generateItemRecommendations(
  heroName: string,
  role: string,
  currentItems: string[],
  enemyThreats: EnemyThreats,
  duration: number,
  itemScore: number,
  keyIssues: string[]
): Promise<BuildRecommendation | null> {
  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.trim() === '') {
    console.warn('⚠️  Anthropic API key not configured. Skipping item recommendations.')
    return null
  }

  try {
    const durationMinutes = Math.floor(duration / 60)

    const prompt = buildItemRecommendationPrompt(
      heroName,
      role,
      currentItems,
      enemyThreats,
      durationMinutes,
      itemScore,
      keyIssues
    )

    console.log('🛒 Generating AI item recommendations...')
    const client = getAnthropicClient()
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    const recommendations = parseItemRecommendationResponse(responseText, enemyThreats)
    if (recommendations) {
      console.log(`✓ Generated ${recommendations.recommendations.length} item recommendations`)
    }

    return recommendations
  } catch (error: any) {
    console.error('Error generating item recommendations:', error.message)
    return null
  }
}

/**
 * Build the prompt for item recommendation AI
 */
function buildItemRecommendationPrompt(
  heroName: string,
  role: string,
  currentItems: string[],
  threats: EnemyThreats,
  durationMinutes: number,
  itemScore: number,
  keyIssues: string[]
): string {
  return `You are a Dota 2 itemization coach. A player has poor item choices (score: ${itemScore}/100) and needs recommendations.

**Player Context:**
- Hero: ${heroName}
- Role: ${role}
- Current Items: ${currentItems.length > 0 ? currentItems.join(', ') : 'None recorded'}
- Game Duration: ${durationMinutes} minutes
- Item Score: ${itemScore}/100
- Key Issues: ${keyIssues.length > 0 ? keyIssues.join(', ') : 'General improvement needed'}

**Enemy Team Threats:**
- Physical Damage Dealers: ${threats.highPhysical.length > 0 ? threats.highPhysical.join(', ') : 'None identified'}
- Magic Damage Dealers: ${threats.highMagical.length > 0 ? threats.highMagical.join(', ') : 'None identified'}
- Heavy Disables (stuns/silences): ${threats.heavyDisable.length > 0 ? threats.heavyDisable.join(', ') : 'None identified'}
- Healers: ${threats.healers.length > 0 ? threats.healers.join(', ') : 'None identified'}
- Evasion Heroes: ${threats.evasion.length > 0 ? threats.evasion.join(', ') : 'None identified'}
- Invisibility Heroes: ${threats.invisibility.length > 0 ? threats.invisibility.join(', ') : 'None identified'}

**Generate 3-5 item recommendations in this JSON format:**
{
  "recommendations": [
    {
      "itemName": "Black King Bar",
      "priority": "critical",
      "reason": "Enemy has 3 magic damage heroes with heavy lockdown",
      "gameTime": "18:00-22:00",
      "buildOrder": 2,
      "counters": ["Lion", "Lina", "Shadow Shaman"]
    }
  ],
  "buildPath": "Phase Boots → Blink Dagger → BKB → Shiva's Guard"
}

**Guidelines:**
- Priority levels: "critical" (must buy), "important" (highly recommended), "situational" (good option)
- gameTime should be realistic timing windows like "15:00-18:00" or "20:00-25:00"
- buildOrder starts at 1 (first core item after boots)
- counters array should list which enemy heroes the item counters
- buildPath should show item progression with arrows (→)
- Focus on items that COUNTER the specific enemy threats identified
- Consider ${role} role needs (${role === 'Support' ? 'utility/saves' : role === 'Offlane' ? 'initiation/aura items' : 'damage/survivability'})
- Only output valid JSON, nothing else`
}

/**
 * Parse the AI response for item recommendations
 */
function parseItemRecommendationResponse(
  responseText: string,
  enemyThreats: EnemyThreats
): BuildRecommendation | null {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    } else {
      // Try to find raw JSON object
      const objMatch = responseText.match(/\{[\s\S]*\}/)
      if (objMatch) {
        jsonStr = objMatch[0]
      }
    }

    const parsed = JSON.parse(jsonStr)

    // Validate structure
    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
      console.error('Invalid recommendation structure')
      return null
    }

    return {
      recommendations: parsed.recommendations.slice(0, 5).map((rec: any, idx: number) => ({
        itemName: rec.itemName || 'Unknown Item',
        priority: rec.priority || 'situational',
        reason: rec.reason || 'General recommendation',
        gameTime: rec.gameTime || 'Mid game',
        buildOrder: rec.buildOrder || idx + 1,
        counters: rec.counters || [],
      })),
      enemyThreats,
      buildPath: parsed.buildPath || 'No specific build path recommended',
    }
  } catch (error) {
    console.error('Error parsing item recommendation response:', error)
    return null
  }
}
