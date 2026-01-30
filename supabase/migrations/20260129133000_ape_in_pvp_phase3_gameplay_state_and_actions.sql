-- =====================================================
-- DEPRECATED
-- =====================================================
-- This Phase 3 draft is superseded by:
-- `supabase/migrations/20260130120000_ape_in_pvp_phase3_sandy_parity_actions.sql`
-- and the namespaced Ape In RPCs:
-- `supabase/migrations/20260130150000_ape_in_pvp_namespaced_action_rpcs.sql`
--
-- Kept for history only. Do not edit.
--
-- =====================================================
-- APE IN PVP MODE - PHASE 3: GAMEPLAY STATE + ACTION RPCs
-- =====================================================
-- Implements:
-- - PvP game_state v1 initializer (seat-based, derived from Phase 2 roll fields)
-- - Server-authoritative, row-locked action functions:
--   - pvp_action_draw
--   - pvp_action_roll
--   - pvp_action_stack
--   - pvp_action_forfeit
--
-- Key invariants:
-- - turn_number increments on every accepted action
-- - only current_turn_seat can act
-- - phase gating enforced server-side
-- =====================================================

-- Build initial game_state v1 from Phase 2 roll fields and join-order player ids.
CREATE OR REPLACE FUNCTION public.pvp_build_initial_game_state_v1(
  p_player1_id uuid,
  p_player2_id uuid,
  p_first_turn_player integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
STABLE
AS $$
DECLARE
  v_seat1 uuid;
  v_seat2 uuid;
BEGIN
  IF p_player2_id IS NULL THEN
    -- Not ready yet; waiting state.
    RETURN jsonb_build_object(
      'state_version', 1,
      'turn_number', 0,
      'phase', 'WAITING_FOR_OPPONENT',
      'round_number', 0,
      'seat_map', jsonb_build_object('seat1', NULL, 'seat2', NULL),
      'current_turn_seat', NULL,
      'scores', jsonb_build_object(
        'seat1_total', 0,
        'seat2_total', 0,
        'seat1_turn', 0,
        'seat2_turn', 0
      ),
      'last_action', NULL,
      'action_counts', jsonb_build_object('seat1_actions', 0, 'seat2_actions', 0, 'total_actions', 0),
      'deck_config', jsonb_build_object('bearish_weight', 3, 'bear_minus_10_copies', 6, 'mode', 'pvp_v1')
    );
  END IF;

  IF p_first_turn_player = 1 THEN
    v_seat1 := p_player1_id;
    v_seat2 := p_player2_id;
  ELSE
    v_seat1 := p_player2_id;
    v_seat2 := p_player1_id;
  END IF;

  RETURN jsonb_build_object(
    'state_version', 1,
    'turn_number', 0,
    'phase', 'DRAW',
    'round_number', 1,
    'seat_map', jsonb_build_object(
      'seat1', v_seat1::text,
      'seat2', v_seat2::text
    ),
    'current_turn_seat', 'seat1',
    'scores', jsonb_build_object(
      'seat1_total', 0,
      'seat2_total', 0,
      'seat1_turn', 0,
      'seat2_turn', 0
    ),
    'last_draw', NULL,
    'last_roll', NULL,
    'last_action', NULL,
    'action_counts', jsonb_build_object('seat1_actions', 0, 'seat2_actions', 0, 'total_actions', 0),
    'deck_config', jsonb_build_object('bearish_weight', 3, 'bear_minus_10_copies', 6, 'mode', 'pvp_v1')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_build_initial_game_state_v1(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.pvp_build_initial_game_state_v1(uuid, uuid, integer) TO authenticated;

-- Ensure game_state is initialized to v1 once rolls exist.
CREATE OR REPLACE FUNCTION public.pvp_ensure_game_state_v1(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
VOLATILE
AS $$
DECLARE
  v_match record;
  v_state jsonb;
BEGIN
  SELECT *
  INTO v_match
  FROM public.ape_in_pvp_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Only accept v1 states that match the Phase 3 schema/phases.
  IF (v_match.game_state->>'state_version') = '1'
     AND (v_match.game_state->>'phase') IN ('WAITING_FOR_OPPONENT','FIRST_ROLL_REVEAL','DRAW','ROLL','DECISION','GAME_END')
     AND (v_match.game_state->'seat_map') IS NOT NULL THEN
    RETURN v_match.game_state;
  END IF;

  IF v_match.player2_id IS NULL OR v_match.rolled_at IS NULL OR v_match.first_turn_player IS NULL THEN
    -- Not ready to initialize yet.
    RETURN v_match.game_state;
  END IF;

  v_state := public.pvp_build_initial_game_state_v1(v_match.player1_id, v_match.player2_id, v_match.first_turn_player);

  UPDATE public.ape_in_pvp_matches
  SET game_state = v_state
  WHERE id = p_match_id;

  RETURN v_state;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_ensure_game_state_v1(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pvp_ensure_game_state_v1(uuid) TO authenticated;

-- Phase 3: Draw action
CREATE OR REPLACE FUNCTION public.pvp_action_draw(
  p_match_id uuid,
  p_actor_user_id uuid
)
RETURNS TABLE (
  id uuid,
  match_status text,
  winner_id uuid,
  forfeited_by uuid,
  last_action_at timestamptz,
  game_state jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
VOLATILE
AS $$
DECLARE
  v_match record;
  v_state jsonb;
  v_phase text;
  v_current_turn_seat text;
  v_seat_map jsonb;
  v_current_user_id uuid;
  v_now timestamptz := now();
  v_turn_number int;
  v_round_number int;
  v_bearish_weight int;
  v_bear_minus_10_copies int;
  v_roll int;
  v_total_weight int;
  v_card_kind text;
  v_card_value int;
  v_card_label text;
  v_card_id text;
BEGIN
  SELECT *
  INTO v_match
  FROM public.ape_in_pvp_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Participant check (server authoritative)
  IF v_match.player1_id <> p_actor_user_id AND v_match.player2_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Access denied: not a participant';
  END IF;

  IF v_match.match_status <> 'in_progress' THEN
    RAISE EXCEPTION 'Match not in progress';
  END IF;

  v_state := public.pvp_ensure_game_state_v1(p_match_id);
  v_phase := COALESCE(v_state->>'phase', '');

  -- Allow drawing from DRAW or DECISION (DECISION -> player chooses to continue)
  IF v_phase <> 'DRAW' AND v_phase <> 'DECISION' THEN
    RAISE EXCEPTION 'Invalid phase for draw: %', v_phase;
  END IF;

  v_current_turn_seat := COALESCE(v_state->>'current_turn_seat', '');
  v_seat_map := v_state->'seat_map';
  v_current_user_id := (v_seat_map->>v_current_turn_seat)::uuid;

  IF v_current_user_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;

  v_turn_number := COALESCE((v_state->>'turn_number')::int, 0) + 1;
  v_round_number := COALESCE((v_state->>'round_number')::int, 1);

  v_bearish_weight := COALESCE((v_state->'deck_config'->>'bearish_weight')::int, 3);
  v_bear_minus_10_copies := COALESCE((v_state->'deck_config'->>'bear_minus_10_copies')::int, 6);

  -- Minimal PvP v1 deck:
  --  - 3 bullish cards: +5, +10, +20
  --  - bearish card: -10 with tuned weight
  v_total_weight := 3 + (v_bearish_weight * GREATEST(v_bear_minus_10_copies, 1));
  v_roll := floor(random() * v_total_weight)::int + 1;

  IF v_roll <= (v_bearish_weight * GREATEST(v_bear_minus_10_copies, 1)) THEN
    v_card_kind := 'BEAR_MINUS_10';
    v_card_value := -10;
    v_card_label := 'Bearish (-10)';
  ELSE
    -- bullish choice among 3
    IF (v_roll - (v_bearish_weight * GREATEST(v_bear_minus_10_copies, 1))) = 1 THEN
      v_card_kind := 'BULL_PLUS_5';
      v_card_value := 5;
      v_card_label := 'Bullish (+5)';
    ELSIF (v_roll - (v_bearish_weight * GREATEST(v_bear_minus_10_copies, 1))) = 2 THEN
      v_card_kind := 'BULL_PLUS_10';
      v_card_value := 10;
      v_card_label := 'Bullish (+10)';
    ELSE
      v_card_kind := 'BULL_PLUS_20';
      v_card_value := 20;
      v_card_label := 'Bullish (+20)';
    END IF;
  END IF;

  v_card_id := encode(gen_random_bytes(8), 'hex');

  v_state := jsonb_set(v_state, '{turn_number}', to_jsonb(v_turn_number), true);
  v_state := jsonb_set(v_state, '{round_number}', to_jsonb(v_round_number), true);
  v_state := jsonb_set(v_state, '{phase}', to_jsonb('ROLL'::text), true);

  v_state := jsonb_set(
    v_state,
    '{last_draw}',
    jsonb_build_object('card_id', v_card_id, 'label', v_card_label, 'created_at', v_now::text),
    true
  );

  v_state := jsonb_set(
    v_state,
    '{last_action}',
    jsonb_build_object(
      'type', 'draw',
      'by_user_id', p_actor_user_id::text,
      'created_at', v_now::text,
      'details', jsonb_build_object(
        'card_kind', v_card_kind,
        'card_value', v_card_value
      )
    ),
    true
  );

  -- increment action_counts
  v_state := jsonb_set(
    v_state,
    '{action_counts}',
    jsonb_build_object(
      'seat1_actions', COALESCE((v_state->'action_counts'->>'seat1_actions')::int, 0) + CASE WHEN v_current_turn_seat = 'seat1' THEN 1 ELSE 0 END,
      'seat2_actions', COALESCE((v_state->'action_counts'->>'seat2_actions')::int, 0) + CASE WHEN v_current_turn_seat = 'seat2' THEN 1 ELSE 0 END,
      'total_actions', COALESCE((v_state->'action_counts'->>'total_actions')::int, 0) + 1
    ),
    true
  );

  UPDATE public.ape_in_pvp_matches
  SET
    game_state = v_state,
    last_action_at = v_now
  WHERE id = p_match_id;

  RETURN QUERY
  SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state
  FROM public.ape_in_pvp_matches m
  WHERE m.id = p_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_action_draw(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pvp_action_draw(uuid, uuid) TO authenticated;

-- Phase 3: Roll action
CREATE OR REPLACE FUNCTION public.pvp_action_roll(
  p_match_id uuid,
  p_actor_user_id uuid
)
RETURNS TABLE (
  id uuid,
  match_status text,
  winner_id uuid,
  forfeited_by uuid,
  last_action_at timestamptz,
  game_state jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
VOLATILE
AS $$
DECLARE
  v_match record;
  v_state jsonb;
  v_phase text;
  v_current_turn_seat text;
  v_seat_map jsonb;
  v_current_user_id uuid;
  v_now timestamptz := now();
  v_turn_number int;
  v_card_value int;
  v_die int;
  v_is_bust boolean := false;
  v_scores jsonb;
  v_turn_key text;
  v_turn_score int;
  v_new_turn_score int;
  v_next_seat text;
  v_round_number int;
BEGIN
  SELECT *
  INTO v_match
  FROM public.ape_in_pvp_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.player1_id <> p_actor_user_id AND v_match.player2_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Access denied: not a participant';
  END IF;

  IF v_match.match_status <> 'in_progress' THEN
    RAISE EXCEPTION 'Match not in progress';
  END IF;

  v_state := public.pvp_ensure_game_state_v1(p_match_id);
  v_phase := COALESCE(v_state->>'phase', '');

  IF v_phase <> 'ROLL' THEN
    RAISE EXCEPTION 'Invalid phase for roll: %', v_phase;
  END IF;

  v_current_turn_seat := COALESCE(v_state->>'current_turn_seat', '');
  v_seat_map := v_state->'seat_map';
  v_current_user_id := (v_seat_map->>v_current_turn_seat)::uuid;

  IF v_current_user_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;

  v_turn_number := COALESCE((v_state->>'turn_number')::int, 0) + 1;
  v_round_number := COALESCE((v_state->>'round_number')::int, 1);

  -- Get pending card value from last_action.details.card_value (set by draw)
  v_card_value := COALESCE((v_state->'last_action'->'details'->>'card_value')::int, 0);

  -- Roll d6 server-side
  v_die := floor(random() * 6)::int + 1;

  -- Minimal bust rule: rolling 1 ends your turn and zeros current turn score
  IF v_die = 1 THEN
    v_is_bust := true;
  END IF;

  v_scores := v_state->'scores';
  v_turn_key := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat1_turn' ELSE 'seat2_turn' END;
  v_turn_score := COALESCE((v_scores->>v_turn_key)::int, 0);

  IF v_is_bust THEN
    v_new_turn_score := 0;
  ELSE
    IF v_card_value < 0 THEN
      -- Bearish: even die dodges penalty, odd applies -10 to turn score (min 0)
      IF (v_die % 2) = 0 THEN
        v_new_turn_score := v_turn_score;
      ELSE
        v_new_turn_score := GREATEST(v_turn_score + v_card_value, 0);
      END IF;
    ELSE
      -- Bullish: add value to current turn score
      v_new_turn_score := v_turn_score + v_card_value;
    END IF;
  END IF;

  v_scores := jsonb_set(v_scores, ARRAY[v_turn_key], to_jsonb(v_new_turn_score), true);
  v_state := jsonb_set(v_state, '{scores}', v_scores, true);

  v_state := jsonb_set(v_state, '{turn_number}', to_jsonb(v_turn_number), true);
  v_state := jsonb_set(v_state, '{round_number}', to_jsonb(v_round_number), true);

  v_state := jsonb_set(
    v_state,
    '{last_roll}',
    jsonb_build_object('value', v_die, 'created_at', v_now::text),
    true
  );

  v_state := jsonb_set(
    v_state,
    '{last_action}',
    jsonb_build_object(
      'type', 'roll',
      'by_user_id', p_actor_user_id::text,
      'created_at', v_now::text,
      'details', jsonb_build_object(
        'die', v_die,
        'card_value', v_card_value,
        'bust', v_is_bust
      )
    ),
    true
  );

  -- increment action_counts
  v_state := jsonb_set(
    v_state,
    '{action_counts}',
    jsonb_build_object(
      'seat1_actions', COALESCE((v_state->'action_counts'->>'seat1_actions')::int, 0) + CASE WHEN v_current_turn_seat = 'seat1' THEN 1 ELSE 0 END,
      'seat2_actions', COALESCE((v_state->'action_counts'->>'seat2_actions')::int, 0) + CASE WHEN v_current_turn_seat = 'seat2' THEN 1 ELSE 0 END,
      'total_actions', COALESCE((v_state->'action_counts'->>'total_actions')::int, 0) + 1
    ),
    true
  );

  IF v_is_bust THEN
    -- End turn immediately, switch to opponent and go to DRAW
    v_next_seat := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat2' ELSE 'seat1' END;
    v_state := jsonb_set(v_state, '{current_turn_seat}', to_jsonb(v_next_seat), true);
    v_state := jsonb_set(v_state, '{phase}', to_jsonb('DRAW'::text), true);
    -- Full-round semantics: round_number increments only when seat2 finishes a turn (seat2 -> seat1).
    IF v_current_turn_seat = 'seat2' THEN
      v_state := jsonb_set(v_state, '{round_number}', to_jsonb(v_round_number + 1), true);
    END IF;
  ELSE
    v_state := jsonb_set(v_state, '{phase}', to_jsonb('DECISION'::text), true);
  END IF;

  UPDATE public.ape_in_pvp_matches
  SET
    game_state = v_state,
    last_action_at = v_now
  WHERE id = p_match_id;

  RETURN QUERY
  SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state
  FROM public.ape_in_pvp_matches m
  WHERE m.id = p_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_action_roll(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pvp_action_roll(uuid, uuid) TO authenticated;

-- Phase 3: Stack action
CREATE OR REPLACE FUNCTION public.pvp_action_stack(
  p_match_id uuid,
  p_actor_user_id uuid
)
RETURNS TABLE (
  id uuid,
  match_status text,
  winner_id uuid,
  forfeited_by uuid,
  last_action_at timestamptz,
  game_state jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
VOLATILE
AS $$
DECLARE
  v_match record;
  v_state jsonb;
  v_phase text;
  v_current_turn_seat text;
  v_seat_map jsonb;
  v_current_user_id uuid;
  v_now timestamptz := now();
  v_turn_number int;
  v_scores jsonb;
  v_total_key text;
  v_turn_key text;
  v_total int;
  v_turn int;
  v_new_total int;
  v_next_seat text;
  v_round_number int;
BEGIN
  SELECT *
  INTO v_match
  FROM public.ape_in_pvp_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.player1_id <> p_actor_user_id AND v_match.player2_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Access denied: not a participant';
  END IF;

  IF v_match.match_status <> 'in_progress' THEN
    RAISE EXCEPTION 'Match not in progress';
  END IF;

  v_state := public.pvp_ensure_game_state_v1(p_match_id);
  v_phase := COALESCE(v_state->>'phase', '');

  IF v_phase <> 'DECISION' THEN
    RAISE EXCEPTION 'Invalid phase for stack: %', v_phase;
  END IF;

  v_current_turn_seat := COALESCE(v_state->>'current_turn_seat', '');
  v_seat_map := v_state->'seat_map';
  v_current_user_id := (v_seat_map->>v_current_turn_seat)::uuid;

  IF v_current_user_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;

  v_turn_number := COALESCE((v_state->>'turn_number')::int, 0) + 1;
  v_round_number := COALESCE((v_state->>'round_number')::int, 1);

  v_scores := v_state->'scores';
  v_total_key := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat1_total' ELSE 'seat2_total' END;
  v_turn_key := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat1_turn' ELSE 'seat2_turn' END;

  v_total := COALESCE((v_scores->>v_total_key)::int, 0);
  v_turn := COALESCE((v_scores->>v_turn_key)::int, 0);
  v_new_total := v_total + v_turn;

  v_scores := jsonb_set(v_scores, ARRAY[v_total_key], to_jsonb(v_new_total), true);
  v_scores := jsonb_set(v_scores, ARRAY[v_turn_key], to_jsonb(0), true);
  v_state := jsonb_set(v_state, '{scores}', v_scores, true);

  v_state := jsonb_set(v_state, '{turn_number}', to_jsonb(v_turn_number), true);

  v_state := jsonb_set(
    v_state,
    '{last_action}',
    jsonb_build_object(
      'type', 'stack',
      'by_user_id', p_actor_user_id::text,
      'created_at', v_now::text,
      'details', jsonb_build_object(
        'banked', v_turn,
        'new_total', v_new_total
      )
    ),
    true
  );

  -- increment action_counts
  v_state := jsonb_set(
    v_state,
    '{action_counts}',
    jsonb_build_object(
      'seat1_actions', COALESCE((v_state->'action_counts'->>'seat1_actions')::int, 0) + CASE WHEN v_current_turn_seat = 'seat1' THEN 1 ELSE 0 END,
      'seat2_actions', COALESCE((v_state->'action_counts'->>'seat2_actions')::int, 0) + CASE WHEN v_current_turn_seat = 'seat2' THEN 1 ELSE 0 END,
      'total_actions', COALESCE((v_state->'action_counts'->>'total_actions')::int, 0) + 1
    ),
    true
  );

  IF v_new_total >= 150 THEN
    -- Win condition reached
    v_state := jsonb_set(v_state, '{phase}', to_jsonb('GAME_END'::text), true);
    UPDATE public.ape_in_pvp_matches
    SET
      game_state = v_state,
      last_action_at = v_now,
      match_status = 'completed',
      winner_id = p_actor_user_id,
      ended_at = v_now
    WHERE id = p_match_id;
  ELSE
    -- Switch turn
    v_next_seat := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat2' ELSE 'seat1' END;
    v_state := jsonb_set(v_state, '{current_turn_seat}', to_jsonb(v_next_seat), true);
    v_state := jsonb_set(v_state, '{phase}', to_jsonb('DRAW'::text), true);
    -- Full-round semantics: round_number increments only when seat2 finishes a turn (seat2 -> seat1).
    IF v_current_turn_seat = 'seat2' THEN
      v_state := jsonb_set(v_state, '{round_number}', to_jsonb(v_round_number + 1), true);
    END IF;

    UPDATE public.ape_in_pvp_matches
    SET
      game_state = v_state,
      last_action_at = v_now
    WHERE id = p_match_id;
  END IF;

  RETURN QUERY
  SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state
  FROM public.ape_in_pvp_matches m
  WHERE m.id = p_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_action_stack(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pvp_action_stack(uuid, uuid) TO authenticated;

-- Phase 3: Forfeit action
CREATE OR REPLACE FUNCTION public.pvp_action_forfeit(
  p_match_id uuid,
  p_actor_user_id uuid
)
RETURNS TABLE (
  id uuid,
  match_status text,
  winner_id uuid,
  forfeited_by uuid,
  last_action_at timestamptz,
  game_state jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
VOLATILE
AS $$
DECLARE
  v_match record;
  v_state jsonb;
  v_now timestamptz := now();
  v_opponent uuid;
BEGIN
  SELECT *
  INTO v_match
  FROM public.ape_in_pvp_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.player1_id <> p_actor_user_id AND v_match.player2_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Access denied: not a participant';
  END IF;

  IF v_match.match_status <> 'in_progress' THEN
    RAISE EXCEPTION 'Match not in progress';
  END IF;

  v_opponent := CASE WHEN v_match.player1_id = p_actor_user_id THEN v_match.player2_id ELSE v_match.player1_id END;

  v_state := public.pvp_ensure_game_state_v1(p_match_id);
  v_state := jsonb_set(v_state, '{phase}', to_jsonb('GAME_END'::text), true);
  v_state := jsonb_set(
    v_state,
    '{last_action}',
    jsonb_build_object('type', 'forfeit', 'by_user_id', p_actor_user_id::text, 'created_at', v_now::text, 'details', jsonb_build_object()),
    true
  );

  UPDATE public.ape_in_pvp_matches
  SET
    match_status = 'forfeited',
    forfeited_by = p_actor_user_id,
    winner_id = v_opponent,
    ended_at = v_now,
    last_action_at = v_now,
    game_state = v_state
  WHERE id = p_match_id;

  RETURN QUERY
  SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state
  FROM public.ape_in_pvp_matches m
  WHERE m.id = p_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_action_forfeit(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pvp_action_forfeit(uuid, uuid) TO authenticated;

