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

export interface User {
  id: string // UUID
  steamId: string
  accountId: number
  displayName: string
  avatar: string
  profileUrl: string
  isFirstLogin?: boolean // True if this is the user's first login
}

/**
 * Create or update a user from Steam login
 */
export async function upsertUser(userData: {
  steamId: string
  accountId: number
  displayName: string
  avatar: string
  profileUrl: string
}): Promise<User> {
  // Check if user exists before insert/update
  const existingUser = await getPool().query(
    'SELECT id, last_login FROM users WHERE account_id = $1',
    [userData.accountId]
  )
  const isFirstLogin = existingUser.rows.length === 0

  // For Steam users, email and password are nullable
  const query = `
    INSERT INTO users (steam_id, account_id, display_name, avatar, profile_url, last_login, email, password_hash, username)
    VALUES ($1, $2, $3, $4, $5, NOW(), NULL, NULL, $3)
    ON CONFLICT (account_id) DO UPDATE
    SET steam_id = $1, display_name = $3, avatar = $4, profile_url = $5, last_login = NOW(), username = $3
    WHERE users.account_id = $2
    RETURNING *
  `

  const result = await getPool().query(query, [
    userData.steamId,
    userData.accountId,
    userData.displayName,
    userData.avatar,
    userData.profileUrl,
  ])

  const row = result.rows[0]
  return {
    id: row.id,
    steamId: row.steam_id,
    accountId: row.account_id,
    displayName: row.display_name,
    avatar: row.avatar,
    profileUrl: row.profile_url,
    isFirstLogin, // Flag to indicate if this is first login
  }
}

/**
 * Get user by Steam ID
 */
export async function getUserBySteamId(steamId: string): Promise<User | null> {
  const result = await getPool().query(
    'SELECT * FROM users WHERE steam_id = $1',
    [steamId]
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row.id,
    steamId: row.steam_id,
    accountId: row.account_id,
    displayName: row.display_name,
    avatar: row.avatar,
    profileUrl: row.profile_url,
  }
}

/**
 * Get user by account ID
 */
export async function getUserByAccountId(accountId: number): Promise<User | null> {
  const result = await getPool().query(
    'SELECT * FROM users WHERE account_id = $1',
    [accountId]
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row.id,
    steamId: row.steam_id,
    accountId: row.account_id,
    displayName: row.display_name,
    avatar: row.avatar,
    profileUrl: row.profile_url,
  }
}

/**
 * Check if a match has already been analyzed
 * Returns the cached analysis if it exists, null otherwise
 */
export async function getCachedMatchAnalysis(matchId: string, playerSlot: number): Promise<any | null> {
  const result = await getPool().query(
    `
    SELECT * FROM analyzed_matches
    WHERE match_id = $1 AND player_slot = $2
    `,
    [matchId, playerSlot]
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0]

  // Return the cached match data in the same format as getMatchAnalysis
  return {
    id: row.id,
    matchId: row.match_id,
    heroName: row.hero_name,
    heroId: row.hero_id,
    heroImage: row.hero_image,
    playerSlot: row.player_slot,
    team: row.team,
    detectedRole: row.detected_role,
    kills: row.kills,
    deaths: row.deaths,
    assists: row.assists,
    lastHits: row.last_hits,
    denies: row.denies,
    goldPerMin: row.gold_per_min,
    xpPerMin: row.xp_per_min,
    heroDamage: row.hero_damage,
    towerDamage: row.tower_damage,
    heroHealing: row.hero_healing,
    netWorth: row.net_worth,
    level: row.level,
    obsPlaced: row.obs_placed,
    senPlaced: row.sen_placed,
    campsStacked: row.camps_stacked,
    gameMode: row.game_mode,
    duration: row.duration,
    radiantWin: row.radiant_win,
    won: row.won,
    analyzedAt: row.analyzed_at,
  }
}

export async function saveMatchAnalysis(matchData: {
  matchId: string
  userId?: string // UUID
  accountId?: number
  heroName: string
  heroId: number
  heroImage: string
  playerSlot: number
  team: string
  detectedRole: string
  kills: number
  deaths: number
  assists: number
  lastHits?: number
  denies?: number
  goldPerMin?: number
  xpPerMin?: number
  heroDamage?: number
  towerDamage?: number
  heroHealing?: number
  netWorth?: number
  level?: number
  obsPlaced?: number
  senPlaced?: number
  campsStacked?: number
  gameMode: string
  duration: number
  radiantWin: boolean
  won: boolean
}): Promise<void> {
  const query = `
    INSERT INTO analyzed_matches
    (match_id, user_id, account_id, hero_name, hero_id, hero_image, player_slot, team, detected_role,
     kills, deaths, assists, last_hits, denies, gold_per_min, xp_per_min, hero_damage, tower_damage,
     hero_healing, net_worth, level, obs_placed, sen_placed, camps_stacked,
     game_mode, duration, radiant_win, won, analyzed_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, NOW())
    ON CONFLICT (match_id, player_slot) DO UPDATE
    SET analyzed_at = NOW()
  `

  try {
    await getPool().query(query, [
      matchData.matchId,
      matchData.userId || null,
      matchData.accountId || null,
      matchData.heroName,
      matchData.heroId,
      matchData.heroImage,
      matchData.playerSlot,
      matchData.team,
      matchData.detectedRole,
      matchData.kills,
      matchData.deaths,
      matchData.assists,
      matchData.lastHits || 0,
      matchData.denies || 0,
      matchData.goldPerMin || 0,
      matchData.xpPerMin || 0,
      matchData.heroDamage || 0,
      matchData.towerDamage || 0,
      matchData.heroHealing || 0,
      matchData.netWorth || 0,
      matchData.level || 0,
      matchData.obsPlaced || 0,
      matchData.senPlaced || 0,
      matchData.campsStacked || 0,
      matchData.gameMode,
      matchData.duration,
      matchData.radiantWin,
      matchData.won,
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
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      steam_id VARCHAR(20) NOT NULL UNIQUE,
      account_id INTEGER NOT NULL UNIQUE,
      display_name VARCHAR(255),
      avatar TEXT,
      profile_url TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      last_login TIMESTAMP DEFAULT NOW()
    )
  `

  const createMatchesTableQuery = `
    CREATE TABLE IF NOT EXISTS analyzed_matches (
      id SERIAL PRIMARY KEY,
      match_id VARCHAR(20) NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      account_id INTEGER,
      hero_name VARCHAR(100) NOT NULL,
      hero_id INTEGER,
      hero_image TEXT,
      player_slot INTEGER NOT NULL,
      team VARCHAR(10),
      detected_role VARCHAR(20),

      -- Core stats
      kills INTEGER NOT NULL,
      deaths INTEGER NOT NULL,
      assists INTEGER NOT NULL,
      last_hits INTEGER,
      denies INTEGER,
      gold_per_min INTEGER,
      xp_per_min INTEGER,
      hero_damage INTEGER,
      tower_damage INTEGER,
      hero_healing INTEGER,
      net_worth INTEGER,
      level INTEGER,

      -- Support stats
      obs_placed INTEGER DEFAULT 0,
      sen_placed INTEGER DEFAULT 0,
      camps_stacked INTEGER DEFAULT 0,

      -- Match info
      game_mode VARCHAR(50),
      duration INTEGER,
      radiant_win BOOLEAN,
      won BOOLEAN,
      analyzed_at TIMESTAMP DEFAULT NOW(),

      UNIQUE(match_id, player_slot)
    )
  `

  const createHeroStatsTableQuery = `
    CREATE TABLE IF NOT EXISTS hero_statistics (
      id SERIAL PRIMARY KEY,
      hero_name VARCHAR(100) NOT NULL UNIQUE,
      hero_id INTEGER,
      total_matches INTEGER DEFAULT 0,

      -- Average stats
      avg_gpm DECIMAL(10, 2),
      avg_xpm DECIMAL(10, 2),
      avg_cs_per_min DECIMAL(10, 2),
      avg_last_hits DECIMAL(10, 2),
      avg_denies DECIMAL(10, 2),
      avg_kills DECIMAL(10, 2),
      avg_deaths DECIMAL(10, 2),
      avg_assists DECIMAL(10, 2),
      avg_hero_damage DECIMAL(10, 2),
      avg_tower_damage DECIMAL(10, 2),
      avg_hero_healing DECIMAL(10, 2),

      -- For supports
      avg_obs_placed DECIMAL(10, 2),
      avg_sen_placed DECIMAL(10, 2),
      avg_camps_stacked DECIMAL(10, 2),

      -- Percentile thresholds (50th percentile = median)
      p50_gpm DECIMAL(10, 2),
      p50_xpm DECIMAL(10, 2),
      p50_cs_per_min DECIMAL(10, 2),

      -- Good performance (75th percentile)
      p75_gpm DECIMAL(10, 2),
      p75_xpm DECIMAL(10, 2),
      p75_cs_per_min DECIMAL(10, 2),

      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  const createPlayerStatsTableQuery = `
    CREATE TABLE IF NOT EXISTS player_statistics (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
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
  `

  try {
    await getPool().query(createUsersTableQuery)
    await getPool().query(createMatchesTableQuery)
    await getPool().query(createHeroStatsTableQuery)
    await getPool().query(createPlayerStatsTableQuery)
    console.log('✓ Database tables initialized')
  } catch (error) {
    console.error('Error initializing database:', error)
  }
}
