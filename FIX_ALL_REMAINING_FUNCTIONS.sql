-- =====================================================
-- FIX ALL FUNCTIONS THAT USE profiles/leaderboard/transactions
-- =====================================================
-- These functions also need explicit schema qualification
-- =====================================================

-- =====================================================
-- FIX 1: update_user_balance
-- =====================================================
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
  UPDATE public.profiles
  SET 
    ape_balance = GREATEST(0, ape_balance + p_ape_change),
    tickets = GREATEST(0, tickets + p_tickets_change),
    points = GREATEST(0, points + p_points_change)
  WHERE id = p_user_id;
  
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
    
    UPDATE public.leaderboard
    SET total_points = total_points + p_points_change
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- =====================================================
-- FIX 2: add_cryptoku_leaderboard_entry
-- =====================================================
-- Check if this function also needs fixing
SELECT '=== CHECKING add_cryptoku_leaderboard_entry ===' as step;

-- Verify it uses explicit schema
SELECT 
  'add_cryptoku_leaderboard_entry schema check' as check_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%public.leaderboard%' THEN '✅ Uses explicit schema'
    WHEN pg_get_functiondef(p.oid) LIKE '%public.cryptoku_leaderboard%' THEN '✅ Uses explicit schema'
    ELSE '⚠️ May need fixing'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'add_cryptoku_leaderboard_entry';

-- =====================================================
-- VERIFY ALL FUNCTIONS
-- =====================================================
SELECT '=== FUNCTION VERIFICATION ===' as step;

SELECT 
  p.proname,
  CASE WHEN p.prosecdef THEN '✅ SECURITY DEFINER' ELSE '❌ SECURITY INVOKER' END as security,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%public.%' THEN '✅ Uses explicit schema'
    ELSE '⚠️ May need fixing'
  END as schema_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'update_user_balance',
    'add_cryptoku_leaderboard_entry',
    'ensure_cryptoku_hints',
    'use_cryptoku_hint',
    'reward_cryptoku_hint',
    'purchase_cryptoku_hints'
  )
ORDER BY p.proname;

-- =====================================================
-- TEST update_user_balance
-- =====================================================
SELECT '=== TESTING update_user_balance ===' as step;

SELECT 
  'update_user_balance test' as test_name,
  public.update_user_balance(
    (SELECT id FROM profiles LIMIT 1),
    0,
    0,
    1,
    'test',
    'System test'
  ) as result;
