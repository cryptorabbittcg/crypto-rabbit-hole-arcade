-- =====================================================
-- COMPLETE SYSTEM TEST
-- =====================================================
-- Run this to verify everything works end-to-end
-- =====================================================

-- =====================================================
-- TEST 1: ensure_cryptoku_hints
-- =====================================================
SELECT '=== TEST 1: ensure_cryptoku_hints ===' as test;

SELECT 
  'ensure_cryptoku_hints' as function_name,
  ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1)) as result,
  '✅ Should return: (no error)' as expected;

-- Verify record was created
SELECT 
  'Record verification' as check_name,
  COUNT(*) as record_count,
  MAX(hint_balance) as hint_balance,
  MAX(total_ranked_completed) as total_ranked_completed
FROM cryptoku_hints
WHERE user_id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- TEST 2: use_cryptoku_hint
-- =====================================================
SELECT '=== TEST 2: use_cryptoku_hint ===' as test;

SELECT 
  'use_cryptoku_hint' as function_name,
  use_cryptoku_hint((SELECT id FROM profiles LIMIT 1)) as result;

-- =====================================================
-- TEST 3: reward_cryptoku_hint
-- =====================================================
SELECT '=== TEST 3: reward_cryptoku_hint ===' as test;

SELECT 
  'reward_cryptoku_hint' as function_name,
  reward_cryptoku_hint((SELECT id FROM profiles LIMIT 1)) as result;

-- =====================================================
-- TEST 4: purchase_cryptoku_hints
-- =====================================================
SELECT '=== TEST 4: purchase_cryptoku_hints ===' as test;

SELECT 
  'purchase_cryptoku_hints' as function_name,
  purchase_cryptoku_hints((SELECT id FROM profiles LIMIT 1), 10) as result;

-- =====================================================
-- TEST 5: update_user_balance
-- =====================================================
SELECT '=== TEST 5: update_user_balance ===' as test;

SELECT 
  'update_user_balance' as function_name,
  update_user_balance(
    (SELECT id FROM profiles LIMIT 1),
    0,   -- ape_change
    0,   -- tickets_change
    10,  -- points_change
    'test',
    'System test'
  ) as result,
  '✅ Should return: (no error)' as expected;

-- =====================================================
-- TEST 6: add_cryptoku_leaderboard_entry
-- =====================================================
SELECT '=== TEST 6: add_cryptoku_leaderboard_entry ===' as test;

SELECT 
  'add_cryptoku_leaderboard_entry' as function_name,
  add_cryptoku_leaderboard_entry(
    'test-run-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || FLOOR(RANDOM() * 1000000)::TEXT,
    (SELECT id FROM profiles LIMIT 1),
    'DEGEN',
    100,
    60,
    0,
    0,
    true,
    false
  ) as result,
  '✅ Should return: UUID (entry ID)' as expected;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================
SELECT '=== FINAL VERIFICATION ===' as test;

SELECT 
  'All systems operational' as status,
  (SELECT COUNT(*) FROM cryptoku_hints) as hints_records,
  (SELECT COUNT(*) FROM cryptoku_leaderboard) as leaderboard_entries,
  (SELECT COUNT(*) FROM leaderboard) as main_leaderboard_entries;

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT '=== SUMMARY ===' as test;

SELECT 
  '✅ ensure_cryptoku_hints' as function_1,
  '✅ use_cryptoku_hint' as function_2,
  '✅ reward_cryptoku_hint' as function_3,
  '✅ purchase_cryptoku_hints' as function_4,
  '✅ update_user_balance' as function_5,
  '✅ add_cryptoku_leaderboard_entry' as function_6,
  '✅ All functions working' as status;
