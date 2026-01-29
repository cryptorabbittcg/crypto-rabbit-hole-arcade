-- =====================================================
-- APE IN PVP MODE - PHASE 3: UPDATE MATCHMAKING/JOIN RPCs
-- =====================================================
-- This migration upgrades Phase 1/2 RPCs to initialize PvP game_state v1
-- deterministically from Phase 2 roll fields (seat-based).
--
-- IMPORTANT: This is done in a new migration (2026) so we don't break
-- fresh DB setups that run 2025 migrations first.
-- =====================================================

CREATE OR REPLACE FUNCTION public.pvp_find_or_create_public_match(
  p_user_id uuid,
  p_wallet_address text,
  p_username text,
  p_avatar_url text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
DECLARE
  v_match_id uuid;
  v_waiting_match record;
  v_initial_state jsonb;
  v_roll1 integer;
  v_roll2 integer;
  v_first_turn integer;
  v_tie_count integer := 0;
  v_max_tie_retries integer := 10;
  v_roll_seed text;
BEGIN
  SELECT id, player1_id INTO v_waiting_match
  FROM public.ape_in_pvp_matches
  WHERE match_status = 'waiting'
    AND match_type = 'public'
    AND player1_id <> p_user_id
    AND player2_id IS NULL
    AND rolled_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_waiting_match.id IS NOT NULL THEN
    v_roll_seed := encode(gen_random_bytes(16), 'hex');
    v_tie_count := 0;

    LOOP
      v_roll1 := floor(random() * 6)::integer + 1;
      v_roll2 := floor(random() * 6)::integer + 1;

      IF v_roll1 != v_roll2 THEN
        EXIT;
      END IF;

      v_tie_count := v_tie_count + 1;
      IF v_tie_count >= v_max_tie_retries THEN
        v_roll1 := 6;
        v_roll2 := 5;
        EXIT;
      END IF;
    END LOOP;

    v_first_turn := CASE WHEN v_roll1 > v_roll2 THEN 1 ELSE 2 END;

    v_initial_state := public.pvp_build_initial_game_state_v1(
      v_waiting_match.player1_id,
      p_user_id,
      v_first_turn
    );

    UPDATE public.ape_in_pvp_matches
    SET
      player2_id = p_user_id,
      player2_address = p_wallet_address,
      player2_name = p_username,
      player2_avatar_url = p_avatar_url,
      match_status = 'in_progress',
      started_at = now(),
      last_action_at = now(),
      -- legacy fields (mirrored from Phase 2 rolls)
      first_roll_seat1 = v_roll1,
      first_roll_seat2 = v_roll2,
      first_roll_revealed_seat1 = false,
      first_roll_revealed_seat2 = false,
      -- Phase 2 roll fields (source of truth)
      player1_roll = v_roll1,
      player2_roll = v_roll2,
      first_turn_player = v_first_turn,
      rolled_at = now(),
      roll_seed = v_roll_seed,
      -- Phase 3 state
      game_state = v_initial_state
    WHERE id = v_waiting_match.id
    RETURNING id INTO v_match_id;

    IF v_match_id IS NULL THEN
      RAISE EXCEPTION 'Failed to claim waiting match: update returned no rows';
    END IF;

    RETURN v_match_id;
  ELSE
    v_initial_state := public.pvp_build_initial_game_state_v1(p_user_id, NULL, NULL);

    INSERT INTO public.ape_in_pvp_matches (
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
      now()
    )
    RETURNING id INTO v_match_id;

    RETURN v_match_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_find_or_create_public_match(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pvp_find_or_create_public_match(uuid, text, text, text) TO service_role;

COMMENT ON FUNCTION public.pvp_find_or_create_public_match IS
'Phase 3: Atomic public matchmaking. When auto-joining player2, generates Phase 2 roll fields and initializes game_state v1 seat-based (phase=DRAW, current_turn_seat=seat1).';


CREATE OR REPLACE FUNCTION public.join_public_match_and_roll(
  p_match_id uuid,
  p_user_id uuid,
  p_wallet_address text,
  p_username text,
  p_avatar_url text
)
RETURNS TABLE (
  id uuid,
  player1_id uuid,
  player2_id uuid,
  player1_address text,
  player2_address text,
  player1_name text,
  player2_name text,
  player1_avatar_url text,
  player2_avatar_url text,
  match_status text,
  player1_roll integer,
  player2_roll integer,
  first_turn_player integer,
  rolled_at timestamptz,
  roll_seed text,
  created_at timestamptz,
  started_at timestamptz,
  game_state jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
DECLARE
  v_match record;
  v_roll1 integer;
  v_roll2 integer;
  v_first_turn integer;
  v_tie_count integer := 0;
  v_max_tie_retries integer := 10;
  v_roll_seed text;
  v_initial_state jsonb;
BEGIN
  SELECT * INTO v_match
  FROM public.ape_in_pvp_matches
  WHERE id = p_match_id
    AND match_type = 'public'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found or not public';
  END IF;

  IF v_match.player1_id = p_user_id THEN
    RAISE EXCEPTION 'Cannot join own match';
  END IF;

  IF v_match.player2_id IS NULL THEN
    UPDATE public.ape_in_pvp_matches
    SET
      player2_id = p_user_id,
      player2_address = p_wallet_address,
      player2_name = p_username,
      player2_avatar_url = p_avatar_url,
      match_status = 'rolling_for_first'
    WHERE id = p_match_id;

    SELECT * INTO v_match
    FROM public.ape_in_pvp_matches
    WHERE id = p_match_id;
  END IF;

  IF v_match.rolled_at IS NULL AND v_match.player2_id IS NOT NULL THEN
    v_roll_seed := encode(gen_random_bytes(16), 'hex');

    LOOP
      v_roll1 := floor(random() * 6)::integer + 1;
      v_roll2 := floor(random() * 6)::integer + 1;

      IF v_roll1 != v_roll2 THEN
        EXIT;
      END IF;

      v_tie_count := v_tie_count + 1;
      IF v_tie_count >= v_max_tie_retries THEN
        v_roll1 := 6;
        v_roll2 := 5;
        EXIT;
      END IF;
    END LOOP;

    v_first_turn := CASE WHEN v_roll1 > v_roll2 THEN 1 ELSE 2 END;

    v_initial_state := public.pvp_build_initial_game_state_v1(
      v_match.player1_id,
      v_match.player2_id,
      v_first_turn
    );

    UPDATE public.ape_in_pvp_matches
    SET
      player1_roll = v_roll1,
      player2_roll = v_roll2,
      first_turn_player = v_first_turn,
      rolled_at = now(),
      roll_seed = v_roll_seed,
      match_status = 'in_progress',
      started_at = now(),
      last_action_at = now(),
      -- legacy fields mirrored
      first_roll_seat1 = v_roll1,
      first_roll_seat2 = v_roll2,
      first_roll_revealed_seat1 = false,
      first_roll_revealed_seat2 = false,
      -- Phase 3 state
      game_state = v_initial_state
    WHERE id = p_match_id;

    SELECT * INTO v_match
    FROM public.ape_in_pvp_matches
    WHERE id = p_match_id;
  END IF;

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
    v_match.started_at,
    v_match.game_state;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_public_match_and_roll(uuid, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_public_match_and_roll(uuid, uuid, text, text, text) TO service_role;

COMMENT ON FUNCTION public.join_public_match_and_roll IS
'Phase 3: Joins player2 to a public match and generates Phase 2 roll fields exactly once; initializes game_state v1 seat-based (phase=DRAW, current_turn_seat=seat1) when rolls are generated.';

