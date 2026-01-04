-- Add start_time column to analyzed_matches for session/tilt detection
ALTER TABLE analyzed_matches ADD COLUMN IF NOT EXISTS start_time BIGINT;

-- Create index for time-based queries (sessions, time of day analysis)
CREATE INDEX IF NOT EXISTS idx_analyzed_matches_start_time ON analyzed_matches(user_id, start_time);

-- Note: Existing matches will have NULL start_time
-- New matches will capture start_time from OpenDota API
