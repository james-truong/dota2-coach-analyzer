// Service for hero-specific coaching - per-user hero stats with benchmark comparisons
import pg from 'pg'
import { getHeroStatistics, HeroStats } from './heroStatisticsService.js'

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

export interface HeroPerformance {
  heroId: number
  heroName: string
  heroImage: string
  gamesPlayed: number
  wins: number
  winRate: number

  // Player's averages
  avgKills: number
  avgDeaths: number
  avgAssists: number
  avgKDA: number
  avgGpm: number
  avgXpm: number
  avgLastHits: number
  avgDenies: number
  avgHeroDamage: number
  avgTowerDamage: number
  avgObsPlaced: number
  avgSenPlaced: number
  avgCampsStacked: number

  // Role breakdown
  coreGames: number
  supportGames: number

  // Recent trend
  recentWinRate: number // Last 5 games

  // Best/worst match
  bestMatch: { matchId: string; kda: number; gpm: number } | null
  worstMatch: { matchId: string; kda: number; gpm: number } | null
}

export interface HeroBenchmarkComparison {
  heroName: string
  heroImage: string
  gamesPlayed: number
  playerStats: {
    gpm: number
    xpm: number
    kills: number
    deaths: number
    assists: number
    lastHits: number
    heroDamage: number
  }
  benchmarks: {
    avgGpm: number
    avgXpm: number
    avgKills: number
    avgDeaths: number
    avgAssists: number
    avgLastHits: number
    avgHeroDamage: number
    p50Gpm?: number
    p75Gpm?: number
  }
  comparison: {
    gpmDiff: number // positive = above average
    xpmDiff: number
    kdaDiff: number
    lastHitsDiff: number
    heroDamageDiff: number
  }
  percentileRating: 'below_average' | 'average' | 'above_average' | 'top_25'
  strengths: string[]
  weaknesses: string[]
}

export interface HeroRanking {
  bestHeroes: Array<{
    heroName: string
    heroImage: string
    heroId: number
    gamesPlayed: number
    winRate: number
    score: number
    reason: string
  }>
  needsWorkHeroes: Array<{
    heroName: string
    heroImage: string
    heroId: number
    gamesPlayed: number
    winRate: number
    score: number
    reason: string
  }>
}

/**
 * Get all heroes a user has played with aggregated stats
 */
export async function getAllHeroesForUser(userId: string): Promise<HeroPerformance[]> {
  try {
    const result = await getPool().query(`
      SELECT
        hero_id,
        hero_name,
        hero_image,
        COUNT(*) as games_played,
        SUM(CASE WHEN won = true THEN 1 ELSE 0 END) as wins,
        AVG(kills) as avg_kills,
        AVG(deaths) as avg_deaths,
        AVG(assists) as avg_assists,
        AVG(gold_per_min) as avg_gpm,
        AVG(xp_per_min) as avg_xpm,
        AVG(last_hits) as avg_last_hits,
        AVG(denies) as avg_denies,
        AVG(hero_damage) as avg_hero_damage,
        AVG(tower_damage) as avg_tower_damage,
        AVG(obs_placed) as avg_obs_placed,
        AVG(sen_placed) as avg_sen_placed,
        AVG(camps_stacked) as avg_camps_stacked,
        SUM(CASE WHEN detected_role = 'Core' THEN 1 ELSE 0 END) as core_games,
        SUM(CASE WHEN detected_role = 'Support' THEN 1 ELSE 0 END) as support_games
      FROM analyzed_matches
      WHERE user_id = $1
      GROUP BY hero_id, hero_name, hero_image
      ORDER BY games_played DESC
    `, [userId])

    const heroes: HeroPerformance[] = []

    for (const row of result.rows) {
      const gamesPlayed = parseInt(row.games_played)
      const wins = parseInt(row.wins)
      const avgKills = parseFloat(row.avg_kills) || 0
      const avgDeaths = parseFloat(row.avg_deaths) || 0
      const avgAssists = parseFloat(row.avg_assists) || 0
      const avgKDA = avgDeaths > 0 ? (avgKills + avgAssists) / avgDeaths : avgKills + avgAssists

      // Get recent win rate (last 5 games for this hero)
      const recentResult = await getPool().query(`
        SELECT won FROM analyzed_matches
        WHERE user_id = $1 AND hero_id = $2
        ORDER BY analyzed_at DESC
        LIMIT 5
      `, [userId, row.hero_id])

      const recentWins = recentResult.rows.filter(r => r.won).length
      const recentWinRate = recentResult.rows.length > 0
        ? (recentWins / recentResult.rows.length) * 100
        : 0

      // Get best and worst matches
      const extremeMatches = await getPool().query(`
        SELECT match_id, kills, deaths, assists, gold_per_min,
               (kills + assists) / GREATEST(deaths, 1.0) as kda
        FROM analyzed_matches
        WHERE user_id = $1 AND hero_id = $2
        ORDER BY kda DESC
      `, [userId, row.hero_id])

      let bestMatch: { matchId: string; kda: number; gpm: number } | null = null
      let worstMatch: { matchId: string; kda: number; gpm: number } | null = null

      if (extremeMatches.rows.length > 0) {
        const best = extremeMatches.rows[0]
        bestMatch = {
          matchId: best.match_id,
          kda: parseFloat(best.kda),
          gpm: best.gold_per_min
        }

        if (extremeMatches.rows.length > 1) {
          const worst = extremeMatches.rows[extremeMatches.rows.length - 1]
          worstMatch = {
            matchId: worst.match_id,
            kda: parseFloat(worst.kda),
            gpm: worst.gold_per_min
          }
        }
      }

      heroes.push({
        heroId: row.hero_id,
        heroName: row.hero_name,
        heroImage: row.hero_image,
        gamesPlayed,
        wins,
        winRate: gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0,
        avgKills,
        avgDeaths,
        avgAssists,
        avgKDA,
        avgGpm: parseFloat(row.avg_gpm) || 0,
        avgXpm: parseFloat(row.avg_xpm) || 0,
        avgLastHits: parseFloat(row.avg_last_hits) || 0,
        avgDenies: parseFloat(row.avg_denies) || 0,
        avgHeroDamage: parseFloat(row.avg_hero_damage) || 0,
        avgTowerDamage: parseFloat(row.avg_tower_damage) || 0,
        avgObsPlaced: parseFloat(row.avg_obs_placed) || 0,
        avgSenPlaced: parseFloat(row.avg_sen_placed) || 0,
        avgCampsStacked: parseFloat(row.avg_camps_stacked) || 0,
        coreGames: parseInt(row.core_games) || 0,
        supportGames: parseInt(row.support_games) || 0,
        recentWinRate,
        bestMatch,
        worstMatch,
      })
    }

    return heroes
  } catch (error) {
    console.error('Error fetching heroes for user:', error)
    return []
  }
}

/**
 * Get detailed stats for a specific hero with benchmark comparison
 */
export async function getHeroBenchmarkComparison(
  userId: string,
  heroId: number
): Promise<HeroBenchmarkComparison | null> {
  try {
    // Get player's stats for this hero
    const playerResult = await getPool().query(`
      SELECT
        hero_name,
        hero_image,
        COUNT(*) as games_played,
        AVG(kills) as avg_kills,
        AVG(deaths) as avg_deaths,
        AVG(assists) as avg_assists,
        AVG(gold_per_min) as avg_gpm,
        AVG(xp_per_min) as avg_xpm,
        AVG(last_hits) as avg_last_hits,
        AVG(hero_damage) as avg_hero_damage
      FROM analyzed_matches
      WHERE user_id = $1 AND hero_id = $2
      GROUP BY hero_name, hero_image
    `, [userId, heroId])

    if (playerResult.rows.length === 0) {
      return null
    }

    const player = playerResult.rows[0]
    const heroName = player.hero_name

    // Get global benchmarks for this hero
    const benchmarks = await getHeroStatistics(heroName)

    const playerGpm = parseFloat(player.avg_gpm) || 0
    const playerXpm = parseFloat(player.avg_xpm) || 0
    const playerKills = parseFloat(player.avg_kills) || 0
    const playerDeaths = parseFloat(player.avg_deaths) || 0
    const playerAssists = parseFloat(player.avg_assists) || 0
    const playerLastHits = parseFloat(player.avg_last_hits) || 0
    const playerHeroDamage = parseFloat(player.avg_hero_damage) || 0

    // Calculate differences
    const benchmarkGpm = benchmarks?.avgGpm || 450
    const benchmarkXpm = benchmarks?.avgXpm || 500
    const benchmarkKills = benchmarks?.avgKills || 6
    const benchmarkDeaths = benchmarks?.avgDeaths || 6
    const benchmarkAssists = benchmarks?.avgAssists || 10
    const benchmarkLastHits = benchmarks?.avgLastHits || 150
    const benchmarkHeroDamage = benchmarks?.avgHeroDamage || 15000

    const gpmDiff = ((playerGpm - benchmarkGpm) / benchmarkGpm) * 100
    const xpmDiff = ((playerXpm - benchmarkXpm) / benchmarkXpm) * 100
    const lastHitsDiff = ((playerLastHits - benchmarkLastHits) / benchmarkLastHits) * 100
    const heroDamageDiff = ((playerHeroDamage - benchmarkHeroDamage) / benchmarkHeroDamage) * 100

    const playerKDA = playerDeaths > 0 ? (playerKills + playerAssists) / playerDeaths : playerKills + playerAssists
    const benchmarkKDA = benchmarkDeaths > 0 ? (benchmarkKills + benchmarkAssists) / benchmarkDeaths : benchmarkKills + benchmarkAssists
    const kdaDiff = ((playerKDA - benchmarkKDA) / benchmarkKDA) * 100

    // Determine percentile rating
    let percentileRating: 'below_average' | 'average' | 'above_average' | 'top_25' = 'average'
    if (benchmarks?.p75Gpm && playerGpm >= benchmarks.p75Gpm) {
      percentileRating = 'top_25'
    } else if (benchmarks?.p50Gpm && playerGpm >= benchmarks.p50Gpm) {
      percentileRating = 'above_average'
    } else if (gpmDiff < -10) {
      percentileRating = 'below_average'
    }

    // Identify strengths and weaknesses
    const strengths: string[] = []
    const weaknesses: string[] = []

    if (gpmDiff > 10) strengths.push('Excellent farming efficiency')
    else if (gpmDiff < -10) weaknesses.push('Farm slower than average')

    if (xpmDiff > 10) strengths.push('Great experience gain')
    else if (xpmDiff < -10) weaknesses.push('Falling behind in levels')

    if (kdaDiff > 15) strengths.push('Strong fight participation')
    else if (kdaDiff < -15) weaknesses.push('Dying too often or missing fights')

    if (heroDamageDiff > 15) strengths.push('High damage output')
    else if (heroDamageDiff < -15) weaknesses.push('Lower damage than expected')

    if (lastHitsDiff > 15) strengths.push('Excellent last hitting')
    else if (lastHitsDiff < -15) weaknesses.push('Missing too many last hits')

    return {
      heroName,
      heroImage: player.hero_image,
      gamesPlayed: parseInt(player.games_played),
      playerStats: {
        gpm: playerGpm,
        xpm: playerXpm,
        kills: playerKills,
        deaths: playerDeaths,
        assists: playerAssists,
        lastHits: playerLastHits,
        heroDamage: playerHeroDamage,
      },
      benchmarks: {
        avgGpm: benchmarkGpm,
        avgXpm: benchmarkXpm,
        avgKills: benchmarkKills,
        avgDeaths: benchmarkDeaths,
        avgAssists: benchmarkAssists,
        avgLastHits: benchmarkLastHits,
        avgHeroDamage: benchmarkHeroDamage,
        p50Gpm: benchmarks?.p50Gpm,
        p75Gpm: benchmarks?.p75Gpm,
      },
      comparison: {
        gpmDiff,
        xpmDiff,
        kdaDiff,
        lastHitsDiff,
        heroDamageDiff,
      },
      percentileRating,
      strengths,
      weaknesses,
    }
  } catch (error) {
    console.error('Error getting hero benchmark comparison:', error)
    return null
  }
}

/**
 * Get hero rankings - best and needs work heroes for a user
 */
export async function getHeroRankings(userId: string): Promise<HeroRanking> {
  try {
    const heroes = await getAllHeroesForUser(userId)

    // Filter to heroes with at least 3 games for meaningful data
    const qualifiedHeroes = heroes.filter(h => h.gamesPlayed >= 3)

    // Calculate a score based on win rate and performance
    const scoredHeroes = qualifiedHeroes.map(hero => {
      // Score formula: weighted combination of win rate, KDA, and GPM relative to role
      const winRateScore = hero.winRate
      const kdaScore = Math.min(hero.avgKDA * 10, 50) // Cap at 50
      const gpmScore = hero.avgGpm / 10 // Roughly 40-60 for normal games

      const score = (winRateScore * 0.5) + (kdaScore * 0.3) + (gpmScore * 0.2)

      return { ...hero, score }
    })

    // Sort by score
    const sorted = scoredHeroes.sort((a, b) => b.score - a.score)

    // Top 3 best heroes
    const bestHeroes = sorted.slice(0, 3).map(hero => ({
      heroName: hero.heroName,
      heroImage: hero.heroImage,
      heroId: hero.heroId,
      gamesPlayed: hero.gamesPlayed,
      winRate: hero.winRate,
      score: hero.score,
      reason: hero.winRate >= 55
        ? `${hero.winRate.toFixed(0)}% win rate over ${hero.gamesPlayed} games`
        : `Strong ${hero.avgKDA.toFixed(1)} KDA average`,
    }))

    // Bottom 3 (needs work)
    const needsWorkHeroes = sorted.slice(-3).reverse().map(hero => ({
      heroName: hero.heroName,
      heroImage: hero.heroImage,
      heroId: hero.heroId,
      gamesPlayed: hero.gamesPlayed,
      winRate: hero.winRate,
      score: hero.score,
      reason: hero.winRate < 45
        ? `Only ${hero.winRate.toFixed(0)}% win rate`
        : `${hero.avgDeaths.toFixed(1)} avg deaths - dying too often`,
    }))

    return { bestHeroes, needsWorkHeroes }
  } catch (error) {
    console.error('Error getting hero rankings:', error)
    return { bestHeroes: [], needsWorkHeroes: [] }
  }
}
