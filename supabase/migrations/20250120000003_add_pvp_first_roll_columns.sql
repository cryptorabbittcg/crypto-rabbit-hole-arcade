-- =====================================================
-- APE IN PVP MODE - PHASE 2: FIRST ROLL COLUMNS
-- =====================================================
-- Adds columns to store first-roll outcomes atomically
-- Phase 2: server-authoritative roll generation

-- Add roll outcome columns
ALTER TABLE ape_in_pvp_matches
  ADD COLUMN IF NOT EXISTS player1_roll INTEGER NULL,
  ADD COLUMN IF NOT EXISTS player2_roll INTEGER NULL,
  ADD COLUMN IF NOT EXISTS first_turn_player INTEGER NULL, -- 1 or 2
  ADD COLUMN IF NOT EXISTS rolled_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS roll_seed TEXT NULL; -- Optional: for replay/debug/idempotency

-- Add constraint: first_turn_player must be 1 or 2 if set
ALTER TABLE ape_in_pvp_matches
  ADD CONSTRAINT check_first_turn_player CHECK (first_turn_player IS NULL OR first_turn_player IN (1, 2));

-- Add constraint: rolls must be 1-6 if set
ALTER TABLE ape_in_pvp_matches
  ADD CONSTRAINT check_player1_roll_range CHECK (player1_roll IS NULL OR (player1_roll >= 1 AND player1_roll <= 6)),
  ADD CONSTRAINT check_player2_roll_range CHECK (player2_roll IS NULL OR (player2_roll >= 1 AND player2_roll <= 6));

-- Add index for finding matches ready for roll resolution
CREATE INDEX IF NOT EXISTS idx_ape_in_pvp_matches_rolling_for_first 
  ON ape_in_pvp_matches(match_status, rolled_at) 
  WHERE match_status = 'rolling_for_first' AND rolled_at IS NULL;

-- Comments
COMMENT ON COLUMN ape_in_pvp_matches.player1_roll IS 'First roll outcome for player1 (1-6), generated atomically when player2 joins';
COMMENT ON COLUMN ape_in_pvp_matches.player2_roll IS 'First roll outcome for player2 (1-6), generated atomically when player2 joins';
COMMENT ON COLUMN ape_in_pvp_matches.first_turn_player IS 'Which player goes first (1 or 2), determined by higher roll';
COMMENT ON COLUMN ape_in_pvp_matches.rolled_at IS 'Timestamp when rolls were generated and locked (prevents regeneration on refresh)';
COMMENT ON COLUMN ape_in_pvp_matches.roll_seed IS 'Optional seed for replay/debugging (not used for determinism, just logging)';
