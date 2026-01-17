-- =====================================================
-- FIX LEADERBOARD DISPLAYS
-- =====================================================
-- Update get_leaderboard function to return win_streak
-- This fixes the "0 wins and 0 streak" issue
-- =====================================================

-- Drop and recreate function with win_streak
DROP FUNCTION IF EXISTS get_leaderboard(INTEGER);

CREATE OR REPLACE FUNCTION get_leaderboard(
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  rank INTEGER,
  user_id UUID,
  username TEXT,
  wallet_address TEXT,
  avatar_url TEXT,
  total_points INTEGER,
  total_wins INTEGER,
  win_streak INTEGER,
  card_battle_wins INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROW_NUMBER() OVER (ORDER BY l.total_points DESC)::INTEGER as rank,
    p.id as user_id,
    p.username,
    p.wallet_address,
    p.avatar_url,
    l.total_points,
    p.total_wins,
    p.win_streak,
    l.card_battle_wins
  FROM leaderboard l
  JOIN profiles p ON l.user_id = p.id
  ORDER BY l.total_points DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFY THE FIX
-- =====================================================
SELECT 
  'Function updated' as check_name,
  proname,
  pg_get_function_arguments(p.oid) as arguments,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%win_streak%' THEN '✅ Returns win_streak'
    ELSE '❌ Missing win_streak'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_leaderboard';

-- Test the function
SELECT 
  'Test function' as check_name,
  rank,
  wallet_address,
  total_points,
  total_wins,
  win_streak,
  card_battle_wins
FROM get_leaderboard(10)
LIMIT 5;
