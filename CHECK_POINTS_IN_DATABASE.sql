-- =====================================================
-- CHECK POINTS IN DATABASE
-- =====================================================
-- Verify points are actually 0 in the database
-- =====================================================

-- =====================================================
-- CHECK 1: All Profiles Points
-- =====================================================
SELECT 
  'Profile points check' as check_name,
  wallet_address,
  points,
  ape_balance,
  tickets,
  total_games_played,
  CASE 
    WHEN points = 0 THEN '✅ Points cleared'
    ELSE '❌ Points NOT cleared: ' || points::text
  END as status
FROM profiles
ORDER BY points DESC
LIMIT 10;

-- =====================================================
-- CHECK 2: Summary of Points
-- =====================================================
SELECT 
  'Points summary' as check_name,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN points > 0 THEN 1 END) as profiles_with_points,
  SUM(points) as total_points,
  MAX(points) as max_points,
  MIN(points) as min_points,
  CASE 
    WHEN SUM(points) = 0 THEN '✅ ALL POINTS CLEARED IN DATABASE'
    ELSE '❌ Points still exist in database: ' || SUM(points)::text
  END as status
FROM profiles;

-- =====================================================
-- CHECK 3: Check if points column exists
-- =====================================================
SELECT 
  'Points column check' as check_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'points';

-- =====================================================
-- CHECK 4: Check specific wallet (if you know it)
-- =====================================================
-- Replace with your actual wallet address if you want to check a specific profile
-- SELECT 
--   'Your profile' as check_name,
--   wallet_address,
--   points,
--   ape_balance,
--   tickets
-- FROM profiles
-- WHERE wallet_address ILIKE '%YOUR_WALLET_ADDRESS%'
-- LIMIT 1;
