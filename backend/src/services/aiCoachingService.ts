// AI-powered coaching insights using Claude
import Anthropic from '@anthropic-ai/sdk'

// Lazy initialize to ensure env vars are loaded
let anthropic: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return anthropic
}

interface PlayerStats {
  heroName: string
  team: 'radiant' | 'dire'
  detectedRole: 'Core' | 'Support'

  // Core stats
  kills: number
  deaths: number
  assists: number
  lastHits: number
  denies: number
  goldPerMin: number
  xpPerMin: number
  level: number
  heroDamage: number
  towerDamage: number
  heroHealing: number
  netWorth: number

  // Support stats
  observerWardsPlaced: number
  sentryWardsPlaced: number
  campsStacked: number

  // Match context
  duration: number
  gameMode: string
  radiantWin: boolean
}

interface AIInsight {
  insightType: 'mistake' | 'missed_opportunity' | 'good_play'
  category: 'positioning' | 'itemization' | 'farm_efficiency' | 'vision' | 'teamfight' | 'decision_making'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  recommendation: string
  gameTime?: number
}

export async function generateAICoachingInsights(
  stats: PlayerStats,
  retryCount: number = 0
): Promise<AIInsight[]> {
  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.trim() === '') {
    console.warn('⚠️  Anthropic API key not configured. Skipping AI insights.')
    return []
  }

  try {
    const durationMinutes = Math.floor(stats.duration / 60)
    const kdaRatio = stats.deaths === 0
      ? stats.kills + stats.assists
      : (stats.kills + stats.assists) / stats.deaths
    const csPerMin = stats.lastHits / durationMinutes

    const prompt = buildCoachingPrompt(stats, { durationMinutes, kdaRatio, csPerMin })

    console.log(`🤖 Generating AI coaching insights${retryCount > 0 ? ` (retry ${retryCount}/3)` : ''}...`)
    const client = getAnthropicClient()
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    const insights = parseAIResponse(responseText)
    console.log(`✓ Generated ${insights.length} AI insights`)

    return insights
  } catch (error: any) {
    // Handle rate limiting with exponential backoff
    if (error.status === 429 && retryCount < 3) {
      const delayMs = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
      console.warn(`⏳ Anthropic API rate limited. Retrying in ${delayMs}ms...`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
      return generateAICoachingInsights(stats, retryCount + 1)
    }

    console.error('Error generating AI insights:', error.message)
    if (error.status === 429) {
      console.error('❌ Rate limit exceeded after 3 retries. Please try again in a few minutes.')
    }
    return []
  }
}

function buildCoachingPrompt(
  stats: PlayerStats,
  computed: { durationMinutes: number; kdaRatio: number; csPerMin: number }
): string {
  const { durationMinutes, kdaRatio, csPerMin } = computed

  return `You are an expert Dota 2 coach analyzing a player's performance. Provide 3-5 concise, actionable coaching insights.

**Match Context:**
- Hero: ${stats.heroName}
- Role: ${stats.detectedRole}
- Game Mode: ${stats.gameMode}
- Duration: ${durationMinutes} minutes
- Result: ${stats.radiantWin ? (stats.team === 'radiant' ? 'Victory' : 'Defeat') : (stats.team === 'dire' ? 'Victory' : 'Defeat')}

**Performance Stats:**
- KDA: ${stats.kills}/${stats.deaths}/${stats.assists} (KDA Ratio: ${kdaRatio.toFixed(2)})
- Last Hits: ${stats.lastHits} (${csPerMin.toFixed(1)} CS/min)
- GPM: ${stats.goldPerMin} | XPM: ${stats.xpPerMin}
- Hero Damage: ${stats.heroDamage.toLocaleString()}
- Tower Damage: ${stats.towerDamage.toLocaleString()}
- Net Worth: ${stats.netWorth.toLocaleString()}
${stats.detectedRole === 'Support' ? `- Observer Wards: ${stats.observerWardsPlaced} | Sentry Wards: ${stats.sentryWardsPlaced}
- Camps Stacked: ${stats.campsStacked}` : ''}

**Your Task:**
Identify the 3-5 MOST IMPACTFUL insights for improvement. Focus on:
1. Critical mistakes that cost the game
2. Major missed opportunities
3. One area where they excelled (if any)

**Output Format (JSON array):**
[
  {
    "insightType": "mistake" | "missed_opportunity" | "good_play",
    "category": "positioning" | "itemization" | "farm_efficiency" | "vision" | "teamfight" | "decision_making",
    "severity": "low" | "medium" | "high" | "critical",
    "title": "Short title (5-8 words)",
    "description": "What happened (1-2 sentences, specific numbers)",
    "recommendation": "How to improve (1-2 sentences, actionable)"
  }
]

**Guidelines:**
- Be specific with numbers from the stats
- Prioritize insights by impact (most impactful first)
- For ${stats.detectedRole} role: ${stats.detectedRole === 'Core' ? 'focus on farming efficiency, itemization, and damage output' : 'focus on vision control, positioning, and enabling cores'}
- Keep descriptions under 100 characters
- Keep recommendations under 120 characters
- Only output valid JSON, nothing else

Generate the insights now:`
}

function parseAIResponse(responseText: string): AIInsight[] {
  try {
    // Extract JSON from the response (Claude sometimes adds markdown formatting)
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('Could not find JSON array in AI response')
      return []
    }

    const insights = JSON.parse(jsonMatch[0]) as AIInsight[]

    // Validate and sanitize insights
    return insights
      .filter(insight =>
        insight.title &&
        insight.description &&
        insight.recommendation &&
        insight.insightType &&
        insight.category &&
        insight.severity
      )
      .slice(0, 5) // Ensure max 5 insights
  } catch (error) {
    console.error('Error parsing AI response:', error)
    return []
  }
}
