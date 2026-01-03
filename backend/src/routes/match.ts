import express from 'express'
import { getMatchAnalysis, getUserMatches, getMatchPlayers } from '../services/matchService.js'
import { getRecentMatches } from '../services/databaseService.js'
import { verifyToken } from '../services/jwtService.js'

const router = express.Router()

// Debug endpoint to test database directly
router.get('/history/debug', async (req, res) => {
  try {
    const pkg = await import('pg')
    const { Pool } = pkg.default
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })

    const result = await pool.query('SELECT * FROM analyzed_matches ORDER BY analyzed_at DESC LIMIT 10')
    await pool.end()

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
})

// Get match history
router.get('/history', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query
    const matches = await getRecentMatches(parseInt(limit as string))
    res.json(matches)
  } catch (error) {
    next(error)
  }
})

// Get all players in a match (for player selection)
router.get('/:matchId/players', async (req, res, next) => {
  try {
    const { matchId } = req.params
    const matchPlayers = await getMatchPlayers(matchId)

    if (!matchPlayers) {
      return res.status(404).json({
        error: 'Match not found',
        message: 'This match may be private, too recent, or the Match ID is invalid.'
      })
    }

    res.json(matchPlayers)
  } catch (error: any) {
    if (error.response?.status === 403) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'OpenDota API is rate limiting. Please wait a few minutes and try again.'
      })
    }
    next(error)
  }
})

// Get analysis for a specific match
router.get('/:matchId/analysis', async (req, res, next) => {
  try {
    const { matchId } = req.params
    const { playerSlot } = req.query

    // Get current user if authenticated via JWT
    let currentUser = null
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      currentUser = verifyToken(token)
    }

    const playerSlotNum = playerSlot ? parseInt(playerSlot as string) : undefined
    const analysis = await getMatchAnalysis(matchId, playerSlotNum, currentUser)

    if (!analysis) {
      return res.status(404).json({
        error: 'Match not found',
        message: 'This match may be private, too recent (try again in 1-2 hours), or the Match ID is invalid. Try an older public match.'
      })
    }

    res.json(analysis)
  } catch (error: any) {
    // Handle specific error cases
    if (error.response?.status === 403) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'OpenDota API is rate limiting or the match is restricted. Please wait a few minutes and try again.'
      })
    }
    next(error)
  }
})

// Get all matches for a user
router.get('/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params
    const { limit = 10, offset = 0 } = req.query

    const matches = await getUserMatches(
      userId,
      parseInt(limit as string),
      parseInt(offset as string)
    )

    res.json(matches)
  } catch (error) {
    next(error)
  }
})

export default router
