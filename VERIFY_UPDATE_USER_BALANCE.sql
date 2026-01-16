-- =====================================================
-- VERIFY update_user_balance Actually Worked
-- =====================================================
-- Check if points were updated even if transaction wasn't recorded
-- =====================================================

-- Check 1: Get current points before test
SELECT 
  'Current points (before)' as check_name,
  id,
  wallet_address,
  points as current_points,
  ape_balance,
  tickets
FROM public.profiles
WHERE id = (SELECT id FROM profiles LIMIT 1);

-- Check 2: Check if transactions table exists
SELECT 
  'transactions table exists' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'transactions'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- Check 3: Check if leaderboard table exists
SELECT 
  'leaderboard table exists' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'leaderboard'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- Check 4: Test update_user_balance with explicit call
SELECT '=== TESTING update_user_balance ===' as step;

-- Get a user_id first
SELECT 
  'Test user' as check_name,
  id as user_id,
  points as current_points
FROM public.profiles
LIMIT 1;

-- Then test (replace YOUR_USER_ID with actual ID from above)
-- SELECT public.update_user_balance(
--   'YOUR_USER_ID'::UUID,
--   0,   -- ape_change
--   0,   -- tickets_change
--   10,  -- points_change
--   'test',
--   'Verification test'
-- );

-- Check 5: Verify function definition
SELECT 
  'Function definition check' as check_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%public.profiles%' THEN '✅ Uses public.profiles'
    ELSE '❌ Missing public. schema'
  END as profiles_schema,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%public.transactions%' THEN '✅ Uses public.transactions'
    ELSE '❌ Missing public. schema'
  END as transactions_schema,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%public.leaderboard%' THEN '✅ Uses public.leaderboard'
    ELSE '❌ Missing public. schema'
  END as leaderboard_schema
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'update_user_balance';

-- Check 6: Check if transactions table has correct columns
SELECT 
  'transactions table columns' as check_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'transactions'
ORDER BY ordinal_position;
