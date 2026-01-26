-- =====================================================
-- PATCH: support p_mode in ('best','all') for get_ape_in_leaderboard
-- =====================================================
-- This updates the function to support:
--   - p_mode = 'best' or 'all' → returns top rows across ALL Ape In modes
--   - p_mode = 'aida'/'lana'/'nifty'/'enj1n' → existing behavior (filter to that mode)
--
-- After running this in Supabase SQL Editor:
--   1. Go to Supabase Dashboard → Settings → API → Reload schema
--   2. Wait 10-20 seconds
--   3. Hard refresh your site (Ctrl+Shift+R / Cmd+Shift+R)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_ape_in_leaderboard(p_mode text, p_limit integer DEFAULT 100)
RETURNS TABLE(user_id uuid, wallet_address text, username text, avatar_url text, score integer, ended_at timestamptz, mode text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog, public'
AS $function$
  WITH current_season AS (
    SELECT COALESCE(MAX(season), 1) AS season
    FROM public.game_sessions
    WHERE game_type = 'ape_in'
  )
  SELECT
    a.user_id,
    p.wallet_address,
    p.username,
    p.avatar_url,
    a.best_score AS score,
    a.best_ended_at AS ended_at,
    a.mode AS mode
  FROM public.ape_in_leaderboard a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE (
    lower(p_mode) IN ('best','all')
    OR a.mode = lower(p_mode)
  )
    AND a.season = (SELECT season FROM current_season)
    AND a.best_score > 0
  ORDER BY a.best_score DESC, a.best_ended_at DESC
  LIMIT GREATEST(p_limit, 1);
$function$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after applying the patch to verify it works:
--
-- -- Test individual modes (should work as before):
-- SELECT * FROM public.get_ape_in_leaderboard('aida', 5);
-- SELECT * FROM public.get_ape_in_leaderboard('lana', 5);
-- SELECT * FROM public.get_ape_in_leaderboard('nifty', 5);
-- SELECT * FROM public.get_ape_in_leaderboard('enj1n', 5);
--
-- -- Test 'best' mode (should return rows from all modes):
-- SELECT * FROM public.get_ape_in_leaderboard('best', 5);
--
-- -- Test 'all' mode (should return rows from all modes):
-- SELECT * FROM public.get_ape_in_leaderboard('all', 5);
-- =====================================================
