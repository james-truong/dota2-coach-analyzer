import express from 'express'
import { fetchPlayerMatches } from '../services/openDotaService.js'
import { getHeroName, getHeroImageUrl } from '../services/heroDataService.js'

const router = express.Router()

// Get player's recent matches
router.get('/:accountId/matches', async (req, res, next) => {
  try {
    const accountId = parseInt(req.params.accountId)
    const limit = parseInt(req.query.limit as string) || 20

    if (isNaN(accountId)) {
      return res.status(400).json({ error: 'Invalid account ID' })
    }

    const matches = await fetchPlayerMatches(accountId, limit)

    // Enrich matches with hero data
    const enrichedMatches = matches.map(match => ({
      ...match,
      hero_name: getHeroName(match.hero_id),
      hero_image: getHeroImageUrl(match.hero_id),
    }))

    res.json({ matches: enrichedMatches })
  } catch (error) {
    next(error)
  }
})

// Get logged-in player's recent matches (requires authentication)
router.get('/me/matches', async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const user = req.user as any
    const limit = parseInt(req.query.limit as string) || 20

    const matches = await fetchPlayerMatches(user.accountId, limit)

    // Enrich matches with hero data
    const enrichedMatches = matches.map(match => ({
      ...match,
      hero_name: getHeroName(match.hero_id),
      hero_image: getHeroImageUrl(match.hero_id),
    }))

    res.json({ matches: enrichedMatches, accountId: user.accountId })
  } catch (error) {
    next(error)
  }
})

export default router
