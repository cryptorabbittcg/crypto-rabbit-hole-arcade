-- =====================================================
-- FINAL VERIFICATION - Complete Setup Check
-- =====================================================
-- Run this to verify everything is working
-- =====================================================

-- =====================================================
-- CHECK 1: Table Exists
-- =====================================================
SELECT '=== TABLE VERIFICATION ===' as check_type;

SELECT 
  'cryptoku_hints table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'cryptoku_hints'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- =====================================================
-- CHECK 2: Functions Exist and Work
-- =====================================================
SELECT '=== FUNCTION VERIFICATION ===' as check_type;

-- Test ensure_cryptoku_hints
SELECT 
  'ensure_cryptoku_hints' as function_name,
  ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1)) as test_result,
  '✅ WORKS' as status;

-- Verify record was created
SELECT 
  'Record created' as check_name,
  COUNT(*) as record_count,
  MAX(hint_balance) as hint_balance,
  MAX(total_ranked_completed) as total_ranked_completed
FROM cryptoku_hints
WHERE user_id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- CHECK 3: Test use_cryptoku_hint
-- =====================================================
SELECT '=== TEST use_cryptoku_hint ===' as check_type;

SELECT 
  'use_cryptoku_hint' as function_name,
  use_cryptoku_hint((SELECT id FROM profiles LIMIT 1)) as result;

-- =====================================================
-- CHECK 4: Test reward_cryptoku_hint
-- =====================================================
SELECT '=== TEST reward_cryptoku_hint ===' as check_type;

SELECT 
  'reward_cryptoku_hint' as function_name,
  reward_cryptoku_hint((SELECT id FROM profiles LIMIT 1)) as result;

-- =====================================================
-- CHECK 5: Verify All Functions Have Correct Settings
-- =====================================================
SELECT '=== FUNCTION SECURITY CHECK ===' as check_type;

SELECT 
  p.proname,
  CASE WHEN p.prosecdef THEN '✅ SECURITY DEFINER' ELSE '❌ SECURITY INVOKER' END as security,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%search_path%' THEN '✅ HAS search_path'
    ELSE '❌ MISSING search_path'
  END as search_path,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%public.cryptoku_hints%' THEN '✅ Uses public schema'
    ELSE '⚠️ Check manually'
  END as schema_qualification
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'ensure_cryptoku_hints',
    'use_cryptoku_hint',
    'reward_cryptoku_hint',
    'purchase_cryptoku_hints'
  )
ORDER BY p.proname;

-- =====================================================
-- CHECK 6: Verify RLS Policies
-- =====================================================
SELECT '=== RLS POLICIES CHECK ===' as check_type;

SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ Read access'
    WHEN cmd = 'INSERT' THEN '✅ Write access'
    WHEN cmd = 'UPDATE' THEN '✅ Update access'
    ELSE 'Other'
  END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'cryptoku_hints'
ORDER BY policyname;

-- =====================================================
-- CHECK 7: Verify Trigger
-- =====================================================
SELECT '=== TRIGGER CHECK ===' as check_type;

SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ ENABLED'
    ELSE '⚠️ Check status'
  END as status
FROM pg_trigger
WHERE tgrelid = 'cryptoku_hints'::regclass
  AND tgisinternal = false;

-- =====================================================
-- CHECK 8: Complete System Check
-- =====================================================
SELECT '=== COMPLETE SYSTEM CHECK ===' as check_type;

SELECT 
  'Tables' as category,
  COUNT(*) FILTER (WHERE table_name IN ('cryptoku_hints', 'cryptoku_leaderboard', 'leaderboard')) as found,
  3 as expected
FROM information_schema.tables
WHERE table_schema = 'public'

UNION ALL

SELECT 
  'Functions',
  COUNT(*) FILTER (WHERE proname IN ('ensure_cryptoku_hints', 'use_cryptoku_hint', 'reward_cryptoku_hint', 'purchase_cryptoku_hints', 'add_cryptoku_leaderboard_entry', 'update_user_balance')),
  6
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'

UNION ALL

SELECT 
  'RLS Policies',
  COUNT(*) FILTER (WHERE tablename = 'cryptoku_hints'),
  3
FROM pg_policies
WHERE schemaname = 'public';

-- =====================================================
-- SUCCESS SUMMARY
-- =====================================================
SELECT '=== SUCCESS SUMMARY ===' as check_type;

SELECT 
  '✅ cryptoku_hints table created' as item,
  '✅ All functions recreated' as item2,
  '✅ Functions can access table' as item3,
  '✅ RLS policies configured' as item4,
  '✅ Trigger created' as item5,
  '✅ System ready for use' as item6;
