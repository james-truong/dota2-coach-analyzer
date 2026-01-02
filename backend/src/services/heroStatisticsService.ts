// Service for tracking and retrieving hero-specific statistics
import pg from 'pg'
const Pool = pg.Pool

let pool: pg.Pool | null = null

function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  }
  return pool
}

export interface HeroStats {
  heroName: string
  heroId: number
  totalMatches: number

  // Average stats
  avgGpm: number
  avgXpm: number
  avgCsPerMin: number
  avgLastHits: number
  avgDenies: number
  avgKills: number
  avgDeaths: number
  avgAssists: number
  avgHeroDamage: number
  avgTowerDamage: number
  avgHeroHealing: number

  // Support stats
  avgObsPlaced?: number
  avgSenPlaced?: number
  avgCampsStacked?: number

  // Percentile thresholds
  p50Gpm?: number
  p50Xpm?: number
  p50CsPerMin?: number
  p75Gpm?: number
  p75Xpm?: number
  p75CsPerMin?: number
}

export interface MatchPerformance {
  heroName: string
  heroId: number
  duration: number

  gpm: number
  xpm: number
  lastHits: number
  denies: number
  kills: number
  deaths: number
  assists: number
  heroDamage: number
  towerDamage: number
  heroHealing: number

  // Support stats (optional)
  observerWardsPlaced?: number
  sentryWardsPlaced?: number
  campsStacked?: number
}

/**
 * Update hero statistics after analyzing a match
 */
export async function updateHeroStatistics(performance: MatchPerformance): Promise<void> {
  const csPerMin = performance.lastHits / (performance.duration / 60)

  try {
    // First, get current stats for this hero
    const currentStats = await getHeroStatistics(performance.heroName)

    if (!currentStats) {
      // Insert new hero stats
      await getPool().query(`
        INSERT INTO hero_statistics (
          hero_name, hero_id, total_matches,
          avg_gpm, avg_xpm, avg_cs_per_min, avg_last_hits, avg_denies,
          avg_kills, avg_deaths, avg_assists,
          avg_hero_damage, avg_tower_damage, avg_hero_healing,
          avg_obs_placed, avg_sen_placed, avg_camps_stacked
        ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `, [
        performance.heroName,
        performance.heroId,
        performance.gpm,
        performance.xpm,
        csPerMin,
        performance.lastHits,
        performance.denies,
        performance.kills,
        performance.deaths,
        performance.assists,
        performance.heroDamage,
        performance.towerDamage,
        performance.heroHealing,
        performance.observerWardsPlaced || 0,
        performance.sentryWardsPlaced || 0,
        performance.campsStacked || 0,
      ])
    } else {
      // Update existing stats using incremental average formula
      const n = currentStats.totalMatches
      const updateAvg = (oldAvg: number, newValue: number) => (oldAvg * n + newValue) / (n + 1)

      await getPool().query(`
        UPDATE hero_statistics SET
          total_matches = total_matches + 1,
          avg_gpm = $1,
          avg_xpm = $2,
          avg_cs_per_min = $3,
          avg_last_hits = $4,
          avg_denies = $5,
          avg_kills = $6,
          avg_deaths = $7,
          avg_assists = $8,
          avg_hero_damage = $9,
          avg_tower_damage = $10,
          avg_hero_healing = $11,
          avg_obs_placed = $12,
          avg_sen_placed = $13,
          avg_camps_stacked = $14,
          updated_at = NOW()
        WHERE hero_name = $15
      `, [
        updateAvg(currentStats.avgGpm, performance.gpm),
        updateAvg(currentStats.avgXpm, performance.xpm),
        updateAvg(currentStats.avgCsPerMin, csPerMin),
        updateAvg(currentStats.avgLastHits, performance.lastHits),
        updateAvg(currentStats.avgDenies, performance.denies),
        updateAvg(currentStats.avgKills, performance.kills),
        updateAvg(currentStats.avgDeaths, performance.deaths),
        updateAvg(currentStats.avgAssists, performance.assists),
        updateAvg(currentStats.avgHeroDamage, performance.heroDamage),
        updateAvg(currentStats.avgTowerDamage, performance.towerDamage),
        updateAvg(currentStats.avgHeroHealing, performance.heroHealing),
        updateAvg(currentStats.avgObsPlaced || 0, performance.observerWardsPlaced || 0),
        updateAvg(currentStats.avgSenPlaced || 0, performance.sentryWardsPlaced || 0),
        updateAvg(currentStats.avgCampsStacked || 0, performance.campsStacked || 0),
        performance.heroName,
      ])
    }

    console.log(`✓ Updated statistics for ${performance.heroName}`)
  } catch (error) {
    console.error(`Error updating hero statistics for ${performance.heroName}:`, error)
  }
}

/**
 * Get hero-specific statistics
 */
export async function getHeroStatistics(heroName: string): Promise<HeroStats | null> {
  try {
    const result = await getPool().query(
      'SELECT * FROM hero_statistics WHERE hero_name = $1',
      [heroName]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      heroName: row.hero_name,
      heroId: row.hero_id,
      totalMatches: row.total_matches,
      avgGpm: parseFloat(row.avg_gpm),
      avgXpm: parseFloat(row.avg_xpm),
      avgCsPerMin: parseFloat(row.avg_cs_per_min),
      avgLastHits: parseFloat(row.avg_last_hits),
      avgDenies: parseFloat(row.avg_denies),
      avgKills: parseFloat(row.avg_kills),
      avgDeaths: parseFloat(row.avg_deaths),
      avgAssists: parseFloat(row.avg_assists),
      avgHeroDamage: parseFloat(row.avg_hero_damage),
      avgTowerDamage: parseFloat(row.avg_tower_damage),
      avgHeroHealing: parseFloat(row.avg_hero_healing),
      avgObsPlaced: row.avg_obs_placed ? parseFloat(row.avg_obs_placed) : undefined,
      avgSenPlaced: row.avg_sen_placed ? parseFloat(row.avg_sen_placed) : undefined,
      avgCampsStacked: row.avg_camps_stacked ? parseFloat(row.avg_camps_stacked) : undefined,
      p50Gpm: row.p50_gpm ? parseFloat(row.p50_gpm) : undefined,
      p50Xpm: row.p50_xpm ? parseFloat(row.p50_xpm) : undefined,
      p50CsPerMin: row.p50_cs_per_min ? parseFloat(row.p50_cs_per_min) : undefined,
      p75Gpm: row.p75_gpm ? parseFloat(row.p75_gpm) : undefined,
      p75Xpm: row.p75_xpm ? parseFloat(row.p75_xpm) : undefined,
      p75CsPerMin: row.p75_cs_per_min ? parseFloat(row.p75_cs_per_min) : undefined,
    }
  } catch (error) {
    console.error(`Error fetching hero statistics for ${heroName}:`, error)
    return null
  }
}

/**
 * Get all hero statistics (for admin/debugging)
 */
export async function getAllHeroStatistics(): Promise<HeroStats[]> {
  try {
    const result = await getPool().query(
      'SELECT * FROM hero_statistics ORDER BY total_matches DESC'
    )

    return result.rows.map(row => ({
      heroName: row.hero_name,
      heroId: row.hero_id,
      totalMatches: row.total_matches,
      avgGpm: parseFloat(row.avg_gpm),
      avgXpm: parseFloat(row.avg_xpm),
      avgCsPerMin: parseFloat(row.avg_cs_per_min),
      avgLastHits: parseFloat(row.avg_last_hits),
      avgDenies: parseFloat(row.avg_denies),
      avgKills: parseFloat(row.avg_kills),
      avgDeaths: parseFloat(row.avg_deaths),
      avgAssists: parseFloat(row.avg_assists),
      avgHeroDamage: parseFloat(row.avg_hero_damage),
      avgTowerDamage: parseFloat(row.avg_tower_damage),
      avgHeroHealing: parseFloat(row.avg_hero_healing),
      avgObsPlaced: row.avg_obs_placed ? parseFloat(row.avg_obs_placed) : undefined,
      avgSenPlaced: row.avg_sen_placed ? parseFloat(row.avg_sen_placed) : undefined,
      avgCampsStacked: row.avg_camps_stacked ? parseFloat(row.avg_camps_stacked) : undefined,
      p50Gpm: row.p50_gpm ? parseFloat(row.p50_gpm) : undefined,
      p50Xpm: row.p50_xpm ? parseFloat(row.p50_xpm) : undefined,
      p50CsPerMin: row.p50_cs_per_min ? parseFloat(row.p50_cs_per_min) : undefined,
      p75Gpm: row.p75_gpm ? parseFloat(row.p75_gpm) : undefined,
      p75Xpm: row.p75_xpm ? parseFloat(row.p75_xpm) : undefined,
      p75CsPerMin: row.p75_cs_per_min ? parseFloat(row.p75_cs_per_min) : undefined,
    }))
  } catch (error) {
    console.error('Error fetching all hero statistics:', error)
    return []
  }
}
