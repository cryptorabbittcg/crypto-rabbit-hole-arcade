-- =====================================================
-- VERIFY POINTS ARE CLEARED
-- =====================================================
-- Check that points are reset in profiles and leaderboard
-- =====================================================

-- =====================================================
-- CHECK 1: Profile Points
-- =====================================================
SELECT 
  'Profile points' as check_name,
  wallet_address,
  points,
  total_points,
  CASE 
    WHEN points = 0 THEN '✅ Points cleared'
    ELSE '❌ Points still exist'
  END as status
FROM profiles
ORDER BY points DESC
LIMIT 10;

-- =====================================================
-- CHECK 2: Leaderboard Points
-- =====================================================
SELECT 
  'Leaderboard points' as check_name,
  p.wallet_address,
  l.total_points,
  l.cryptoku_high_score,
  l.ape_in_high_score,
  CASE 
    WHEN l.total_points = 0 AND l.cryptoku_high_score = 0 AND l.ape_in_high_score = 0 THEN '✅ All cleared'
    ELSE '⚠️ Some scores remain'
  END as status
FROM leaderboard l
JOIN profiles p ON l.user_id = p.id
ORDER BY l.total_points DESC
LIMIT 10;

-- =====================================================
-- CHECK 3: Points Transactions
-- =====================================================
SELECT 
  'Points transactions' as check_name,
  COUNT(*) as remaining_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All points transactions cleared'
    ELSE '⚠️ Some points transactions remain'
  END as status
FROM transactions
WHERE currency = 'points';

-- =====================================================
-- CHECK 4: Summary
-- =====================================================
SELECT 
  '=== POINTS CLEARED SUMMARY ===' as summary,
  (SELECT COUNT(*) FROM profiles WHERE points > 0) as profiles_with_points,
  (SELECT SUM(points) FROM profiles) as total_profile_points,
  (SELECT SUM(total_points) FROM leaderboard) as total_leaderboard_points,
  (SELECT COUNT(*) FROM transactions WHERE currency = 'points') as points_transactions,
  CASE 
    WHEN (SELECT COUNT(*) FROM profiles WHERE points > 0) = 0 
      AND (SELECT SUM(total_points) FROM leaderboard) = 0
      AND (SELECT COUNT(*) FROM transactions WHERE currency = 'points') = 0
    THEN '✅ ALL POINTS CLEARED'
    ELSE '⚠️ Some points remain'
  END as final_status;
