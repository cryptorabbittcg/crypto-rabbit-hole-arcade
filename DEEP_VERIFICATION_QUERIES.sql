-- =====================================================
-- DEEP VERIFICATION QUERIES
-- =====================================================
-- Run these after confirming tables/functions exist
-- These will identify the actual problem
-- =====================================================

-- =====================================================
-- CHECK 1: Function Security Settings
-- =====================================================
SELECT '=== FUNCTION SECURITY CHECK ===' as check_type;

SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as signature,
  CASE WHEN p.prosecdef THEN '✅ SECURITY DEFINER' ELSE '❌ SECURITY INVOKER' END as security,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%search_path%' THEN '✅ HAS search_path'
    ELSE '❌ MISSING search_path'
  END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'add_cryptoku_leaderboard_entry',
    'get_cryptoku_leaderboard',
    'update_user_balance',
    'ensure_cryptoku_hints',
    'use_cryptoku_hint',
    'reward_cryptoku_hint',
    'purchase_cryptoku_hints'
  )
ORDER BY p.proname;

-- =====================================================
-- CHECK 2: Function Parameters (Critical)
-- =====================================================
SELECT '=== FUNCTION PARAMETERS CHECK ===' as check_type;

-- Check update_user_balance parameters
SELECT 
  'update_user_balance' as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  CASE 
    WHEN pg_get_function_arguments(p.oid) LIKE '%p_tickets_change%' THEN '✅ CORRECT (plural)'
    WHEN pg_get_function_arguments(p.oid) LIKE '%p_ticket_change%' THEN '❌ WRONG (singular)'
    ELSE '⚠️ CHECK MANUALLY'
  END as parameter_check
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'update_user_balance';

-- Check add_cryptoku_leaderboard_entry parameters
SELECT 
  'add_cryptoku_leaderboard_entry' as function_name,
  pg_get_function_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'add_cryptoku_leaderboard_entry';

-- Check ensure_cryptoku_hints parameters
SELECT 
  'ensure_cryptoku_hints' as function_name,
  pg_get_function_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'ensure_cryptoku_hints';

-- =====================================================
-- CHECK 3: RLS Status and Policies
-- =====================================================
SELECT '=== RLS STATUS CHECK ===' as check_type;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN (
    'cryptoku_leaderboard',
    'cryptoku_hints',
    'leaderboard'
  )
ORDER BY tablename;

SELECT '=== RLS POLICIES DETAIL ===' as check_type;

SELECT 
  tablename,
  policyname,
  cmd as operation,
  roles,
  CASE 
    WHEN qual LIKE '%true%' OR qual IS NULL THEN '✅ Permissive'
    ELSE '⚠️ Restrictive'
  END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'cryptoku_leaderboard',
    'cryptoku_hints',
    'leaderboard'
  )
ORDER BY tablename, policyname;

-- =====================================================
-- CHECK 4: Test Function Execution (Safe)
-- =====================================================
SELECT '=== FUNCTION EXECUTION TEST ===' as check_type;

-- Get a test user_id (use first profile)
SELECT 
  'Test User ID' as test_name,
  id as user_id,
  wallet_address
FROM profiles
LIMIT 1;

-- After getting user_id, test these (replace YOUR_USER_ID):
-- 
-- Test 1: ensure_cryptoku_hints
-- SELECT ensure_cryptoku_hints('YOUR_USER_ID'::UUID);
--
-- Test 2: update_user_balance (safe - only updates if user exists)
-- SELECT update_user_balance(
--   'YOUR_USER_ID'::UUID,
--   0,  -- ape_change
--   0,  -- tickets_change
--   1,  -- points_change (small test amount)
--   'test',
--   'Test verification'
-- );
--
-- Test 3: add_cryptoku_leaderboard_entry (safe - uses ON CONFLICT)
-- SELECT add_cryptoku_leaderboard_entry(
--   'test-run-' || NOW()::TEXT,
--   'YOUR_USER_ID'::UUID,
--   'DEGEN',
--   100,
--   60,
--   0,
--   0,
--   true,
--   false
-- );

-- =====================================================
-- CHECK 5: Check for Duplicate Functions
-- =====================================================
SELECT '=== DUPLICATE FUNCTIONS CHECK ===' as check_type;

SELECT 
  p.proname as function_name,
  COUNT(*) as count,
  string_agg(pg_get_function_identity_arguments(p.oid), ' | ') as signatures
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'update_user_balance',
    'add_cryptoku_leaderboard_entry',
    'ensure_cryptoku_hints'
  )
GROUP BY p.proname
HAVING COUNT(*) > 1
ORDER BY p.proname;

-- Expected: No rows (each function should exist only once)

-- =====================================================
-- CHECK 6: Verify Table Structure
-- =====================================================
SELECT '=== TABLE STRUCTURE CHECK ===' as check_type;

-- Check leaderboard table has required columns
SELECT 
  'leaderboard' as table_name,
  column_name,
  CASE 
    WHEN column_name = 'cryptoku_high_score' THEN '✅ REQUIRED'
    WHEN column_name = 'ape_in_high_score' THEN '✅ REQUIRED'
    WHEN column_name = 'total_points' THEN '✅ REQUIRED'
    WHEN column_name = 'user_id' THEN '✅ REQUIRED'
    ELSE 'OK'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'leaderboard'
  AND column_name IN ('cryptoku_high_score', 'ape_in_high_score', 'total_points', 'user_id')
ORDER BY column_name;

-- Check cryptoku_leaderboard table has required columns
SELECT 
  'cryptoku_leaderboard' as table_name,
  column_name,
  CASE 
    WHEN column_name = 'run_id' THEN '✅ REQUIRED'
    WHEN column_name = 'user_id' THEN '✅ REQUIRED'
    WHEN column_name = 'mode' THEN '✅ REQUIRED'
    WHEN column_name = 'score' THEN '✅ REQUIRED'
    ELSE 'OK'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'cryptoku_leaderboard'
  AND column_name IN ('run_id', 'user_id', 'mode', 'score')
ORDER BY column_name;

-- Check cryptoku_hints table has required columns
SELECT 
  'cryptoku_hints' as table_name,
  column_name,
  CASE 
    WHEN column_name = 'user_id' THEN '✅ REQUIRED'
    WHEN column_name = 'hint_balance' THEN '✅ REQUIRED'
    WHEN column_name = 'total_ranked_completed' THEN '✅ REQUIRED'
    ELSE 'OK'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'cryptoku_hints'
  AND column_name IN ('user_id', 'hint_balance', 'total_ranked_completed')
ORDER BY column_name;

-- =====================================================
-- CHECK 7: Check Function Can Access Tables
-- =====================================================
SELECT '=== FUNCTION TABLE ACCESS CHECK ===' as check_type;

-- Check if functions reference the correct tables
SELECT 
  p.proname as function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%cryptoku_leaderboard%' THEN '✅ References cryptoku_leaderboard'
    WHEN pg_get_functiondef(p.oid) LIKE '%leaderboard%' THEN '✅ References leaderboard'
    WHEN pg_get_functiondef(p.oid) LIKE '%cryptoku_hints%' THEN '✅ References cryptoku_hints'
    WHEN pg_get_functiondef(p.oid) LIKE '%profiles%' THEN '✅ References profiles'
    ELSE '⚠️ Check manually'
  END as table_references
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'add_cryptoku_leaderboard_entry',
    'update_user_balance',
    'ensure_cryptoku_hints'
  );

-- =====================================================
-- CHECK 8: Check for Missing Indexes
-- =====================================================
SELECT '=== INDEXES CHECK ===' as check_type;

SELECT 
  tablename,
  indexname,
  CASE 
    WHEN indexname LIKE '%user_id%' OR indexname LIKE '%user%' THEN '✅ User index'
    WHEN indexname LIKE '%run_id%' OR indexname LIKE '%run%' THEN '✅ Run ID index'
    WHEN indexname LIKE '%points%' OR indexname LIKE '%score%' THEN '✅ Score index'
    ELSE 'Other index'
  END as index_type
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'cryptoku_leaderboard',
    'cryptoku_hints',
    'leaderboard'
  )
ORDER BY tablename, indexname;

-- =====================================================
-- SUMMARY: What to Look For
-- =====================================================
SELECT '=== SUMMARY: ISSUES TO FIX ===' as check_type;

-- This will show any functions missing SECURITY DEFINER
SELECT 
  'Functions missing SECURITY DEFINER' as issue_type,
  COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'add_cryptoku_leaderboard_entry',
    'update_user_balance',
    'ensure_cryptoku_hints',
    'use_cryptoku_hint',
    'reward_cryptoku_hint',
    'purchase_cryptoku_hints'
  )
  AND NOT p.prosecdef

UNION ALL

-- This will show any functions missing search_path
SELECT 
  'Functions missing search_path' as issue_type,
  COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'add_cryptoku_leaderboard_entry',
    'update_user_balance',
    'ensure_cryptoku_hints'
  )
  AND pg_get_functiondef(p.oid) NOT LIKE '%search_path%';
