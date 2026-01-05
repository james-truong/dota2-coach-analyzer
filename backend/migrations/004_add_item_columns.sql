-- Migration: Add item build columns to analyzed_matches
-- This stores the final items and full purchase history for cached analysis

-- Add columns for item data (stored as JSONB for flexibility)
ALTER TABLE analyzed_matches ADD COLUMN IF NOT EXISTS final_items JSONB;
ALTER TABLE analyzed_matches ADD COLUMN IF NOT EXISTS purchase_history JSONB;
ALTER TABLE analyzed_matches ADD COLUMN IF NOT EXISTS item_build_analysis JSONB;

-- Comment on columns
COMMENT ON COLUMN analyzed_matches.final_items IS 'Array of final item IDs at end of match (inventory + backpack + neutral)';
COMMENT ON COLUMN analyzed_matches.purchase_history IS 'Full purchase log with timestamps [{time, name, key}]';
COMMENT ON COLUMN analyzed_matches.item_build_analysis IS 'Item build analysis {items, score, keyIssues, positives}';
