-- =====================================================
-- TEST FUNCTIONS WITH REAL DATA
-- =====================================================
-- Step 1: Get a real user_id from profiles
-- =====================================================

SELECT '=== STEP 1: Get Test User ===' as step;

SELECT 
  id as user_id,
  wallet_address,
  username
FROM profiles
LIMIT 1;

-- =====================================================
-- Step 2: Test ensure_cryptoku_hints
-- =====================================================
-- Copy the user_id from Step 1 and replace YOUR_USER_ID below
-- Then uncomment and run:

/*
SELECT '=== STEP 2: Test ensure_cryptoku_hints ===' as step;

-- Replace YOUR_USER_ID with actual UUID from Step 1
SELECT ensure_cryptoku_hints('YOUR_USER_ID'::UUID);

-- Verify it worked
SELECT * FROM cryptoku_hints WHERE user_id = 'YOUR_USER_ID'::UUID;
*/

-- =====================================================
-- Step 3: Test update_user_balance
-- =====================================================
-- Copy the user_id from Step 1 and replace YOUR_USER_ID below
-- Then uncomment and run:

/*
SELECT '=== STEP 3: Test update_user_balance ===' as step;

-- Replace YOUR_USER_ID with actual UUID from Step 1
SELECT update_user_balance(
  'YOUR_USER_ID'::UUID,
  0,   -- ape_change
  0,   -- tickets_change
  10,  -- points_change (small test amount)
  'test',
  'Test verification'
);

-- Verify it worked - check points increased
SELECT id, wallet_address, points, ape_balance, tickets 
FROM profiles 
WHERE id = 'YOUR_USER_ID'::UUID;

-- Check leaderboard was updated
SELECT user_id, total_points 
FROM leaderboard 
WHERE user_id = 'YOUR_USER_ID'::UUID;
*/

-- =====================================================
-- Step 4: Test add_cryptoku_leaderboard_entry
-- =====================================================
-- Copy the user_id from Step 1 and replace YOUR_USER_ID below
-- Then uncomment and run:

/*
SELECT '=== STEP 4: Test add_cryptoku_leaderboard_entry ===' as step;

-- Replace YOUR_USER_ID with actual UUID from Step 1
SELECT add_cryptoku_leaderboard_entry(
  'test-run-' || NOW()::TEXT || '-' || RANDOM()::TEXT,  -- unique run_id
  'YOUR_USER_ID'::UUID,
  'DEGEN',
  100,  -- score
  60,   -- time_seconds
  0,    -- hints_used
  0,    -- errors
  true, -- completed
  false -- forfeited
) as entry_id;

-- Verify it worked
SELECT * FROM cryptoku_leaderboard 
WHERE user_id = 'YOUR_USER_ID'::UUID 
ORDER BY created_at DESC 
LIMIT 1;

-- Check leaderboard was updated
SELECT user_id, cryptoku_high_score 
FROM leaderboard 
WHERE user_id = 'YOUR_USER_ID'::UUID;
*/

-- =====================================================
-- ALTERNATIVE: Test All Functions at Once
-- =====================================================
-- This version uses a subquery to automatically get the first user_id

SELECT '=== AUTOMATED TEST (All Functions) ===' as step;

-- Test ensure_cryptoku_hints
SELECT 
  'ensure_cryptoku_hints' as test_name,
  ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1)) as result;

-- Test update_user_balance
SELECT 
  'update_user_balance' as test_name,
  update_user_balance(
    (SELECT id FROM profiles LIMIT 1),
    0,   -- ape_change
    0,   -- tickets_change
    1,   -- points_change (small test)
    'test',
    'Test verification'
  ) as result;

-- Test add_cryptoku_leaderboard_entry
SELECT 
  'add_cryptoku_leaderboard_entry' as test_name,
  add_cryptoku_leaderboard_entry(
    'test-run-' || NOW()::TEXT || '-' || RANDOM()::TEXT,
    (SELECT id FROM profiles LIMIT 1),
    'DEGEN',
    100,
    60,
    0,
    0,
    true,
    false
  ) as result;

-- =====================================================
-- Verify Results
-- =====================================================

SELECT '=== VERIFY RESULTS ===' as step;

-- Check hints were created
SELECT 
  'cryptoku_hints' as table_name,
  COUNT(*) as record_count
FROM cryptoku_hints
WHERE user_id = (SELECT id FROM profiles LIMIT 1);

-- Check points were updated
SELECT 
  'profiles.points' as check_name,
  points
FROM profiles
WHERE id = (SELECT id FROM profiles LIMIT 1);

-- Check leaderboard was updated
SELECT 
  'leaderboard.total_points' as check_name,
  total_points,
  cryptoku_high_score
FROM leaderboard
WHERE user_id = (SELECT id FROM profiles LIMIT 1);

-- Check leaderboard entry was created
SELECT 
  'cryptoku_leaderboard' as table_name,
  COUNT(*) as record_count
FROM cryptoku_leaderboard
WHERE user_id = (SELECT id FROM profiles LIMIT 1);
