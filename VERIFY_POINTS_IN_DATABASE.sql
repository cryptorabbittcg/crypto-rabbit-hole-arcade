-- =====================================================
-- VERIFY POINTS IN DATABASE
-- =====================================================
-- Check if points are actually 0 in the database
-- =====================================================

-- =====================================================
-- CHECK 1: All Profile Points
-- =====================================================
SELECT 
  'Profile points check' as check_name,
  wallet_address,
  points,
  ape_balance,
  tickets,
  total_games_played,
  total_wins,
  CASE 
    WHEN points = 0 THEN '✅ Points cleared'
    ELSE '❌ Points NOT cleared: ' || points::text
  END as status
FROM profiles
ORDER BY points DESC
LIMIT 10;

-- =====================================================
-- CHECK 2: Summary
-- =====================================================
SELECT 
  'Points summary' as check_name,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN points > 0 THEN 1 END) as profiles_with_points,
  SUM(points) as total_points,
  MAX(points) as max_points,
  CASE 
    WHEN SUM(points) = 0 THEN '✅ ALL POINTS CLEARED IN DATABASE'
    ELSE '❌ Points still exist in database: ' || SUM(points)::text
  END as status
FROM profiles;

-- =====================================================
-- CHECK 3: Leaderboard Points
-- =====================================================
SELECT 
  'Leaderboard points' as check_name,
  p.wallet_address,
  l.total_points,
  p.points as profile_points,
  CASE 
    WHEN l.total_points = 0 AND p.points = 0 THEN '✅ Both cleared'
    ELSE '⚠️ Mismatch - Leaderboard: ' || l.total_points::text || ', Profile: ' || p.points::text
  END as status
FROM leaderboard l
JOIN profiles p ON l.user_id = p.id
ORDER BY l.total_points DESC
LIMIT 10;
