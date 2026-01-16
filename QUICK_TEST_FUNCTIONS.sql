-- =====================================================
-- QUICK FUNCTION TEST
-- =====================================================
-- This automatically uses the first profile's user_id
-- No need to replace anything - just run it!
-- =====================================================

-- Test 1: ensure_cryptoku_hints
SELECT 
  'Test 1: ensure_cryptoku_hints' as test,
  ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1)) as result,
  'Should return: (no error)' as expected;

-- Test 2: update_user_balance
SELECT 
  'Test 2: update_user_balance' as test,
  update_user_balance(
    (SELECT id FROM profiles LIMIT 1),
    0,   -- ape_change
    0,   -- tickets_change
    1,   -- points_change (small test amount)
    'test',
    'Test verification'
  ) as result,
  'Should return: (no error)' as expected;

-- Test 3: add_cryptoku_leaderboard_entry
SELECT 
  'Test 3: add_cryptoku_leaderboard_entry' as test,
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
  'Should return: UUID (entry ID)' as expected;

-- =====================================================
-- Verify Results
-- =====================================================

SELECT '=== VERIFICATION ===' as section;

-- Check if hints record exists
SELECT 
  'Hints record exists' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM cryptoku_hints 
      WHERE user_id = (SELECT id FROM profiles LIMIT 1)
    ) THEN '✅ YES'
    ELSE '❌ NO'
  END as status;

-- Check if points were updated
SELECT 
  'Points updated' as check_name,
  points as current_points,
  CASE 
    WHEN points > 0 THEN '✅ YES'
    ELSE '⚠️ Check manually'
  END as status
FROM profiles
WHERE id = (SELECT id FROM profiles LIMIT 1);

-- Check if leaderboard entry exists
SELECT 
  'Leaderboard entry exists' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM leaderboard 
      WHERE user_id = (SELECT id FROM profiles LIMIT 1)
    ) THEN '✅ YES'
    ELSE '❌ NO'
  END as status;

-- Check if cryptoku_leaderboard entry exists
SELECT 
  'Cryptoku leaderboard entry exists' as check_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ YES'
    ELSE '❌ NO'
  END as status
FROM cryptoku_leaderboard
WHERE user_id = (SELECT id FROM profiles LIMIT 1);
