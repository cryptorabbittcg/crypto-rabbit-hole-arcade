-- =====================================================
-- PATCH: Add avatar_url to get_cryptoku_leaderboard RPC
-- =====================================================
-- This updates the function to return avatar_url from profiles table
-- Matching the pattern used in get_ape_in_leaderboard

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_cryptoku_leaderboard(text, integer, integer);
DROP FUNCTION IF EXISTS get_cryptoku_leaderboard(text, integer);

-- Recreate the function with avatar_url in the return type
CREATE OR REPLACE FUNCTION get_cryptoku_leaderboard(
  p_mode TEXT DEFAULT 'ALL',
  p_limit INTEGER DEFAULT 50,
  p_season INTEGER DEFAULT 1
)
RETURNS TABLE (
  rank BIGINT,
  run_id TEXT,
  user_id UUID,
  wallet_address TEXT,
  username TEXT,
  avatar_url TEXT,
  mode TEXT,
  score INTEGER,
  time_seconds INTEGER,
  hints_used INTEGER,
  errors INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_runs AS (
    SELECT 
      cl.id,
      cl.run_id,
      cl.user_id,
      cl.mode,
      cl.score,
      cl.time_seconds,
      cl.hints_used,
      cl.errors,
      cl.created_at,
      p.wallet_address,
      p.username,
      p.avatar_url,
      ROW_NUMBER() OVER (
        ORDER BY 
          CASE WHEN p_mode = 'ALL' THEN 
            CASE cl.mode WHEN 'APE' THEN 1 WHEN 'DEGEN' THEN 2 ELSE 3 END 
          ELSE 0 END,
          cl.score DESC,
          cl.time_seconds ASC
      ) as global_rank,
      ROW_NUMBER() OVER (
        PARTITION BY cl.mode 
        ORDER BY cl.score DESC, cl.time_seconds ASC
      ) as mode_rank
    FROM cryptoku_leaderboard cl
    JOIN profiles p ON cl.user_id = p.id
    WHERE 
      cl.completed = TRUE 
      AND cl.forfeited = FALSE
      AND cl.mode IN ('DEGEN', 'APE')
      AND (p_mode = 'ALL' OR cl.mode = p_mode)
      AND cl.season = p_season
  )
  SELECT 
    CASE WHEN p_mode = 'ALL' THEN rr.global_rank ELSE rr.mode_rank END as rank,
    rr.run_id,
    rr.user_id,
    rr.wallet_address,
    rr.username,
    rr.avatar_url,
    rr.mode,
    rr.score,
    rr.time_seconds,
    rr.hints_used,
    rr.errors,
    rr.created_at
  FROM ranked_runs rr
  ORDER BY 
    CASE WHEN p_mode = 'ALL' THEN 
      CASE rr.mode WHEN 'APE' THEN 1 WHEN 'DEGEN' THEN 2 ELSE 3 END 
    ELSE 0 END,
    rr.score DESC,
    rr.time_seconds ASC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these queries in Supabase SQL Editor to verify the function works correctly

-- 1. Test DEGEN mode - should return avatar_url
SELECT 
  rank,
  wallet_address,
  username,
  avatar_url,  -- This should now be populated!
  mode,
  score,
  time_seconds
FROM get_cryptoku_leaderboard('DEGEN', 10, 1)
ORDER BY rank;

-- 2. Test APE mode - should return avatar_url
SELECT 
  rank,
  wallet_address,
  username,
  avatar_url,  -- This should now be populated!
  mode,
  score,
  time_seconds
FROM get_cryptoku_leaderboard('APE', 10, 1)
ORDER BY rank;

-- 3. Test ALL mode - should return avatar_url for both modes
SELECT 
  rank,
  wallet_address,
  username,
  avatar_url,  -- This should now be populated!
  mode,
  score,
  time_seconds
FROM get_cryptoku_leaderboard('ALL', 20, 1)
ORDER BY mode, rank;

-- 4. Verify avatar_url is not null (if profiles have avatars set)
SELECT 
  COUNT(*) as total_entries,
  COUNT(avatar_url) as entries_with_avatar,
  COUNT(*) - COUNT(avatar_url) as entries_without_avatar
FROM get_cryptoku_leaderboard('ALL', 100, 1);

-- 5. Check a specific entry to see full data structure
SELECT * 
FROM get_cryptoku_leaderboard('DEGEN', 5, 1)
LIMIT 1;

-- 6. Cross-check with profiles table to verify join is working
SELECT 
  cl.rank,
  cl.wallet_address,
  cl.username as leaderboard_username,
  cl.avatar_url as leaderboard_avatar,
  p.username as profile_username,
  p.avatar_url as profile_avatar,
  CASE 
    WHEN cl.username = p.username AND cl.avatar_url = p.avatar_url THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as verification
FROM get_cryptoku_leaderboard('DEGEN', 10, 1) cl
JOIN profiles p ON p.wallet_address = cl.wallet_address
LIMIT 5;
