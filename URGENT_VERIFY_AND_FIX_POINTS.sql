-- =====================================================
-- URGENT: Verify Points in Database and Fix if Needed
-- =====================================================
-- Check if points are actually 0, and if not, fix them
-- =====================================================

-- =====================================================
-- CHECK 1: Current Points Status
-- =====================================================
SELECT 
  'Current points status' as check_name,
  wallet_address,
  points,
  ape_balance,
  tickets,
  CASE 
    WHEN points = 0 THEN '✅ Points are 0'
    ELSE '❌ Points NOT cleared: ' || points::text
  END as status
FROM profiles
ORDER BY points DESC
LIMIT 10;

-- =====================================================
-- CHECK 2: Points Summary
-- =====================================================
SELECT 
  'Points summary' as check_name,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN points > 0 THEN 1 END) as profiles_with_points,
  SUM(points) as total_points,
  MAX(points) as max_points,
  CASE 
    WHEN SUM(points) = 0 THEN '✅ ALL POINTS ARE 0'
    WHEN SUM(points) > 0 THEN '❌ Points exist: ' || SUM(points)::text || ' - Need to clear'
    ELSE '⚠️ Unknown status'
  END as status
FROM profiles;

-- =====================================================
-- FIX: Reset ALL Points to 0
-- =====================================================
-- Uncomment and run this if points are not 0:
/*
UPDATE profiles SET
  points = 0,
  updated_at = NOW();

-- Verify the fix
SELECT 
  'After fix' as check_name,
  COUNT(CASE WHEN points > 0 THEN 1 END) as profiles_with_points,
  SUM(points) as total_points,
  CASE 
    WHEN SUM(points) = 0 THEN '✅ ALL POINTS RESET TO 0'
    ELSE '❌ Still have points: ' || SUM(points)::text
  END as status
FROM profiles;
*/
