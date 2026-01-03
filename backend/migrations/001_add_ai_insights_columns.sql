-- Migration: Add AI insights columns to analyzed_matches table
-- Date: 2026-01-03
-- Description: Adds columns to store AI-generated coaching insights, summaries, and key moments

ALTER TABLE analyzed_matches
ADD COLUMN IF NOT EXISTS ai_insights JSONB,
ADD COLUMN IF NOT EXISTS ai_summary JSONB,
ADD COLUMN IF NOT EXISTS ai_key_moments JSONB;

-- Verify the columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'analyzed_matches'
AND column_name LIKE 'ai_%'
ORDER BY column_name;
