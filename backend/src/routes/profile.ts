import express from 'express'
import { getPlayerProfile, getUserMatchHistory } from '../services/playerProfileService.js'
import { backfillUserMatches } from '../services/matchHistoryService.js'
import { verifyToken } from '../services/jwtService.js'

const router = express.Router()

// Middleware to check if user is authenticated via JWT
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource',
    })
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  const user = verifyToken(token)

  if (!user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    })
  }

  // Attach user to request object
  req.user = user
  next()
}

// Get current user's profile
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = req.user as any
    const profile = await getPlayerProfile(user.id)

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found',
        message: 'Could not load your profile',
      })
    }

    res.json(profile)
  } catch (error) {
    next(error)
  }
})

// Get profile by user ID
router.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params
    const profile = await getPlayerProfile(userId)

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found',
        message: 'User not found or has not analyzed any matches yet',
      })
    }

    res.json(profile)
  } catch (error) {
    next(error)
  }
})

// Get match history for user
router.get('/:userId/matches', async (req, res, next) => {
  try {
    const { userId } = req.params
    const { limit = 20, offset = 0 } = req.query

    const matches = await getUserMatchHistory(
      userId,
      parseInt(limit as string),
      parseInt(offset as string)
    )

    res.json(matches)
  } catch (error) {
    next(error)
  }
})

// Refresh match history from OpenDota
router.post('/me/refresh', requireAuth, async (req, res, next) => {
  try {
    const user = req.user as any

    if (!user.accountId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Account ID not found for user',
      })
    }

    // Trigger backfill (this will take time, so we do it async)
    const result = await backfillUserMatches(user.id, user.accountId, 20)

    res.json({
      success: true,
      message: `Refreshed match history from OpenDota`,
      matchesAdded: result.matchesBackfilled,
      errors: result.errors,
    })
  } catch (error) {
    next(error)
  }
})

export default router
