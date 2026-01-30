-- =====================================================
-- APE IN PVP MODE - JOIN MATCH (v1)
-- =====================================================
-- Fills player2_id and flips match to active.
-- Also ensures game_state is no longer stuck in WAITING_FOR_OPPONENT.

CREATE OR REPLACE FUNCTION public.ape_in_pvp_join_match_v1(
  p_match_id uuid,
  p_user_id uuid
)
RETURNS public.ape_in_pvp_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.ape_in_pvp_matches;
BEGIN
  -- Lock the match row
  SELECT *
  INTO v_match
  FROM public.ape_in_pvp_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'match_not_found';
  END IF;

  -- If the joiner is already player1, just return
  IF v_match.player1_id = p_user_id THEN
    RETURN v_match;
  END IF;

  -- If slot is taken by someone else, block
  IF v_match.player2_id IS NOT NULL AND v_match.player2_id <> p_user_id THEN
    RAISE EXCEPTION 'match_full';
  END IF;

  -- Fill player2 if empty
  IF v_match.player2_id IS NULL THEN
    UPDATE public.ape_in_pvp_matches
    SET
      player2_id = p_user_id,
      match_status = 'active',
      started_at = COALESCE(started_at, now()),
      game_state = jsonb_set(
        jsonb_set(
          jsonb_set(
            COALESCE(game_state, '{}'::jsonb),
            '{seat_map,seat1}',
            to_jsonb(v_match.player1_id),
            true
          ),
          '{seat_map,seat2}',
          to_jsonb(p_user_id),
          true
        ),
        '{current_turn_seat}',
        to_jsonb('seat1'::text),
        true
      )
    WHERE id = p_match_id
    RETURNING *
    INTO v_match;
  END IF;

  -- Ensure phase is not stuck waiting
  IF COALESCE(v_match.game_state->>'phase','') = 'WAITING_FOR_OPPONENT' THEN
    UPDATE public.ape_in_pvp_matches
    SET game_state = jsonb_set(game_state, '{phase}', to_jsonb('TURN_START'::text), true)
    WHERE id = p_match_id
    RETURNING * INTO v_match;
  END IF;

  RETURN v_match;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ape_in_pvp_join_match_v1(uuid, uuid) TO authenticated, service_role;

