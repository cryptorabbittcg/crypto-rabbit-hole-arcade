-- =====================================================
-- CHECK IF update_user_balance ACTUALLY UPDATED POINTS
-- =====================================================
-- If points increased, function worked but transaction INSERT failed
-- If points didn't increase, function didn't execute
-- =====================================================

-- =====================================================
-- STEP 1: Get Current Points
-- =====================================================
SELECT 
  'Current state' as check_name,
  id,
  points as current_points,
  ape_balance,
  tickets
FROM public.profiles
WHERE id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- STEP 2: Run update_user_balance
-- =====================================================
SELECT '=== RUNNING update_user_balance ===' as step;

-- This should update points by 10
SELECT public.update_user_balance(
  (SELECT id FROM profiles LIMIT 1),
  0,   -- ape_change
  0,   -- tickets_change
  10,  -- points_change
  'verification_test',
  'Points update test'
);

-- =====================================================
-- STEP 3: Check if Points Increased
-- =====================================================
SELECT '=== CHECKING POINTS ===' as step;

SELECT 
  'Points after function' as check_name,
  points as new_points,
  CASE 
    WHEN points > (SELECT points FROM public.profiles WHERE id = (SELECT id FROM profiles LIMIT 1) OFFSET 0)
    THEN '✅ POINTS INCREASED - Function executed!'
    ELSE '❌ POINTS NOT UPDATED - Function may have failed'
  END as status
FROM public.profiles
WHERE id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- STEP 4: Check for Transaction with 'verification_test' type
-- =====================================================
SELECT '=== CHECKING TRANSACTIONS ===' as step;

SELECT 
  'Transaction check' as check_name,
  COUNT(*) as count,
  MAX(transaction_type) as last_type,
  MAX(amount) as last_amount,
  MAX(currency) as last_currency
FROM public.transactions
WHERE user_id = (SELECT id FROM profiles LIMIT 1)
  AND transaction_type = 'verification_test';

-- =====================================================
-- STEP 5: Check ALL Recent Transactions
-- =====================================================
SELECT '=== ALL RECENT TRANSACTIONS ===' as step;

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
LIMIT 10;

-- =====================================================
-- STEP 6: Verify Function Definition
-- =====================================================
SELECT '=== FUNCTION DEFINITION ===' as step;

-- Show the INSERT statement part
SELECT 
  'Function INSERT statement' as check_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%INSERT INTO public.transactions%' 
      AND pg_get_functiondef(p.oid) LIKE '%p_points_change%'
    THEN '✅ Has correct INSERT with points_change check'
    ELSE '⚠️ Check function definition manually'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'update_user_balance';
