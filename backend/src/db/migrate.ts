#!/usr/bin/env tsx
import { pool } from './index.js'

async function runMigration() {
  console.log('🔄 Running database migration: Add AI insights columns...')

  try {
    // Add AI insights columns to analyzed_matches table
    await pool.query(`
      ALTER TABLE analyzed_matches
      ADD COLUMN IF NOT EXISTS ai_insights JSONB,
      ADD COLUMN IF NOT EXISTS ai_summary JSONB,
      ADD COLUMN IF NOT EXISTS ai_key_moments JSONB;
    `)

    console.log('✅ Migration completed successfully!')
    console.log('   - Added ai_insights column (JSONB)')
    console.log('   - Added ai_summary column (JSONB)')
    console.log('   - Added ai_key_moments column (JSONB)')

    // Verify columns were added
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'analyzed_matches'
      AND column_name LIKE 'ai_%'
      ORDER BY column_name;
    `)

    console.log('\n📊 AI columns in analyzed_matches:')
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`)
    })

    await pool.end()
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    await pool.end()
    process.exit(1)
  }
}

runMigration()
