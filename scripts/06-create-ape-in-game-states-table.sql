-- =====================================================
-- APE IN ACTIVE GAME STATES TABLE
-- =====================================================
-- Stores active Ape In game states in Supabase
-- This replaces Vercel KV for game state persistence

CREATE TABLE IF NOT EXISTS ape_in_game_states (
  game_id TEXT PRIMARY KEY,
  
  -- Game state stored as JSONB (flexible schema)
  game_state JSONB NOT NULL,
  
  -- Metadata for cleanup
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ape_in_game_states_expires ON ape_in_game_states(expires_at);

-- Index for game state queries
CREATE INDEX IF NOT EXISTS idx_ape_in_game_states_game_state ON ape_in_game_states USING GIN(game_state);

-- Update trigger for updated_at
DROP TRIGGER IF EXISTS update_ape_in_game_states_updated_at ON ape_in_game_states;
CREATE TRIGGER update_ape_in_game_states_updated_at
  BEFORE UPDATE ON ape_in_game_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired games (can be run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_ape_in_games()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ape_in_game_states
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE ape_in_game_states IS 'Active Ape In game states (expires after 24 hours)';

