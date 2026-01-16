-- =====================================================
-- VERIFY IF update_user_balance ACTUALLY WORKED
-- =====================================================
-- Check if points were updated (proves function executed)
-- =====================================================

-- =====================================================
-- CHECK 1: Current Points
-- =====================================================
SELECT 
  'Current points' as check_name,
  id,
  wallet_address,
  points,
  ape_balance,
  tickets
FROM public.profiles
WHERE id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- CHECK 2: Run update_user_balance and Check Points
-- =====================================================
-- First, note the current points value above
-- Then run this:
SELECT public.update_user_balance(
  (SELECT id FROM profiles LIMIT 1),
  0,   -- ape_change
  0,   -- tickets_change
  10,  -- points_change
  'test',
  'Verification test'
);

-- Then check points again - did they increase by 10?
SELECT 
  'Points after function' as check_name,
  points,
  CASE 
    WHEN points >= (SELECT points FROM public.profiles WHERE id = (SELECT id FROM profiles LIMIT 1) OFFSET 0) + 10
    THEN '✅ POINTS INCREASED (Function worked!)'
    ELSE '❌ POINTS NOT UPDATED (Function may have failed)'
  END as status
FROM public.profiles
WHERE id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- CHECK 3: Check Leaderboard Was Updated
-- =====================================================
SELECT 
  'Leaderboard points' as check_name,
  total_points,
  cryptoku_high_score,
  ape_in_high_score
FROM public.leaderboard
WHERE user_id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- CHECK 4: Check Function Definition
-- =====================================================
SELECT 
  'Function definition' as check_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%INSERT INTO public.transactions%' THEN '✅ Uses public.transactions'
    WHEN pg_get_functiondef(p.oid) LIKE '%INSERT INTO transactions%' THEN '⚠️ Uses transactions (no schema)'
    ELSE '❌ No INSERT found'
  END as insert_statement,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%IF p_points_change != 0%' THEN '✅ Has points check'
    ELSE '❌ Missing points check'
  END as points_check
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'update_user_balance';

-- =====================================================
-- CHECK 5: Show Full Function Definition
-- =====================================================
SELECT 
  'Full function definition' as check_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'update_user_balance';
