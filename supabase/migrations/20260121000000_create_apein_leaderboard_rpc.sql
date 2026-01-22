-- =====================================================
-- CREATE APE IN LEADERBOARD RPC FUNCTION
-- =====================================================
-- This function updates the leaderboard.ape_in_high_score column
-- Uses SECURITY DEFINER to bypass RLS (same pattern as Cryptoku)
-- Ensures leaderboard row exists and updates high score atomically

-- Ensure the leaderboard row exists and update ape_in_high_score to the max of current and new
CREATE OR REPLACE FUNCTION public.add_apein_leaderboard_entry(
  p_user_id UUID,
  p_score INTEGER,
  p_season INTEGER
)
RETURNS TABLE(user_id UUID, ape_in_high_score INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
BEGIN
  INSERT INTO public.leaderboard (user_id, season, ape_in_high_score)
  VALUES (p_user_id, p_season, p_score)
  ON CONFLICT (user_id)
  DO UPDATE SET
    ape_in_high_score = GREATEST(COALESCE(public.leaderboard.ape_in_high_score, 0), excluded.ape_in_high_score),
    season = excluded.season,
    updated_at = NOW();

  RETURN QUERY
  SELECT l.user_id, l.ape_in_high_score
  FROM public.leaderboard l
  WHERE l.user_id = p_user_id;
END;
$$;

-- Lock down who can call it (match how Cryptoku does it)
REVOKE ALL ON FUNCTION public.add_apein_leaderboard_entry(UUID, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_apein_leaderboard_entry(UUID, INTEGER, INTEGER) TO anon, authenticated;
