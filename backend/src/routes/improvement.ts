// API routes for improvement tracking
import express from 'express'
import { getImprovementMetrics, getWeeklyFocusArea } from '../services/improvementService.js'

const router = express.Router()

/**
 * GET /api/improvement/metrics
 * Get improvement metrics for the authenticated user
 */
router.get('/metrics', async (req, res) => {
  try {
    const userId = req.query.userId as string
    const daysBack = parseInt(req.query.daysBack as string) || 30

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    const metrics = await getImprovementMetrics(userId, daysBack)

    res.json(metrics)
  } catch (error) {
    console.error('Error fetching improvement metrics:', error)
    res.status(500).json({ error: 'Failed to fetch improvement metrics' })
  }
})

/**
 * GET /api/improvement/weekly-focus
 * Get weekly focus area recommendation
 */
router.get('/weekly-focus', async (req, res) => {
  try {
    const userId = req.query.userId as string

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    const focusArea = await getWeeklyFocusArea(userId)

    res.json(focusArea)
  } catch (error) {
    console.error('Error fetching weekly focus area:', error)
    res.status(500).json({ error: 'Failed to fetch weekly focus area' })
  }
})

export default router
