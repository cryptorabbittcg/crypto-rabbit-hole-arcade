-- =====================================================
-- FIX: update_user_balance Can't Find profiles Table
-- =====================================================
-- Same issue as cryptoku_hints - needs explicit schema
-- =====================================================

-- =====================================================
-- STEP 1: Verify profiles Table Exists
-- =====================================================
SELECT '=== VERIFYING profiles TABLE ===' as step;

SELECT 
  'Table exists' as check_name,
  schemaname,
  tablename,
  '✅ CONFIRMED' as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

-- =====================================================
-- STEP 2: Recreate update_user_balance with Explicit Schema
-- =====================================================
SELECT '=== RECREATING FUNCTION ===' as step;

CREATE OR REPLACE FUNCTION public.update_user_balance(
  p_user_id UUID,
  p_ape_change INTEGER DEFAULT 0,
  p_tickets_change INTEGER DEFAULT 0,
  p_points_change INTEGER DEFAULT 0,
  p_transaction_type TEXT DEFAULT 'manual',
  p_description TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
BEGIN
  -- Update profile balances (explicit schema)
  UPDATE public.profiles
  SET 
    ape_balance = GREATEST(0, ape_balance + p_ape_change),
    tickets = GREATEST(0, tickets + p_tickets_change),
    points = GREATEST(0, points + p_points_change)
  WHERE id = p_user_id;
  
  -- Record transactions (explicit schema)
  IF p_ape_change != 0 THEN
    INSERT INTO public.transactions (user_id, transaction_type, amount, currency, description)
    VALUES (p_user_id, p_transaction_type, p_ape_change, 'ape', p_description);
  END IF;
  
  IF p_tickets_change != 0 THEN
    INSERT INTO public.transactions (user_id, transaction_type, amount, currency, description)
    VALUES (p_user_id, p_transaction_type, p_tickets_change, 'tickets', p_description);
  END IF;
  
  IF p_points_change != 0 THEN
    INSERT INTO public.transactions (user_id, transaction_type, amount, currency, description)
    VALUES (p_user_id, p_transaction_type, p_points_change, 'points', p_description);
    
    -- Update leaderboard (explicit schema)
    UPDATE public.leaderboard
    SET total_points = total_points + p_points_change
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- =====================================================
-- STEP 3: Verify Function Was Created
-- =====================================================
SELECT '=== VERIFYING FUNCTION ===' as step;

SELECT 
  'Function created' as check_name,
  p.proname,
  pg_get_function_identity_arguments(p.oid) as signature,
  CASE WHEN p.prosecdef THEN '✅ SECURITY DEFINER' ELSE '❌ SECURITY INVOKER' END as security,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%public.profiles%' THEN '✅ Uses explicit schema'
    ELSE '⚠️ Check manually'
  END as schema_qualification
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'update_user_balance';

-- =====================================================
-- STEP 4: Test the Function
-- =====================================================
SELECT '=== TESTING FUNCTION ===' as step;

-- Test it
SELECT 
  'Function test' as test_name,
  public.update_user_balance(
    (SELECT id FROM profiles LIMIT 1),
    0,   -- ape_change
    0,   -- tickets_change
    1,   -- points_change (small test)
    'test',
    'System test'
  ) as result,
  '✅ Should return: (no error)' as expected;

-- =====================================================
-- STEP 5: Verify Points Were Updated
-- =====================================================
SELECT '=== VERIFYING POINTS ===' as step;

SELECT 
  'Points updated' as check_name,
  points as current_points
FROM public.profiles
WHERE id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- STEP 6: Verify Leaderboard Was Updated
-- =====================================================
SELECT '=== VERIFYING LEADERBOARD ===' as step;

SELECT 
  'Leaderboard updated' as check_name,
  total_points as current_total_points
FROM public.leaderboard
WHERE user_id = (SELECT id FROM profiles LIMIT 1);
