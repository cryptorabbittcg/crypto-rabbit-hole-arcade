-- =====================================================
-- APE IN PVP MODE - PHASE 2: JOIN AND ROLL RPC
-- =====================================================
-- Atomic function to join a public match and generate first rolls
-- Phase 2: server-authoritative roll generation

CREATE OR REPLACE FUNCTION join_public_match_and_roll(
  p_match_id UUID,
  p_user_id UUID,
  p_wallet_address TEXT,
  p_username TEXT,
  p_avatar_url TEXT
)
RETURNS TABLE (
  id UUID,
  player1_id UUID,
  player2_id UUID,
  player1_address TEXT,
  player2_address TEXT,
  player1_name TEXT,
  player2_name TEXT,
  player1_avatar_url TEXT,
  player2_avatar_url TEXT,
  match_status TEXT,
  player1_roll INTEGER,
  player2_roll INTEGER,
  first_turn_player INTEGER,
  rolled_at TIMESTAMPTZ,
  roll_seed TEXT,
  created_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ
) AS $$
DECLARE
  v_match RECORD;
  v_roll1 INTEGER;
  v_roll2 INTEGER;
  v_first_turn INTEGER;
  v_tie_count INTEGER := 0;
  v_max_tie_retries INTEGER := 10;
  v_roll_seed TEXT;
BEGIN
  -- Lock the match row for update (prevents concurrent joins)
  SELECT * INTO v_match
  FROM ape_in_pvp_matches
  WHERE id = p_match_id
    AND match_type = 'public'
  FOR UPDATE;

  -- Validate match exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found or not public';
  END IF;

  -- Prevent self-join
  IF v_match.player1_id = p_user_id THEN
    RAISE EXCEPTION 'Cannot join own match';
  END IF;

  -- Phase 2 Safety Fix: Handle both "new join" and "player2 already set but rolls missing" cases
  -- If player2 is NULL, set player2 fields
  IF v_match.player2_id IS NULL THEN
    -- Set player2 fields (player2 is joining)
    UPDATE ape_in_pvp_matches
    SET 
      player2_id = p_user_id,
      player2_address = p_wallet_address,
      player2_name = p_username,
      player2_avatar_url = p_avatar_url,
      match_status = 'rolling_for_first'
    WHERE id = p_match_id;

    -- Refresh v_match to get updated data after setting player2
    SELECT * INTO v_match
    FROM ape_in_pvp_matches
    WHERE id = p_match_id;
  END IF;

  -- Generate rolls ONLY if rolled_at is NULL (prevents regeneration on refresh)
  -- This handles both:
  -- 1. New join: player2 was just set above, rolled_at is NULL
  -- 2. Safety case: player2 was set by Phase 1 RPC but Phase 2 columns are missing
  IF v_match.rolled_at IS NULL AND v_match.player2_id IS NOT NULL THEN
    -- Generate seed for logging/debugging (not used for determinism)
    v_roll_seed := encode(gen_random_bytes(16), 'hex');

    -- Generate rolls with tie-breaker logic
    -- Reroll until non-tie (max 10 attempts), then default to Player 1
    LOOP
      -- Generate two random d6 rolls (1-6)
      v_roll1 := floor(random() * 6)::INTEGER + 1;
      v_roll2 := floor(random() * 6)::INTEGER + 1;

      -- If not a tie, break
      IF v_roll1 != v_roll2 THEN
        EXIT;
      END IF;

      -- Increment tie counter
      v_tie_count := v_tie_count + 1;

      -- If max retries reached, default to Player 1
      IF v_tie_count >= v_max_tie_retries THEN
        -- Force Player 1 to win (deterministic tie-break)
        v_roll1 := 6;
        v_roll2 := 5;
        EXIT;
      END IF;
    END LOOP;

    -- Determine who goes first (higher roll wins)
    IF v_roll1 > v_roll2 THEN
      v_first_turn := 1;
    ELSE
      v_first_turn := 2;
    END IF;

    -- Update match with rolls and lock them
    UPDATE ape_in_pvp_matches
    SET 
      player1_roll = v_roll1,
      player2_roll = v_roll2,
      first_turn_player = v_first_turn,
      rolled_at = NOW(),
      roll_seed = v_roll_seed,
      match_status = 'in_progress',
      started_at = NOW()
    WHERE id = p_match_id;

    -- Refresh v_match with updated data
    SELECT * INTO v_match
    FROM ape_in_pvp_matches
    WHERE id = p_match_id;
  END IF;

  -- Return the updated match
  RETURN QUERY
  SELECT 
    v_match.id,
    v_match.player1_id,
    v_match.player2_id,
    v_match.player1_address,
    v_match.player2_address,
    v_match.player1_name,
    v_match.player2_name,
    v_match.player1_avatar_url,
    v_match.player2_avatar_url,
    v_match.match_status,
    v_match.player1_roll,
    v_match.player2_roll,
    v_match.first_turn_player,
    v_match.rolled_at,
    v_match.roll_seed,
    v_match.created_at,
    v_match.started_at;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION join_public_match_and_roll IS 'Atomically joins player2 to a public match and generates first-roll outcomes. Prevents self-join, double-join, and roll regeneration on refresh. Safety fix: Generates rolls even if player2 is already set (handles Phase 1 RPC auto-join case).';
