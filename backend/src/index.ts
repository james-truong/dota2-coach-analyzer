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
import { initializeDatabase } from './services/databaseService.js'
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
const PORT = process.env.PORT || 5000

// Configure Steam authentication
const realm = process.env.BACKEND_URL || `http://localhost:${PORT}`
const returnURL = `${realm}/api/auth/steam/return`
configureSteamAuth(realm, returnURL)

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dota2-coach-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Must be false for localhost HTTP
      httpOnly: true,
      sameSite: 'lax', // Important for OAuth redirects
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
})
