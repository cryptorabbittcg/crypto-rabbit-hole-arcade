-- =====================================================
-- DEBUG: Why update_user_balance Isn't Recording Transactions
-- =====================================================
-- Check if function executed and what happened
-- =====================================================

-- =====================================================
-- STEP 1: Get Test User Info
-- =====================================================
SELECT '=== TEST USER INFO ===' as step;

SELECT 
  id as user_id,
  wallet_address,
  points as current_points,
  ape_balance,
  tickets
FROM public.profiles
LIMIT 1;

-- =====================================================
-- STEP 2: Check Current Points (Before)
-- =====================================================
SELECT '=== POINTS BEFORE ===' as step;

SELECT 
  'Before' as check_name,
  points as current_points
FROM public.profiles
WHERE id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- STEP 3: Run update_user_balance
-- =====================================================
SELECT '=== RUNNING FUNCTION ===' as step;

-- Replace YOUR_USER_ID with actual ID from Step 1
-- SELECT public.update_user_balance(
--   'YOUR_USER_ID'::UUID,
--   0,   -- ape_change
--   0,   -- tickets_change
--   10,  -- points_change
--   'test',
--   'Debug test'
-- );

-- =====================================================
-- STEP 4: Check Points After
-- =====================================================
SELECT '=== POINTS AFTER ===' as step;

SELECT 
  'After' as check_name,
  points as current_points,
  CASE 
    WHEN points > (SELECT points FROM profiles WHERE id = (SELECT id FROM profiles LIMIT 1) OFFSET 0) 
    THEN '✅ POINTS INCREASED'
    ELSE '❌ POINTS NOT UPDATED'
  END as status
FROM public.profiles
WHERE id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- STEP 5: Check ALL Transactions (Not Just 'test')
-- =====================================================
SELECT '=== ALL TRANSACTIONS ===' as step;

SELECT 
  'All transactions' as check_name,
  COUNT(*) as total_count,
  MAX(transaction_type) as last_type,
  MAX(currency) as last_currency,
  MAX(amount) as last_amount
FROM public.transactions
WHERE user_id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- STEP 6: Check Recent Transactions
-- =====================================================
SELECT '=== RECENT TRANSACTIONS ===' as step;

SELECT 
  id,
  transaction_type,
  amount,
  currency,
  description,
  created_at
FROM public.transactions
WHERE user_id = (SELECT id FROM profiles LIMIT 1)
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- STEP 7: Check Function Definition
-- =====================================================
SELECT '=== FUNCTION DEFINITION CHECK ===' as step;

SELECT 
  'Function uses public.transactions' as check_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%public.transactions%' THEN '✅ YES'
    ELSE '❌ NO'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'update_user_balance';

-- =====================================================
-- STEP 8: Test Direct INSERT into transactions
-- =====================================================
SELECT '=== TEST DIRECT INSERT ===' as step;

-- Test if we can insert directly
INSERT INTO public.transactions (
  user_id,
  transaction_type,
  amount,
  currency,
  description
)
VALUES (
  (SELECT id FROM profiles LIMIT 1),
  'direct_test',
  1,
  'points',
  'Direct insert test'
)
RETURNING id, transaction_type, amount, currency;

-- =====================================================
-- STEP 9: Verify Direct Insert Worked
-- =====================================================
SELECT '=== VERIFY DIRECT INSERT ===' as step;

SELECT 
  'Direct insert verification' as check_name,
  COUNT(*) as count
FROM public.transactions
WHERE user_id = (SELECT id FROM profiles LIMIT 1)
  AND transaction_type = 'direct_test';
