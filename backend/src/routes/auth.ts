import express from 'express'
import passport from 'passport'
import { generateToken, verifyToken } from '../services/jwtService.js'

const router = express.Router()

// Initiate Steam login
router.get('/steam', passport.authenticate('steam', { failureRedirect: '/' }))

// Steam callback URL
router.get(
  '/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, generate JWT and redirect to frontend
    let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    if (frontendUrl && !frontendUrl.startsWith('http://') && !frontendUrl.startsWith('https://')) {
      frontendUrl = `https://${frontendUrl}`
    }

    console.log('✅ Steam auth successful, redirecting to:', frontendUrl)
    console.log('User:', req.user)

    // Generate JWT token
    const token = generateToken(req.user as any)
    console.log('🔑 JWT token generated')

    // Redirect to frontend with token in URL (frontend will store in localStorage)
    res.redirect(`${frontendUrl}?token=${token}`)
  }
)

// Logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' })
    }
    res.json({ success: true, message: 'Logged out successfully' })
  })
})

// Get current user (JWT-based)
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization
  console.log('GET /api/auth/me - Auth header:', authHeader)

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No valid Authorization header')
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  const user = verifyToken(token)

  if (!user) {
    console.log('❌ Invalid or expired token')
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  console.log('✅ User authenticated:', user.displayName)
  res.json({ user })
})

export default router
