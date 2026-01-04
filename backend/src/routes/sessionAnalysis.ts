// API routes for session/tilt analysis
import express from 'express'
import {
  getPlaySessions,
  getTiltAnalysis,
  getTimeOfDayStats,
  getDayOfWeekStats,
} from '../services/sessionAnalysisService.js'

const router = express.Router()

/**
 * GET /api/sessions/recent
 * Get recent play sessions for the user
 */
router.get('/recent', async (req, res) => {
  try {
    const userId = req.query.userId as string
    const daysBack = parseInt(req.query.daysBack as string) || 30

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    const sessions = await getPlaySessions(userId, daysBack)

    res.json(sessions)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
})

/**
 * GET /api/sessions/tilt-analysis
 * Get tilt analysis and warnings for the user
 */
router.get('/tilt-analysis', async (req, res) => {
  try {
    const userId = req.query.userId as string

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    const analysis = await getTiltAnalysis(userId)

    res.json(analysis)
  } catch (error) {
    console.error('Error fetching tilt analysis:', error)
    res.status(500).json({ error: 'Failed to fetch tilt analysis' })
  }
})

/**
 * GET /api/sessions/time-stats
 * Get win rate by time of day
 */
router.get('/time-stats', async (req, res) => {
  try {
    const userId = req.query.userId as string

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    const stats = await getTimeOfDayStats(userId)

    res.json(stats)
  } catch (error) {
    console.error('Error fetching time stats:', error)
    res.status(500).json({ error: 'Failed to fetch time stats' })
  }
})

/**
 * GET /api/sessions/day-stats
 * Get win rate by day of week
 */
router.get('/day-stats', async (req, res) => {
  try {
    const userId = req.query.userId as string

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    const stats = await getDayOfWeekStats(userId)

    res.json(stats)
  } catch (error) {
    console.error('Error fetching day stats:', error)
    res.status(500).json({ error: 'Failed to fetch day stats' })
  }
})

export default router
