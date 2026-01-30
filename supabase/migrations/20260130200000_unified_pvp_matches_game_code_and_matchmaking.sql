-- =====================================================
-- UNIFIED PVP MATCHMAKING (pvp_matches + game_code)
-- =====================================================
-- Option A: move Ape In PvP public matchmaking onto public.pvp_matches
-- and scope matches by game_code (e.g. 'ape_in').
--
-- This migration:
-- - Adds game_code + last_action_at + forfeited_by to pvp_matches (if missing)
-- - Adds indexes for game_code + status
-- - Replaces pvp_find_or_create_public_match(p_game_code, p_user_id) to operate on pvp_matches

-- 1) Schema extensions (safe / idempotent)
ALTER TABLE public.pvp_matches
  ADD COLUMN IF NOT EXISTS game_code text;

ALTER TABLE public.pvp_matches
  ADD COLUMN IF NOT EXISTS last_action_at timestamptz;

ALTER TABLE public.pvp_matches
  ADD COLUMN IF NOT EXISTS forfeited_by uuid REFERENCES public.profiles(id);

-- Backfill any existing rows so game_code is never null for legacy data
UPDATE public.pvp_matches
SET game_code = COALESCE(game_code, 'unknown')
WHERE game_code IS NULL;

-- Optional: enforce non-null going forward (safe because we backfilled)
ALTER TABLE public.pvp_matches
  ALTER COLUMN game_code SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pvp_matches_game_code_status
  ON public.pvp_matches(game_code, match_status);

-- Strongly recommended hardening: defaults + NOT NULL for status/state
ALTER TABLE public.pvp_matches
  ALTER COLUMN match_status SET DEFAULT 'waiting';

UPDATE public.pvp_matches
SET match_status = COALESCE(match_status, 'waiting')
WHERE match_status IS NULL;

ALTER TABLE public.pvp_matches
  ALTER COLUMN match_status SET NOT NULL;

ALTER TABLE public.pvp_matches
  ALTER COLUMN game_state SET DEFAULT '{}'::jsonb;

UPDATE public.pvp_matches
SET game_state = COALESCE(game_state, '{}'::jsonb)
WHERE game_state IS NULL;

ALTER TABLE public.pvp_matches
  ALTER COLUMN game_state SET NOT NULL;

-- 2) Matchmaking RPC (game scoped)
CREATE OR REPLACE FUNCTION public.pvp_find_or_create_public_match(
  p_game_code text,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
DECLARE
  v_match_id uuid;
  v_waiting record;
  v_state jsonb;
BEGIN
  IF p_game_code IS NULL OR length(trim(p_game_code)) = 0 THEN
    RAISE EXCEPTION 'game_code_required';
  END IF;

  -- Try to atomically claim the oldest waiting match for this game.
  SELECT id, player1_id
  INTO v_waiting
  FROM public.pvp_matches
  WHERE game_code = p_game_code
    AND match_status = 'waiting'
    AND player1_id <> p_user_id
    AND player2_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_waiting.id IS NOT NULL THEN
    -- Join as player2, mark active, initialize Sandy-parity Ape In state under the unified table.
    -- We intentionally do not store "first roll reveal" fields in pvp_matches; state is authoritative.
    v_state := public.pvp_build_initial_game_state_v1(v_waiting.player1_id, p_user_id, 1);
    v_state := jsonb_set(v_state, '{phase}', to_jsonb('TURN_START'::text), true);
    UPDATE public.pvp_matches
    SET
      player2_id = p_user_id,
      match_status = 'active',
      started_at = COALESCE(started_at, now()),
      last_action_at = now(),
      game_state = v_state
    WHERE id = v_waiting.id
    RETURNING id INTO v_match_id;

    RETURN v_match_id;
  END IF;

  -- No waiting match found; create a new one as player1.
  v_state := public.pvp_build_initial_game_state_v1(p_user_id, NULL, 1);
  INSERT INTO public.pvp_matches (game_code, player1_id, match_status, created_at, game_state)
  VALUES (p_game_code, p_user_id, 'waiting', now(), v_state)
  RETURNING id INTO v_match_id;

  RETURN v_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_find_or_create_public_match(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pvp_find_or_create_public_match(text, uuid) TO service_role;

