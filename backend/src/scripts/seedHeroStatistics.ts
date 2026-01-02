// Seed hero statistics database with realistic benchmarks
// Based on hero roles and typical performance data
import pg from 'pg'
import axios from 'axios'

const Pool = pg.Pool

// Role-based benchmark templates
// These are based on typical performance in pub matches across all skill levels
const ROLE_BENCHMARKS = {
  // Hard Carry (Position 1)
  carry: {
    avgGpm: 550,
    avgXpm: 620,
    avgCsPerMin: 7.5,
    avgLastHits: 225, // 30 min game
    avgDenies: 15,
    avgKills: 8,
    avgDeaths: 5,
    avgAssists: 9,
    avgHeroDamage: 18000,
    avgTowerDamage: 4500,
    avgHeroHealing: 0,
    avgObsPlaced: 0,
    avgSenPlaced: 0,
    avgCampsStacked: 1,
  },
  // Mid (Position 2)
  mid: {
    avgGpm: 520,
    avgXpm: 650,
    avgCsPerMin: 6.8,
    avgLastHits: 204,
    avgDenies: 20,
    avgKills: 10,
    avgDeaths: 6,
    avgAssists: 11,
    avgHeroDamage: 20000,
    avgTowerDamage: 2500,
    avgHeroHealing: 0,
    avgObsPlaced: 1,
    avgSenPlaced: 0,
    avgCampsStacked: 0,
  },
  // Offlane (Position 3)
  offlane: {
    avgGpm: 450,
    avgXpm: 550,
    avgCsPerMin: 5.5,
    avgLastHits: 165,
    avgDenies: 12,
    avgKills: 6,
    avgDeaths: 7,
    avgAssists: 14,
    avgHeroDamage: 15000,
    avgTowerDamage: 3000,
    avgHeroHealing: 500,
    avgObsPlaced: 2,
    avgSenPlaced: 1,
    avgCampsStacked: 1,
  },
  // Support (Position 4/5)
  support: {
    avgGpm: 300,
    avgXpm: 350,
    avgCsPerMin: 1.5,
    avgLastHits: 45,
    avgDenies: 8,
    avgKills: 3,
    avgDeaths: 8,
    avgAssists: 16,
    avgHeroDamage: 8000,
    avgTowerDamage: 800,
    avgHeroHealing: 1200,
    avgObsPlaced: 12,
    avgSenPlaced: 8,
    avgCampsStacked: 3,
  },
}

// Determine primary role from hero's role array
function getPrimaryRole(roles: string[]): keyof typeof ROLE_BENCHMARKS {
  if (roles.includes('Carry')) return 'carry'
  if (roles.includes('Support')) return 'support'

  // Check for typical mid heroes
  if (roles.includes('Nuker') && !roles.includes('Support')) return 'mid'

  // Initiators/Durables are usually offlaners
  if (roles.includes('Initiator') || roles.includes('Durable')) return 'offlane'

  // Default fallback
  return 'mid'
}

async function seedHeroStatistics() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    console.log('🌱 Fetching hero data from OpenDota...')
    const response = await axios.get('https://api.opendota.com/api/constants/heroes')
    const heroesData = response.data

    const heroes = Object.values(heroesData) as any[]
    console.log(`Found ${heroes.length} heroes`)

    let seededCount = 0
    let updatedCount = 0

    for (const hero of heroes) {
      const primaryRole = getPrimaryRole(hero.roles)
      const benchmarks = ROLE_BENCHMARKS[primaryRole]

      // Check if hero already exists
      const existing = await pool.query(
        'SELECT id FROM hero_statistics WHERE hero_id = $1',
        [hero.id]
      )

      if (existing.rows.length > 0) {
        console.log(`  ⏭️  Skipping ${hero.localized_name} (already seeded)`)
        updatedCount++
        continue
      }

      // Insert hero statistics
      await pool.query(`
        INSERT INTO hero_statistics (
          hero_name, hero_id, total_matches,
          avg_gpm, avg_xpm, avg_cs_per_min, avg_last_hits, avg_denies,
          avg_kills, avg_deaths, avg_assists,
          avg_hero_damage, avg_tower_damage, avg_hero_healing,
          avg_obs_placed, avg_sen_placed, avg_camps_stacked
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [
        hero.localized_name,
        hero.id,
        100, // Indicate this is seeded data with 100 "virtual" matches
        benchmarks.avgGpm,
        benchmarks.avgXpm,
        benchmarks.avgCsPerMin,
        benchmarks.avgLastHits,
        benchmarks.avgDenies,
        benchmarks.avgKills,
        benchmarks.avgDeaths,
        benchmarks.avgAssists,
        benchmarks.avgHeroDamage,
        benchmarks.avgTowerDamage,
        benchmarks.avgHeroHealing,
        benchmarks.avgObsPlaced,
        benchmarks.avgSenPlaced,
        benchmarks.avgCampsStacked,
      ])

      console.log(`  ✓ Seeded ${hero.localized_name} (${primaryRole})`)
      seededCount++
    }

    console.log(`\n✅ Seeding complete!`)
    console.log(`   📊 Seeded: ${seededCount} heroes`)
    console.log(`   ⏭️  Skipped: ${updatedCount} heroes (already existed)`)

  } catch (error) {
    console.error('❌ Error seeding hero statistics:', error)
    throw error
  } finally {
    await pool.end()
  }
}

export { seedHeroStatistics }

// Run immediately
import dotenv from 'dotenv'
dotenv.config()

seedHeroStatistics()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Failed:', err)
    process.exit(1)
  })
