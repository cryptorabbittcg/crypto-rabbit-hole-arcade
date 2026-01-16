-- =====================================================
-- COMPLETE SUPABASE VERIFICATION
-- =====================================================
-- Comprehensive check of all tables, functions, RLS, and more
-- =====================================================

-- =====================================================
-- SECTION 1: CORE TABLES VERIFICATION
-- =====================================================
SELECT '=== CORE TABLES ===' as section;

SELECT 
  'Core tables check' as check_name,
  tablename,
  CASE 
    WHEN tablename IN (
      'profiles', 'card_inventory', 'upgrades_inventory', 
      'game_sessions', 'pvp_matches', 'match_history',
      'transactions', 'leaderboard', 'achievements',
      'social_raids', 'raid_participation', 'pack_openings'
    ) THEN '✅ Required'
    ELSE '⚠️ Additional'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'card_inventory', 'upgrades_inventory', 
    'game_sessions', 'pvp_matches', 'match_history',
    'transactions', 'leaderboard', 'achievements',
    'social_raids', 'raid_participation', 'pack_openings'
  )
ORDER BY tablename;

-- =====================================================
-- SECTION 2: GAME-SPECIFIC TABLES
-- =====================================================
SELECT '=== GAME-SPECIFIC TABLES ===' as section;

SELECT 
  'Game tables check' as check_name,
  tablename,
  CASE 
    WHEN tablename = 'cryptoku_hints' THEN '✅ Cryptoku hints'
    WHEN tablename = 'cryptoku_leaderboard' THEN '✅ Cryptoku leaderboard'
    WHEN tablename = 'ape_in_game_states' THEN '✅ Ape In game states'
    WHEN tablename = 'ape_in_daily_free_plays' THEN '✅ Ape In free plays'
    ELSE '⚠️ Unknown'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'cryptoku_hints', 'cryptoku_leaderboard',
    'ape_in_game_states', 'ape_in_daily_free_plays'
  )
ORDER BY tablename;

-- =====================================================
-- SECTION 3: ALL TABLES SUMMARY
-- =====================================================
SELECT '=== ALL TABLES SUMMARY ===' as section;

SELECT 
  'Total tables' as check_name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN tablename IN (
    'profiles', 'card_inventory', 'upgrades_inventory', 
    'game_sessions', 'pvp_matches', 'match_history',
    'transactions', 'leaderboard', 'achievements',
    'social_raids', 'raid_participation', 'pack_openings',
    'cryptoku_hints', 'cryptoku_leaderboard',
    'ape_in_game_states', 'ape_in_daily_free_plays'
  ) THEN 1 END) as expected_tables,
  CASE 
    WHEN COUNT(CASE WHEN tablename IN (
      'profiles', 'card_inventory', 'upgrades_inventory', 
      'game_sessions', 'pvp_matches', 'match_history',
      'transactions', 'leaderboard', 'achievements',
      'social_raids', 'raid_participation', 'pack_openings',
      'cryptoku_hints', 'cryptoku_leaderboard',
      'ape_in_game_states', 'ape_in_daily_free_plays'
    ) THEN 1 END) >= 15 THEN '✅ All expected tables exist'
    ELSE '⚠️ Some tables missing'
  END as status
FROM pg_tables
WHERE schemaname = 'public';

-- =====================================================
-- SECTION 4: CORE FUNCTIONS VERIFICATION
-- =====================================================
SELECT '=== CORE FUNCTIONS ===' as section;

SELECT 
  'Core functions check' as check_name,
  proname as function_name,
  CASE WHEN prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%search_path%' THEN '✅ Has search_path'
    ELSE '❌ Missing search_path'
  END as search_path_status,
  CASE 
    WHEN proname IN (
      'get_or_create_profile', 'add_card_to_inventory', 
      'update_user_balance', 'record_game_session',
      'purchase_upgrade', 'get_leaderboard', 'find_pvp_opponent'
    ) THEN '✅ Required'
    ELSE '⚠️ Additional'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'get_or_create_profile', 'add_card_to_inventory', 
    'update_user_balance', 'record_game_session',
    'purchase_upgrade', 'get_leaderboard', 'find_pvp_opponent'
  )
ORDER BY proname;

-- =====================================================
-- SECTION 5: CRYPTOKU FUNCTIONS
-- =====================================================
SELECT '=== CRYPTOKU FUNCTIONS ===' as section;

SELECT 
  'Cryptoku functions check' as check_name,
  proname as function_name,
  CASE WHEN prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%search_path%' THEN '✅ Has search_path'
    ELSE '❌ Missing search_path'
  END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'ensure_cryptoku_hints', 'use_cryptoku_hint',
    'reward_cryptoku_hint', 'purchase_cryptoku_hints',
    'add_cryptoku_leaderboard_entry', 'get_cryptoku_leaderboard'
  )
ORDER BY proname;

-- =====================================================
-- SECTION 6: APE IN FUNCTIONS
-- =====================================================
SELECT '=== APE IN FUNCTIONS ===' as section;

SELECT 
  'Ape In functions check' as check_name,
  proname as function_name,
  CASE WHEN prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname LIKE '%ape_in%'
ORDER BY proname;

-- =====================================================
-- SECTION 7: FUNCTION SECURITY CHECK
-- =====================================================
SELECT '=== FUNCTION SECURITY ===' as section;

SELECT 
  'Function security check' as check_name,
  COUNT(*) as total_functions,
  COUNT(CASE WHEN prosecdef THEN 1 END) as security_definer_count,
  COUNT(CASE WHEN NOT prosecdef THEN 1 END) as security_invoker_count,
  COUNT(CASE WHEN pg_get_functiondef(p.oid) LIKE '%search_path%' THEN 1 END) as has_search_path_count,
  CASE 
    WHEN COUNT(CASE WHEN proname IN ('update_user_balance', 'add_cryptoku_leaderboard_entry', 'ensure_cryptoku_hints', 'reward_cryptoku_hint') AND prosecdef THEN 1 END) >= 4
    THEN '✅ Critical functions have SECURITY DEFINER'
    ELSE '⚠️ Some critical functions missing SECURITY DEFINER'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'update_user_balance', 'add_cryptoku_leaderboard_entry', 
    'ensure_cryptoku_hints', 'reward_cryptoku_hint',
    'use_cryptoku_hint', 'purchase_cryptoku_hints'
  );

-- =====================================================
-- SECTION 8: RLS POLICIES CHECK
-- =====================================================
SELECT '=== RLS POLICIES ===' as section;

SELECT 
  'RLS status' as check_name,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'transactions', 'leaderboard', 'cryptoku_hints',
    'cryptoku_leaderboard', 'ape_in_game_states'
  )
ORDER BY tablename;

-- =====================================================
-- SECTION 9: CRITICAL RLS POLICIES
-- =====================================================
SELECT '=== CRITICAL RLS POLICIES ===' as section;

SELECT 
  'Critical policies' as check_name,
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN tablename = 'transactions' AND policyname = 'Functions can insert transactions' THEN '✅ Function bypass policy'
    WHEN tablename = 'transactions' AND policyname LIKE '%insert%' THEN '✅ Insert policy exists'
    WHEN tablename = 'cryptoku_hints' AND policyname LIKE '%insert%' THEN '✅ Insert policy exists'
    ELSE '⚠️ Check manually'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (tablename = 'transactions' AND cmd = 'INSERT')
    OR (tablename = 'cryptoku_hints' AND cmd = 'INSERT')
  )
ORDER BY tablename, policyname;

-- =====================================================
-- SECTION 10: INDEXES CHECK
-- =====================================================
SELECT '=== INDEXES ===' as section;

SELECT 
  'Indexes check' as check_name,
  COUNT(*) as total_indexes,
  COUNT(CASE WHEN indexname LIKE 'idx_%' THEN 1 END) as custom_indexes,
  COUNT(CASE WHEN indexname LIKE '%_pkey' THEN 1 END) as primary_keys
FROM pg_indexes
WHERE schemaname = 'public';

-- =====================================================
-- SECTION 11: TRIGGERS CHECK
-- =====================================================
SELECT '=== TRIGGERS ===' as section;

SELECT 
  'Triggers check' as check_name,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- SECTION 12: TEST CRITICAL FUNCTIONS
-- =====================================================
SELECT '=== FUNCTION TESTS ===' as section;

-- Test update_user_balance (should record transaction)
DO $$
DECLARE
  test_user_id UUID;
  transaction_count_before INTEGER;
  transaction_count_after INTEGER;
BEGIN
  -- Get a test user
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '⚠️ No users found - skipping function tests';
    RETURN;
  END IF;
  
  -- Count transactions before
  SELECT COUNT(*) INTO transaction_count_before
  FROM public.transactions
  WHERE user_id = test_user_id;
  
  -- Run function
  PERFORM public.update_user_balance(
    test_user_id, 0, 0, 5, 'verification_test', 'Complete verification test'
  );
  
  -- Count transactions after
  SELECT COUNT(*) INTO transaction_count_after
  FROM public.transactions
  WHERE user_id = test_user_id
    AND transaction_type = 'verification_test';
  
  IF transaction_count_after > transaction_count_before THEN
    RAISE NOTICE '✅ update_user_balance: Transaction recorded successfully';
  ELSE
    RAISE NOTICE '❌ update_user_balance: Transaction NOT recorded';
  END IF;
END $$;

-- Test ensure_cryptoku_hints
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RETURN;
  END IF;
  
  BEGIN
    PERFORM public.ensure_cryptoku_hints(test_user_id);
    RAISE NOTICE '✅ ensure_cryptoku_hints: Function executed successfully';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ensure_cryptoku_hints: Error - %', SQLERRM;
  END;
END $$;

-- =====================================================
-- SECTION 13: FINAL SUMMARY
-- =====================================================
SELECT '=== FINAL SUMMARY ===' as section;

WITH table_check AS (
  SELECT COUNT(*) as count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'profiles', 'card_inventory', 'upgrades_inventory', 
      'game_sessions', 'pvp_matches', 'match_history',
      'transactions', 'leaderboard', 'achievements',
      'social_raids', 'raid_participation', 'pack_openings',
      'cryptoku_hints', 'cryptoku_leaderboard',
      'ape_in_game_states'
    )
),
function_check AS (
  SELECT COUNT(*) as count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND proname IN (
      'update_user_balance', 'get_or_create_profile',
      'ensure_cryptoku_hints', 'add_cryptoku_leaderboard_entry'
    )
),
security_check AS (
  SELECT COUNT(*) as count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND proname IN ('update_user_balance', 'add_cryptoku_leaderboard_entry', 'ensure_cryptoku_hints')
    AND prosecdef = true
)
SELECT 
  'Complete verification' as check_name,
  (SELECT count FROM table_check) as tables_found,
  (SELECT count FROM function_check) as functions_found,
  (SELECT count FROM security_check) as secure_functions,
  CASE 
    WHEN (SELECT count FROM table_check) >= 15
      AND (SELECT count FROM function_check) >= 4
      AND (SELECT count FROM security_check) >= 3
    THEN '✅ ALL SYSTEMS OPERATIONAL'
    ELSE '⚠️ Some components need attention'
  END as final_status;
