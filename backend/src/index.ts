import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import session from 'express-session'
import passport from 'passport'
import matchRoutes from './routes/match.js'
import authRoutes from './routes/auth.js'
import playerRoutes from './routes/player.js'
import profileRoutes from './routes/profile.js'
import improvementRoutes from './routes/improvement.js'
import heroCoachingRoutes from './routes/heroCoaching.js'
import sessionAnalysisRoutes from './routes/sessionAnalysis.js'
import { initializeDatabase, clearAnalysisData, getUserByAccountId } from './services/databaseService.js'
import { autoImportMatches } from './services/autoImportService.js'
import { initializeHeroData } from './services/heroDataService.js'
import { configureSteamAuth } from './services/steamAuthService.js'
import { validateEnvironment } from './config/validateEnv.js'

dotenv.config()

// Validate environment variables before starting
validateEnvironment()

// Initialize database and hero data
initializeDatabase()
initializeHeroData()

const app = express()
const PORT = parseInt(process.env.PORT || '5000', 10)

// Configure Steam authentication
// Ensure BACKEND_URL has https:// prefix for production
let backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`
if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
  backendUrl = `https://${backendUrl}`
}
const realm = backendUrl
const returnURL = `${realm}/api/auth/steam/return`
configureSteamAuth(realm, returnURL)

// Middleware
// Ensure FRONTEND_URL has https:// prefix for production
let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
if (frontendUrl && !frontendUrl.startsWith('http://') && !frontendUrl.startsWith('https://')) {
  frontendUrl = `https://${frontendUrl}`
}
app.use(cors({
  origin: frontendUrl,
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Session configuration
const isProduction = process.env.NODE_ENV === 'production'
app.use(
  session({
    name: 'dota2coach.sid', // Custom session cookie name
    secret: process.env.SESSION_SECRET || 'dota2-coach-secret-change-in-production',
    resave: true, // Force session save on every request
    saveUninitialized: true, // Save new sessions even if unmodified
    proxy: true, // Trust Railway's proxy
    cookie: {
      secure: isProduction, // true in production (HTTPS), false in development (HTTP)
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site in production
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      domain: isProduction ? undefined : undefined, // Let browser set domain automatically
    },
  })
)

// Initialize passport
app.use(passport.initialize())
app.use(passport.session())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/players', playerRoutes)
app.use('/api/matches', matchRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/improvement', improvementRoutes)
app.use('/api/hero-coaching', heroCoachingRoutes)
app.use('/api/sessions', sessionAnalysisRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '0.3.4-recfix', timestamp: new Date().toISOString() })
})

// Admin endpoint to clear analysis data
// Usage: POST /api/admin/clear-analysis with header X-Admin-Key
app.post('/api/admin/clear-analysis', async (req, res) => {
  const adminKey = req.headers['x-admin-key']
  const expectedKey = process.env.ADMIN_KEY || 'dota2coach-admin-reset-2024'

  if (adminKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const result = await clearAnalysisData()
  res.json(result)
})

// Admin endpoint to trigger auto-import for a user
// Usage: POST /api/admin/trigger-import with header X-Admin-Key and body { accountId: number }
app.post('/api/admin/trigger-import', async (req, res) => {
  const adminKey = req.headers['x-admin-key']
  const expectedKey = process.env.ADMIN_KEY || 'dota2coach-admin-reset-2024'

  if (adminKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { accountId } = req.body
  if (!accountId) {
    return res.status(400).json({ error: 'accountId is required' })
  }

  // Get user from database
  const user = await getUserByAccountId(accountId)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  console.log(`🔧 Admin triggered import for user ${user.id} (account ${accountId})`)

  // Run import synchronously so we can return the result
  const result = await autoImportMatches(user.id, accountId, 5)
  res.json(result)
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🌐 Backend URL: ${backendUrl}`)
  console.log(`🎮 Steam OAuth realm: ${realm}`)
  console.log(`↩️  Frontend URL: ${frontendUrl}`)
})
