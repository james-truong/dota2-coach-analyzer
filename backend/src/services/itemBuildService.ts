// Item build analysis and recommendations service
import axios from 'axios'

const OPENDOTA_API_BASE = 'https://api.opendota.com/api'

// Item ID to name mapping (common items)
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
}

/**
 * Analyze player's item build and provide feedback
 */
export function analyzeItemBuild(
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
  }
): ItemBuildAnalysis {
  const itemNames = finalItems.map(id => ITEM_NAMES[id] || `Item ${id}`).filter(name => !name.includes('Item'))
  const insights: ItemBuildAnalysis['insights'] = []
  const positives: string[] = []
  const keyIssues: string[] = []
  let itemScore = 70 // Base score

  // Check for essential items based on role
  if (detectedRole === 'Core') {
    analyzeCoreItems(heroName, itemNames, duration, stats, insights, positives, keyIssues)
  } else {
    analyzeSupportItems(heroName, itemNames, duration, insights, positives, keyIssues)
  }

  // Check for BKB on cores (very important)
  if (detectedRole === 'Core' && duration > 25 * 60) {
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
  if (!hasMobility && detectedRole === 'Core') {
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
  if (detectedRole === 'Core') {
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
  if (stats.gpm > 550 && detectedRole === 'Core') {
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

  return {
    insights,
    finalItems: itemNames,
    itemScore,
    keyIssues,
    positives,
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
