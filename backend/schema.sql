-- Dota 2 Coach Analyzer Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  steam_id BIGINT UNIQUE,
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pro')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matches table (stores analyzed replays)
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  match_id BIGINT UNIQUE NOT NULL,
  replay_file_url TEXT,
  replay_file_size INTEGER,
  game_mode VARCHAR(50),
  lobby_type VARCHAR(50),
  duration INTEGER, -- in seconds
  radiant_win BOOLEAN,
  start_time BIGINT, -- Unix timestamp
  parsed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  analysis_status VARCHAR(20) DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player performances (one per player per match)
CREATE TABLE IF NOT EXISTS player_performances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL if not the analyzer's player
  is_primary_player BOOLEAN DEFAULT false, -- true for the user who uploaded the replay
  hero_id INTEGER NOT NULL,
  hero_name VARCHAR(100),
  player_slot INTEGER NOT NULL, -- 0-9 (0-4 radiant, 128-132 dire)
  team VARCHAR(10) CHECK (team IN ('radiant', 'dire')),

  -- Core stats
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  last_hits INTEGER DEFAULT 0,
  denies INTEGER DEFAULT 0,
  gold_per_min INTEGER DEFAULT 0,
  xp_per_min INTEGER DEFAULT 0,
  hero_damage INTEGER DEFAULT 0,
  tower_damage INTEGER DEFAULT 0,
  hero_healing INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,

  -- Advanced stats
  net_worth INTEGER DEFAULT 0,
  camps_stacked INTEGER DEFAULT 0,
  runes_picked_up INTEGER DEFAULT 0,
  observer_wards_placed INTEGER DEFAULT 0,
  sentry_wards_placed INTEGER DEFAULT 0,
  wards_destroyed INTEGER DEFAULT 0,
  stuns_duration FLOAT DEFAULT 0,

  -- Item build (JSON array of item IDs)
  final_items JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mistakes/insights detected per match
CREATE TABLE IF NOT EXISTS match_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_performance_id UUID REFERENCES player_performances(id) ON DELETE CASCADE,

  insight_type VARCHAR(50) NOT NULL, -- 'mistake', 'missed_opportunity', 'good_play', etc.
  category VARCHAR(50) NOT NULL, -- 'positioning', 'itemization', 'farm_efficiency', 'vision', 'teamfight', etc.
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  game_time INTEGER, -- when it occurred (in seconds)
  title VARCHAR(255) NOT NULL,
  description TEXT,
  recommendation TEXT, -- actionable advice

  -- Location data (if applicable)
  map_x FLOAT,
  map_y FLOAT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player trends (aggregated stats over time)
CREATE TABLE IF NOT EXISTS player_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Timeframe
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Aggregated stats
  total_matches INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,

  avg_kills FLOAT DEFAULT 0,
  avg_deaths FLOAT DEFAULT 0,
  avg_assists FLOAT DEFAULT 0,
  avg_last_hits FLOAT DEFAULT 0,
  avg_gpm FLOAT DEFAULT 0,
  avg_xpm FLOAT DEFAULT 0,

  -- Mistake tracking
  total_critical_mistakes INTEGER DEFAULT 0,
  total_high_mistakes INTEGER DEFAULT 0,
  total_medium_mistakes INTEGER DEFAULT 0,

  -- Most common mistake categories (JSON array)
  top_mistake_categories JSONB,

  -- Improvement metrics
  mistake_reduction_rate FLOAT, -- percentage decrease from previous period

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, period_start, period_end)
);

-- Habit tracking (recurring patterns)
CREATE TABLE IF NOT EXISTS player_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  habit_type VARCHAR(50) NOT NULL, -- 'positioning_error', 'missed_last_hits', 'poor_ward_placement', etc.
  category VARCHAR(50) NOT NULL,

  occurrences INTEGER DEFAULT 1,
  first_detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Improvement tracking
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'improving', 'resolved')),
  improvement_percentage FLOAT DEFAULT 0,

  description TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, habit_type)
);

-- Indexes for performance
CREATE INDEX idx_matches_user_id ON matches(user_id);
CREATE INDEX idx_matches_match_id ON matches(match_id);
CREATE INDEX idx_matches_analysis_status ON matches(analysis_status);
CREATE INDEX idx_player_performances_match_id ON player_performances(match_id);
CREATE INDEX idx_player_performances_user_id ON player_performances(user_id);
CREATE INDEX idx_player_performances_primary ON player_performances(is_primary_player);
CREATE INDEX idx_match_insights_match_id ON match_insights(match_id);
CREATE INDEX idx_match_insights_player_performance_id ON match_insights(player_performance_id);
CREATE INDEX idx_match_insights_category ON match_insights(category);
CREATE INDEX idx_player_trends_user_id ON player_trends(user_id);
CREATE INDEX idx_player_habits_user_id ON player_habits(user_id);
CREATE INDEX idx_player_habits_status ON player_habits(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_habits_updated_at BEFORE UPDATE ON player_habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
