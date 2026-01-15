-- =====================================================
-- Add Stub Leaderboard Functions
-- =====================================================
-- This migration adds stub functions for legacy leaderboard
-- RPC functions that are referenced in the frontend but may
-- not have corresponding tables/functions.
-- 
-- These stub functions return empty results gracefully,
-- preventing 404 errors on app startup.
-- =====================================================

-- =====================================================
-- GET TOP GAME SCORES (Stub)
-- =====================================================
-- Stub function that returns empty results
-- Used by arcade hub for displaying high scores widget
CREATE OR REPLACE FUNCTION get_top_game_scores(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  wallet_address TEXT,
  max_score INTEGER,
  game_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
STABLE
AS $$
BEGIN
  -- Return empty result set (no rows)
  RETURN;
END;
$$;

COMMENT ON FUNCTION get_top_game_scores(INTEGER) IS 
'Stub function that returns empty results. Used by arcade hub for legacy game_sessions table queries.';

-- =====================================================
-- GET APE IN LEADERBOARD (Stub)
-- =====================================================
-- Stub function that returns empty results
-- Used by arcade hub for displaying Ape In high scores widget
CREATE OR REPLACE FUNCTION get_ape_in_leaderboard(
  p_mode TEXT DEFAULT 'all',
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  rank INTEGER,
  user_id UUID,
  wallet_address TEXT,
  username TEXT,
  mode TEXT,
  best_score INTEGER,
  games_played INTEGER,
  last_played TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
STABLE
AS $$
BEGIN
  -- Return empty result set (no rows)
  RETURN;
END;
$$;

COMMENT ON FUNCTION get_ape_in_leaderboard(TEXT, INTEGER) IS 
'Stub function that returns empty results. Used by arcade hub for legacy Ape In leaderboard queries.';

-- =====================================================
-- Rollback Instructions
-- =====================================================
-- To rollback this migration:
--
-- DROP FUNCTION IF EXISTS get_top_game_scores(INTEGER);
-- DROP FUNCTION IF EXISTS get_ape_in_leaderboard(TEXT, INTEGER);
--
-- =====================================================

