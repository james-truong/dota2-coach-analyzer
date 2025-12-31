import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import replayRoutes from './routes/replay.js'
import matchRoutes from './routes/match.js'
import userRoutes from './routes/user.js'
import { initializeDatabase } from './services/databaseService.js'
import { initializeHeroData } from './services/heroDataService.js'

dotenv.config()

// Initialize database and hero data
initializeDatabase()
initializeHeroData()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/replays', replayRoutes)
app.use('/api/matches', matchRoutes)
app.use('/api/users', userRoutes)

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
