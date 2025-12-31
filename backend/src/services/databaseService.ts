// Database service for saving and retrieving matches
import pg from 'pg'
const Pool = pg.Pool

let pool: pg.Pool | null = null

// Lazy initialization of database pool
function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })

    // Test connection on first use
    pool.query('SELECT NOW()').then(() => {
      console.log('✅ Database connected successfully')
    }).catch((err) => {
      console.error('❌ Database connection failed:', err.message)
    })
  }
  return pool
}

export interface SavedMatch {
  id: string
  match_id: string
  hero_name: string
  hero_image: string
  player_slot: number
  kills: number
  deaths: number
  assists: number
  game_mode: string
  duration: number
  radiant_win: boolean
  analyzed_at: Date
}

export async function saveMatchAnalysis(matchData: {
  matchId: string
  heroName: string
  heroImage: string
  playerSlot: number
  kills: number
  deaths: number
  assists: number
  gameMode: string
  duration: number
  radiantWin: boolean
}): Promise<void> {
  const query = `
    INSERT INTO analyzed_matches
    (match_id, hero_name, hero_image, player_slot, kills, deaths, assists, game_mode, duration, radiant_win, analyzed_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    ON CONFLICT (match_id, player_slot) DO UPDATE
    SET analyzed_at = NOW()
  `

  try {
    await getPool().query(query, [
      matchData.matchId,
      matchData.heroName,
      matchData.heroImage,
      matchData.playerSlot,
      matchData.kills,
      matchData.deaths,
      matchData.assists,
      matchData.gameMode,
      matchData.duration,
      matchData.radiantWin,
    ])
    console.log(`Saved match ${matchData.matchId} to database`)
  } catch (error) {
    console.error('Error saving match to database:', error)
    // Don't throw error - saving to DB is optional
  }
}

export async function getRecentMatches(limit: number = 10): Promise<SavedMatch[]> {
  const query = `
    SELECT * FROM analyzed_matches
    ORDER BY analyzed_at DESC
    LIMIT $1
  `

  try {
    console.log(`Fetching recent matches (limit: ${limit})`)
    const result = await getPool().query(query, [limit])
    console.log(`Found ${result.rows.length} matches`)
    return result.rows
  } catch (error) {
    console.error('Error fetching recent matches:', error)
    return []
  }
}

export async function initializeDatabase(): Promise<void> {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS analyzed_matches (
      id SERIAL PRIMARY KEY,
      match_id VARCHAR(20) NOT NULL,
      hero_name VARCHAR(100) NOT NULL,
      hero_image TEXT,
      player_slot INTEGER NOT NULL,
      kills INTEGER NOT NULL,
      deaths INTEGER NOT NULL,
      assists INTEGER NOT NULL,
      game_mode VARCHAR(50),
      duration INTEGER,
      radiant_win BOOLEAN,
      analyzed_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(match_id, player_slot)
    )
  `

  try {
    await getPool().query(createTableQuery)
    console.log('✓ Database table initialized')
  } catch (error) {
    console.error('Error initializing database:', error)
  }
}
