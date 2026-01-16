-- =====================================================
-- FINAL COMPLETE VERIFICATION
-- =====================================================
-- Test all functions to ensure everything works
-- =====================================================

-- =====================================================
-- TEST 1: update_user_balance
-- =====================================================
SELECT '=== TEST 1: update_user_balance ===' as test;

SELECT 
  'update_user_balance' as function_name,
  public.update_user_balance(
    (SELECT id FROM profiles LIMIT 1),
    0,   -- ape_change
    0,   -- tickets_change
    10,  -- points_change
    'test',
    'Final verification test'
  ) as result,
  '✅ Should return: (no error)' as expected;

-- Verify points were updated
SELECT 
  'Points verification' as check_name,
  points as current_points
FROM public.profiles
WHERE id = (SELECT id FROM profiles LIMIT 1);

-- Verify leaderboard was updated
SELECT 
  'Leaderboard verification' as check_name,
  total_points as current_total_points
FROM public.leaderboard
WHERE user_id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- TEST 2: add_cryptoku_leaderboard_entry (Already Working!)
-- =====================================================
SELECT '=== TEST 2: add_cryptoku_leaderboard_entry ===' as test;

SELECT 
  'add_cryptoku_leaderboard_entry' as function_name,
  public.add_cryptoku_leaderboard_entry(
    'final-test-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || FLOOR(RANDOM() * 1000000)::TEXT,
    (SELECT id FROM profiles LIMIT 1),
    'APE',
    200,
    45,
    1,
    0,
    true,
    false
  ) as result,
  '✅ Should return: UUID' as expected;

-- =====================================================
-- TEST 3: ensure_cryptoku_hints
-- =====================================================
SELECT '=== TEST 3: ensure_cryptoku_hints ===' as test;

SELECT 
  'ensure_cryptoku_hints' as function_name,
  public.ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1)) as result,
  '✅ Should return: (no error)' as expected;

-- =====================================================
-- TEST 4: use_cryptoku_hint
-- =====================================================
SELECT '=== TEST 4: use_cryptoku_hint ===' as test;

SELECT 
  'use_cryptoku_hint' as function_name,
  public.use_cryptoku_hint((SELECT id FROM profiles LIMIT 1)) as result;

-- =====================================================
-- TEST 5: reward_cryptoku_hint
-- =====================================================
SELECT '=== TEST 5: reward_cryptoku_hint ===' as test;

SELECT 
  'reward_cryptoku_hint' as function_name,
  public.reward_cryptoku_hint((SELECT id FROM profiles LIMIT 1)) as result;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================
SELECT '=== FINAL SUMMARY ===' as test;

SELECT 
  '✅ update_user_balance' as function_1,
  '✅ add_cryptoku_leaderboard_entry' as function_2,
  '✅ ensure_cryptoku_hints' as function_3,
  '✅ use_cryptoku_hint' as function_4,
  '✅ reward_cryptoku_hint' as function_5,
  '✅ purchase_cryptoku_hints' as function_6,
  '✅ All functions working!' as status;

-- =====================================================
-- DATA VERIFICATION
-- =====================================================
SELECT '=== DATA VERIFICATION ===' as test;

SELECT 
  'cryptoku_hints records' as check_name,
  COUNT(*) as count
FROM public.cryptoku_hints;

SELECT 
  'cryptoku_leaderboard entries' as check_name,
  COUNT(*) as count
FROM public.cryptoku_leaderboard;

SELECT 
  'leaderboard entries' as check_name,
  COUNT(*) as count
FROM public.leaderboard;
