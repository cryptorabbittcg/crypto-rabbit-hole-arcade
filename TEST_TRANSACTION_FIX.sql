-- =====================================================
-- TEST TRANSACTION RECORDING AFTER FIX
-- =====================================================
-- This script tests if update_user_balance now records transactions
-- =====================================================

-- =====================================================
-- STEP 1: Get Test User and Current State
-- =====================================================
SELECT 
  'Test user' as step,
  id as user_id,
  points as current_points,
  ape_balance,
  tickets
FROM public.profiles
LIMIT 1;

-- =====================================================
-- STEP 2: Count Transactions Before
-- =====================================================
SELECT 
  'Transactions before' as step,
  COUNT(*) as transaction_count
FROM public.transactions
WHERE user_id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- STEP 3: Run update_user_balance
-- =====================================================
SELECT '=== RUNNING update_user_balance ===' as step;

SELECT public.update_user_balance(
  (SELECT id FROM profiles LIMIT 1),
  0,   -- ape_change
  0,   -- tickets_change
  15,  -- points_change (should create transaction)
  'test_fix',
  'Testing transaction recording after RLS fix'
);

-- =====================================================
-- STEP 4: Check if Points Increased
-- =====================================================
SELECT 
  'Points after function' as step,
  points as new_points,
  CASE 
    WHEN points >= (SELECT points FROM public.profiles WHERE id = (SELECT id FROM profiles LIMIT 1) OFFSET 0) + 15
    THEN '✅ POINTS INCREASED - Function executed!'
    ELSE '❌ POINTS NOT UPDATED'
  END as status
FROM public.profiles
WHERE id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- STEP 5: Check if Transaction Was Created
-- =====================================================
SELECT 
  'Transaction check' as step,
  COUNT(*) as transaction_count,
  MAX(transaction_type) as last_type,
  MAX(amount) as last_amount,
  MAX(currency) as last_currency,
  MAX(description) as last_description,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ TRANSACTION RECORDED - FIX WORKS!'
    ELSE '❌ NO TRANSACTION - Still broken'
  END as status
FROM public.transactions
WHERE user_id = (SELECT id FROM profiles LIMIT 1)
  AND transaction_type = 'test_fix';

-- =====================================================
-- STEP 6: Show the Transaction Details
-- =====================================================
SELECT 
  'Transaction details' as step,
  id,
  transaction_type,
  amount,
  currency,
  description,
  created_at
FROM public.transactions
WHERE user_id = (SELECT id FROM profiles LIMIT 1)
  AND transaction_type = 'test_fix'
ORDER BY created_at DESC;

-- =====================================================
-- STEP 7: Test with Different Currency (APE)
-- =====================================================
SELECT '=== TESTING APE TRANSACTION ===' as step;

SELECT public.update_user_balance(
  (SELECT id FROM profiles LIMIT 1),
  5,   -- ape_change (should create transaction)
  0,   -- tickets_change
  0,   -- points_change
  'test_ape',
  'Testing APE transaction recording'
);

SELECT 
  'APE transaction check' as step,
  COUNT(*) as count,
  MAX(currency) as currency,
  MAX(amount) as amount,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ APE TRANSACTION RECORDED'
    ELSE '❌ APE TRANSACTION FAILED'
  END as status
FROM public.transactions
WHERE user_id = (SELECT id FROM profiles LIMIT 1)
  AND transaction_type = 'test_ape';

-- =====================================================
-- STEP 8: Final Summary
-- =====================================================
SELECT 
  '=== FINAL SUMMARY ===' as summary,
  (SELECT COUNT(*) FROM public.transactions WHERE user_id = (SELECT id FROM profiles LIMIT 1) AND transaction_type IN ('test_fix', 'test_ape')) as total_test_transactions,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.transactions WHERE user_id = (SELECT id FROM profiles LIMIT 1) AND transaction_type IN ('test_fix', 'test_ape')) >= 2
    THEN '✅ ALL TRANSACTIONS RECORDED - FIX SUCCESSFUL!'
    ELSE '❌ SOME TRANSACTIONS MISSING - Need further investigation'
  END as final_status;
