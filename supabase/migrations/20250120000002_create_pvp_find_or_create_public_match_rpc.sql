-- =====================================================
-- APE IN PVP MODE - MATCHMAKING RPC
-- =====================================================
-- Atomic function to find or create public matches
-- Phase 1: matching infrastructure

CREATE OR REPLACE FUNCTION pvp_find_or_create_public_match(
  p_user_id UUID,
  p_wallet_address TEXT,
  p_username TEXT,
  p_avatar_url TEXT
)
RETURNS UUID AS $$
DECLARE
  v_match_id UUID;
  v_waiting_match RECORD;
  v_initial_state JSONB;
  -- Phase 2: Roll generation variables (also used for legacy fields)
  v_roll1 INTEGER;
  v_roll2 INTEGER;
  v_first_turn INTEGER;
  v_tie_count INTEGER := 0;
  v_max_tie_retries INTEGER := 10;
  v_roll_seed TEXT;
BEGIN
  -- Lock and find one waiting match (SKIP LOCKED prevents blocking)
  -- Exclude self-matches and ensure player2 is NULL (defensive)
  -- Phase 2: Also ensure rolled_at is NULL (prevent re-claiming matches that already have rolls)
  SELECT id, player1_id INTO v_waiting_match
  FROM ape_in_pvp_matches
  WHERE match_status = 'waiting'
    AND match_type = 'public'
    AND player1_id <> p_user_id  -- Prevent matching into own waiting match
    AND player2_id IS NULL       -- Defensive: ensure no player2 exists
    AND rolled_at IS NULL        -- Phase 2: Prevent re-claiming matches that already have rolls
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF v_waiting_match.id IS NOT NULL THEN
    -- Phase 2: Generate rolls for Phase 2 columns (player1_roll, player2_roll, first_turn_player)
    -- Generate seed for logging/debugging
    v_roll_seed := encode(gen_random_bytes(16), 'hex');
    
    -- Reset tie counter
    v_tie_count := 0;
    
    -- Generate rolls with tie-breaker logic (same as Phase 2 RPC)
    LOOP
      v_roll1 := floor(random() * 6)::INTEGER + 1;
      v_roll2 := floor(random() * 6)::INTEGER + 1;
      
      IF v_roll1 != v_roll2 THEN
        EXIT;
      END IF;
      
      v_tie_count := v_tie_count + 1;
      
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
    
    -- Initialize game_state with strict schema
    v_initial_state := jsonb_build_object(
      'state_version', 1,
      'turn_number', 0,
      'phase', 'FIRST_ROLL_P1',
      'round_number', 0,
      'seat_map', jsonb_build_object(
        'seat1', v_waiting_match.player1_id::text,  -- Temporary: will be reassigned after rolls
        'seat2', p_user_id::text
      ),
      'current_turn_seat', NULL,
      'scores', jsonb_build_object(
        'seat1_total', 0,
        'seat2_total', 0,
        'seat1_turn', 0,
        'seat2_turn', 0
      ),
      'last_action', NULL,
      'action_counts', jsonb_build_object(
        'seat1_actions', 0,
        'seat2_actions', 0,
        'total_actions', 0
      ),
      'deck_config', jsonb_build_object(
        'bearish_weight', 3,
        'bear_minus_10_copies', 6,
        'mode', 'pvp_v1'
      )
    );
    
    -- Claim the waiting match as player2 and initialize for first-player roll
    -- Phase 2: Also populate Phase 2 roll columns
    UPDATE ape_in_pvp_matches
    SET 
      player2_id = p_user_id,
      player2_address = p_wallet_address,
      player2_name = p_username,
      player2_avatar_url = p_avatar_url,
      match_status = 'in_progress',  -- Phase 2: Set directly to in_progress since rolls are generated
      started_at = NOW(),
      last_action_at = NOW(),
      -- Phase 1 legacy fields (kept for backward compatibility, set equal to Phase 2 rolls)
      first_roll_seat1 = v_roll1,  -- Use Phase 2 roll values (tie-breaker enforced)
      first_roll_seat2 = v_roll2,
      first_roll_revealed_seat1 = FALSE,
      first_roll_revealed_seat2 = FALSE,
      -- Phase 2 roll columns (source of truth)
      player1_roll = v_roll1,
      player2_roll = v_roll2,
      first_turn_player = v_first_turn,
      rolled_at = NOW(),
      roll_seed = v_roll_seed,
      game_state = v_initial_state
    WHERE id = v_waiting_match.id
    RETURNING id INTO v_match_id;
    
    -- Assert that the update actually claimed the row
    IF v_match_id IS NULL THEN
      RAISE EXCEPTION 'Failed to claim waiting match: update returned no rows';
    END IF;
    
    RETURN v_match_id;
  ELSE
    -- Create new waiting match as player1
    v_initial_state := jsonb_build_object(
      'state_version', 1,
      'turn_number', 0,
      'phase', 'WAITING_FOR_OPPONENT',
      'round_number', 0,
      'seat_map', jsonb_build_object(
        'seat1', NULL,
        'seat2', NULL
      ),
      'current_turn_seat', NULL,
      'scores', jsonb_build_object(
        'seat1_total', 0,
        'seat2_total', 0,
        'seat1_turn', 0,
        'seat2_turn', 0
      ),
      'last_action', NULL,
      'action_counts', jsonb_build_object(
        'seat1_actions', 0,
        'seat2_actions', 0,
        'total_actions', 0
      ),
      'deck_config', jsonb_build_object(
        'bearish_weight', 3,
        'bear_minus_10_copies', 6,
        'mode', 'pvp_v1'
      )
    );
    
    INSERT INTO ape_in_pvp_matches (
      player1_id,
      player1_address,
      player1_name,
      player1_avatar_url,
      match_type,
      match_status,
      game_state,
      last_action_at
    )
    VALUES (
      p_user_id,
      p_wallet_address,
      p_username,
      p_avatar_url,
      'public',
      'waiting',
      v_initial_state,
      NOW()
    )
    RETURNING id INTO v_match_id;
    
    RETURN v_match_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to authenticated users (though it will be called via service-role)
GRANT EXECUTE ON FUNCTION pvp_find_or_create_public_match TO authenticated;
GRANT EXECUTE ON FUNCTION pvp_find_or_create_public_match TO service_role;

COMMENT ON FUNCTION pvp_find_or_create_public_match IS 'Atomically finds waiting public match or creates new one. Prevents double-join bugs using FOR UPDATE SKIP LOCKED. Phase 2: When auto-joining player2, also generates Phase 2 roll columns (player1_roll, player2_roll, first_turn_player, rolled_at).';
