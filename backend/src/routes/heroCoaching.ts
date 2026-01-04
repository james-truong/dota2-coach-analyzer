// API routes for hero-specific coaching
import express from 'express'
import {
  getAllHeroesForUser,
  getHeroBenchmarkComparison,
  getHeroRankings,
} from '../services/heroCoachingService.js'

const router = express.Router()

/**
 * GET /api/hero-coaching/heroes
 * Get all heroes the user has played with aggregated stats
 */
router.get('/heroes', async (req, res) => {
  try {
    const userId = req.query.userId as string

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    const heroes = await getAllHeroesForUser(userId)

    res.json(heroes)
  } catch (error) {
    console.error('Error fetching heroes:', error)
    res.status(500).json({ error: 'Failed to fetch heroes' })
  }
})

/**
 * GET /api/hero-coaching/heroes/:heroId/benchmarks
 * Get detailed stats for a hero with benchmark comparison
 */
router.get('/heroes/:heroId/benchmarks', async (req, res) => {
  try {
    const userId = req.query.userId as string
    const heroId = parseInt(req.params.heroId)

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    if (isNaN(heroId)) {
      return res.status(400).json({ error: 'Valid heroId is required' })
    }

    const comparison = await getHeroBenchmarkComparison(userId, heroId)

    if (!comparison) {
      return res.status(404).json({ error: 'No data found for this hero' })
    }

    res.json(comparison)
  } catch (error) {
    console.error('Error fetching hero benchmarks:', error)
    res.status(500).json({ error: 'Failed to fetch hero benchmarks' })
  }
})

/**
 * GET /api/hero-coaching/rankings
 * Get best and needs-work hero rankings for the user
 */
router.get('/rankings', async (req, res) => {
  try {
    const userId = req.query.userId as string

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    const rankings = await getHeroRankings(userId)

    res.json(rankings)
  } catch (error) {
    console.error('Error fetching hero rankings:', error)
    res.status(500).json({ error: 'Failed to fetch hero rankings' })
  }
})

export default router
