import express from 'express'
import passport from 'passport'

const router = express.Router()

// Initiate Steam login
router.get('/steam', passport.authenticate('steam', { failureRedirect: '/' }))

// Steam callback URL
router.get(
  '/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect to frontend
    let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    if (frontendUrl && !frontendUrl.startsWith('http://') && !frontendUrl.startsWith('https://')) {
      frontendUrl = `https://${frontendUrl}`
    }

    console.log('✅ Steam auth successful, redirecting to:', frontendUrl)
    console.log('Session ID:', req.sessionID)
    console.log('User:', req.user)

    res.redirect(`${frontendUrl}?login=success`)
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

// Get current user
router.get('/me', (req, res) => {
  console.log('GET /api/auth/me - Session ID:', req.sessionID)
  console.log('Authenticated:', req.isAuthenticated())
  console.log('User:', req.user)
  console.log('Session:', req.session)

  if (req.isAuthenticated()) {
    res.json({ user: req.user })
  } else {
    res.status(401).json({ error: 'Not authenticated' })
  }
})

export default router
