-- =====================================================
-- SUPABASE MIGRATION VERIFICATION SCRIPT
-- =====================================================
-- Run this script in Supabase SQL Editor to verify
-- all migrations have been applied correctly
-- =====================================================

-- =====================================================
-- PART 1: VERIFY ALL TABLES EXIST
-- =====================================================

SELECT '=== TABLES VERIFICATION ===' as check_type;

-- Expected tables from migrations
WITH expected_tables AS (
  SELECT unnest(ARRAY[
    'profiles',
    'cryptoku_leaderboard',
    'cryptoku_hints',
    'leaderboard',
    'game_sessions',
    'ape_in_daily_free_plays',
    'ape_in_game_states',
    'social_raids'
  ]) as table_name
)
SELECT 
  et.table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = et.table_name
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM expected_tables et
ORDER BY et.table_name;

-- =====================================================
-- PART 2: VERIFY TABLE COLUMNS
-- =====================================================

SELECT '=== CRYPTOKU_LEADERBOARD COLUMNS ===' as check_type;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'cryptoku_leaderboard'
ORDER BY ordinal_position;

SELECT '=== CRYPTOKU_HINTS COLUMNS ===' as check_type;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'cryptoku_hints'
ORDER BY ordinal_position;

SELECT '=== LEADERBOARD COLUMNS ===' as check_type;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'leaderboard'
ORDER BY ordinal_position;

-- =====================================================
-- PART 3: VERIFY ALL FUNCTIONS EXIST
-- =====================================================

SELECT '=== FUNCTIONS VERIFICATION ===' as check_type;

-- Expected functions from migrations
WITH expected_functions AS (
  SELECT unnest(ARRAY[
    'add_cryptoku_leaderboard_entry',
    'get_cryptoku_leaderboard',
    'update_user_balance',
    'ensure_cryptoku_hints',
    'use_cryptoku_hint',
    'reward_cryptoku_hint',
    'purchase_cryptoku_hints',
    'update_cryptoku_hints_updated_at'
  ]) as function_name
)
SELECT 
  ef.function_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = ef.function_name
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM expected_functions ef
ORDER BY ef.function_name;

-- =====================================================
-- PART 4: VERIFY FUNCTION SECURITY SETTINGS
-- =====================================================

SELECT '=== FUNCTION SECURITY SETTINGS ===' as check_type;

SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE WHEN p.prosecdef THEN '✅ SECURITY DEFINER' ELSE '❌ SECURITY INVOKER' END as security,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%search_path%' THEN '✅ HAS search_path'
    ELSE '❌ MISSING search_path'
  END as search_path_status,
  pg_get_userbyid(p.proowner) as owner
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
ORDER BY p.proname, pg_get_function_identity_arguments(p.oid);

-- =====================================================
-- PART 5: VERIFY FUNCTION PARAMETERS
-- =====================================================

SELECT '=== FUNCTION PARAMETERS ===' as check_type;

-- Check add_cryptoku_leaderboard_entry parameters
SELECT 
  'add_cryptoku_leaderboard_entry' as function_name,
  p.proname,
  pg_get_function_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'add_cryptoku_leaderboard_entry';

-- Check update_user_balance parameters
SELECT 
  'update_user_balance' as function_name,
  p.proname,
  pg_get_function_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'update_user_balance';

-- Check ensure_cryptoku_hints parameters
SELECT 
  'ensure_cryptoku_hints' as function_name,
  p.proname,
  pg_get_function_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'ensure_cryptoku_hints';

-- =====================================================
-- PART 6: VERIFY RLS POLICIES
-- =====================================================

SELECT '=== RLS STATUS ===' as check_type;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN (
    'cryptoku_leaderboard',
    'cryptoku_hints',
    'leaderboard',
    'profiles',
    'game_sessions'
  )
ORDER BY tablename;

SELECT '=== RLS POLICIES DETAIL ===' as check_type;

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'cryptoku_leaderboard',
    'cryptoku_hints',
    'leaderboard'
  )
ORDER BY tablename, policyname;

-- =====================================================
-- PART 7: VERIFY INDEXES
-- =====================================================

SELECT '=== INDEXES VERIFICATION ===' as check_type;

SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'cryptoku_leaderboard',
    'cryptoku_hints',
    'leaderboard'
  )
ORDER BY tablename, indexname;

-- =====================================================
-- PART 8: VERIFY CONSTRAINTS
-- =====================================================

SELECT '=== CONSTRAINTS VERIFICATION ===' as check_type;

SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
    'cryptoku_leaderboard',
    'cryptoku_hints',
    'leaderboard'
  )
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- =====================================================
-- PART 9: VERIFY TRIGGERS
-- =====================================================

SELECT '=== TRIGGERS VERIFICATION ===' as check_type;

SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid IN (
  SELECT oid FROM pg_class 
  WHERE relname IN ('cryptoku_leaderboard', 'cryptoku_hints', 'leaderboard')
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
)
AND tgisinternal = false
ORDER BY tgrelid::regclass, tgname;

-- =====================================================
-- PART 10: TEST FUNCTION EXECUTION (SAFE CHECKS)
-- =====================================================

SELECT '=== FUNCTION EXECUTION TEST ===' as check_type;

-- Test if functions can be called (won't actually modify data)
-- Replace with a real user_id from your profiles table for actual testing

-- Check if we can get function definitions (proves they exist and are accessible)
SELECT 
  'Function Definitions Check' as test_name,
  COUNT(*) as function_count
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
  );

-- =====================================================
-- PART 11: CHECK FOR DUPLICATE FUNCTIONS
-- =====================================================

SELECT '=== DUPLICATE FUNCTIONS CHECK ===' as check_type;

SELECT 
  p.proname as function_name,
  COUNT(*) as overload_count,
  string_agg(pg_get_function_identity_arguments(p.oid), ', ') as signatures
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

-- =====================================================
-- PART 12: VERIFY FOREIGN KEY RELATIONSHIPS
-- =====================================================

SELECT '=== FOREIGN KEY RELATIONSHIPS ===' as check_type;

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'cryptoku_leaderboard',
    'cryptoku_hints',
    'leaderboard'
  )
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- PART 13: SUMMARY REPORT
-- =====================================================

SELECT '=== SUMMARY REPORT ===' as check_type;

SELECT 
  'Tables' as category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = t.table_name
  )) as exists_count
FROM (SELECT unnest(ARRAY[
  'profiles',
  'cryptoku_leaderboard',
  'cryptoku_hints',
  'leaderboard',
  'game_sessions'
]) as table_name) t

UNION ALL

SELECT 
  'Functions' as category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = f.function_name
  )) as exists_count
FROM (SELECT unnest(ARRAY[
  'add_cryptoku_leaderboard_entry',
  'get_cryptoku_leaderboard',
  'update_user_balance',
  'ensure_cryptoku_hints',
  'use_cryptoku_hint',
  'reward_cryptoku_hint',
  'purchase_cryptoku_hints'
]) as function_name) f;

-- =====================================================
-- END OF VERIFICATION SCRIPT
-- =====================================================
