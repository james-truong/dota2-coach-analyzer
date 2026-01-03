// Service for auto-importing match history on first login
import pool from '../db/index.js'
import { fetchPlayerMatches } from './openDotaService.js'
import { getMatchAnalysis } from './matchService.js'

/**
 * Check if user needs auto-import (hasn't analyzed any matches yet)
 */
export async function shouldAutoImport(userId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM analyzed_matches WHERE user_id = $1`,
    [userId]
  )

  const count = parseInt(result.rows[0].count)
  return count === 0
}

/**
 * Auto-import and analyze last N matches for a new user
 */
export async function autoImportMatches(
  userId: string,
  accountId: number,
  limit: number = 5
): Promise<{ success: boolean; imported: number; errors: number }> {
  console.log(`🔄 Starting auto-import for user ${userId} (account ${accountId})...`)

  try {
    // Fetch recent match IDs from OpenDota
    const recentMatches = await fetchPlayerMatches(accountId, limit)

    if (!recentMatches || recentMatches.length === 0) {
      console.log(`No recent matches found for account ${accountId}`)
      return { success: true, imported: 0, errors: 0 }
    }

    console.log(`📥 Importing ${recentMatches.length} matches...`)

    let imported = 0
    let errors = 0

    // Import matches sequentially to avoid rate limiting
    for (const match of recentMatches) {
      try {
        const matchId = match.match_id.toString()
        const playerSlot = match.player_slot

        console.log(`  Analyzing match ${matchId}...`)

        // Trigger analysis for this match (pass user object with id property)
        await getMatchAnalysis(matchId, playerSlot, { id: userId, accountId })

        imported++
        console.log(`  ✓ Match ${matchId} imported successfully (${imported}/${recentMatches.length})`)

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        errors++
        console.error(`  ✗ Error importing match ${match.match_id}:`, error)
      }
    }

    console.log(`✅ Auto-import complete: ${imported} imported, ${errors} errors`)
    return { success: true, imported, errors }
  } catch (error) {
    console.error('❌ Auto-import failed:', error)
    return { success: false, imported: 0, errors: 1 }
  }
}

/**
 * Trigger auto-import in the background (non-blocking)
 */
export function triggerAutoImportBackground(
  userId: string,
  accountId: number,
  limit: number = 5
): void {
  // Run in background without blocking the response
  setImmediate(async () => {
    try {
      const needsImport = await shouldAutoImport(userId)

      if (needsImport) {
        console.log(`🚀 Triggering background auto-import for user ${userId}`)
        await autoImportMatches(userId, accountId, limit)
      } else {
        console.log(`User ${userId} already has analyzed matches, skipping auto-import`)
      }
    } catch (error) {
      console.error('Error in background auto-import:', error)
    }
  })
}
