// Database migration script to add user tracking and player profiles
import pg from 'pg'
import dotenv from 'dotenv'

const Pool = pg.Pool

dotenv.config()

async function migrateDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    console.log('🔄 Starting database migration...')

    // Add columns to existing users table for Steam data
    console.log('  Updating users table with Steam fields...')

    // First, make email nullable for Steam users
    try {
      await pool.query(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`)
      console.log('    Made email nullable')
    } catch (err: any) {
      console.log('    Email already nullable or error:', err.message)
    }

    // Also make password_hash nullable for Steam users
    try {
      await pool.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`)
      console.log('    Made password_hash nullable')
    } catch (err: any) {
      console.log('    Password hash already nullable or error:', err.message)
    }

    const userColumns = [
      'ADD COLUMN IF NOT EXISTS account_id INTEGER',
      'ADD COLUMN IF NOT EXISTS display_name VARCHAR(255)',
      'ADD COLUMN IF NOT EXISTS avatar TEXT',
      'ADD COLUMN IF NOT EXISTS profile_url TEXT',
      'ADD COLUMN IF NOT EXISTS last_login TIMESTAMP',
    ]

    for (const column of userColumns) {
      try {
        await pool.query(`ALTER TABLE users ${column}`)
      } catch (err: any) {
        if (err.code !== '42701') throw err
      }
    }

    // Create unique index on account_id if it doesn't exist
    try {
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_account_id_key ON users(account_id)`)
    } catch (err: any) {
      console.log('    Index already exists or error:', err.message)
    }

    // Add new columns to analyzed_matches
    console.log('  Adding new columns to analyzed_matches...')

    const newColumns = [
      'ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE',
      'ADD COLUMN IF NOT EXISTS account_id INTEGER',
      'ADD COLUMN IF NOT EXISTS hero_id INTEGER',
      'ADD COLUMN IF NOT EXISTS team VARCHAR(10)',
      'ADD COLUMN IF NOT EXISTS detected_role VARCHAR(20)',
      'ADD COLUMN IF NOT EXISTS last_hits INTEGER DEFAULT 0',
      'ADD COLUMN IF NOT EXISTS denies INTEGER DEFAULT 0',
      'ADD COLUMN IF NOT EXISTS gold_per_min INTEGER DEFAULT 0',
      'ADD COLUMN IF NOT EXISTS xp_per_min INTEGER DEFAULT 0',
      'ADD COLUMN IF NOT EXISTS hero_damage INTEGER DEFAULT 0',
      'ADD COLUMN IF NOT EXISTS tower_damage INTEGER DEFAULT 0',
      'ADD COLUMN IF NOT EXISTS hero_healing INTEGER DEFAULT 0',
      'ADD COLUMN IF NOT EXISTS net_worth INTEGER DEFAULT 0',
      'ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0',
      'ADD COLUMN IF NOT EXISTS obs_placed INTEGER DEFAULT 0',
      'ADD COLUMN IF NOT EXISTS sen_placed INTEGER DEFAULT 0',
      'ADD COLUMN IF NOT EXISTS camps_stacked INTEGER DEFAULT 0',
      'ADD COLUMN IF NOT EXISTS won BOOLEAN',
    ]

    for (const column of newColumns) {
      try {
        await pool.query(`ALTER TABLE analyzed_matches ${column}`)
      } catch (err: any) {
        if (err.code !== '42701') { // Ignore "column already exists" errors
          throw err
        }
      }
    }

    // Create player_statistics table
    console.log('  Creating player_statistics table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_statistics (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        total_matches INTEGER DEFAULT 0,
        total_wins INTEGER DEFAULT 0,
        total_losses INTEGER DEFAULT 0,

        -- Overall averages
        avg_kills DECIMAL(10, 2),
        avg_deaths DECIMAL(10, 2),
        avg_assists DECIMAL(10, 2),
        avg_gpm DECIMAL(10, 2),
        avg_xpm DECIMAL(10, 2),
        avg_last_hits DECIMAL(10, 2),
        avg_hero_damage DECIMAL(10, 2),

        -- Recent performance (last 20 games)
        recent_win_rate DECIMAL(5, 2),
        recent_avg_gpm DECIMAL(10, 2),
        recent_avg_kills DECIMAL(10, 2),
        recent_avg_deaths DECIMAL(10, 2),

        -- Best performances
        best_gpm INTEGER,
        best_kills INTEGER,
        best_hero_damage INTEGER,

        -- Role distribution
        core_games INTEGER DEFAULT 0,
        support_games INTEGER DEFAULT 0,

        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    console.log('✅ Migration complete!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

migrateDatabase()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Failed:', err)
    process.exit(1)
  })
