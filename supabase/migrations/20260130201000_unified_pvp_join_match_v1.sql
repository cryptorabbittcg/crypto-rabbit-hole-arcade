-- =====================================================
-- UNIFIED PVP JOIN MATCH (v1) - pvp_matches + game_code
-- =====================================================
-- For game_code-scoped PvP matches (Option A).

CREATE OR REPLACE FUNCTION public.pvp_join_match_v1(
  p_match_id uuid,
  p_game_code text,
  p_user_id uuid
)
RETURNS public.pvp_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
DECLARE
  v_match public.pvp_matches;
  v_state jsonb;
BEGIN
  SELECT *
  INTO v_match
  FROM public.pvp_matches
  WHERE id = p_match_id
    AND game_code = p_game_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'match_not_found';
  END IF;

  IF v_match.player1_id = p_user_id THEN
    RETURN v_match;
  END IF;

  IF v_match.player2_id IS NOT NULL AND v_match.player2_id <> p_user_id THEN
    RAISE EXCEPTION 'match_full';
  END IF;

  IF v_match.player2_id IS NULL THEN
    v_state := public.pvp_build_initial_game_state_v1(v_match.player1_id, p_user_id, 1);
    v_state := jsonb_set(v_state, '{phase}', to_jsonb('TURN_START'::text), true);

    UPDATE public.pvp_matches
    SET
      player2_id = p_user_id,
      match_status = 'active',
      started_at = COALESCE(started_at, now()),
      last_action_at = now(),
      game_state = v_state
    WHERE id = p_match_id
    RETURNING * INTO v_match;
  END IF;

  RETURN v_match;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_join_match_v1(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pvp_join_match_v1(uuid, text, uuid) TO service_role;

-- -----------------------------------------------------
-- Compatibility wrapper: 2-arg signature for Ape In
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.pvp_join_match_v1(
  p_match_id uuid,
  p_user_id uuid
)
RETURNS public.pvp_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
BEGIN
  RETURN public.pvp_join_match_v1(p_match_id, 'ape_in', p_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_join_match_v1(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pvp_join_match_v1(uuid, uuid) TO service_role;
