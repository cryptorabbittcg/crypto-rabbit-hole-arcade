-- =====================================================
-- COMPLETE SCHEMA FIX - All Functions
-- =====================================================
-- Fixes ALL functions to use explicit public. schema
-- This prevents "relation does not exist" errors
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
CREATE OR REPLACE FUNCTION public.add_cryptoku_leaderboard_entry(
  p_run_id TEXT,
  p_user_id UUID,
  p_mode TEXT,
  p_score INTEGER,
  p_time_seconds INTEGER,
  p_hints_used INTEGER,
  p_errors INTEGER,
  p_completed BOOLEAN DEFAULT TRUE,
  p_forfeited BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  IF p_mode NOT IN ('DEGEN', 'APE') OR NOT p_completed OR p_forfeited THEN
    INSERT INTO public.cryptoku_leaderboard (
      run_id, user_id, mode, score, time_seconds, hints_used, errors, completed, forfeited
    )
    VALUES (
      p_run_id, p_user_id, p_mode, p_score, p_time_seconds, p_hints_used, p_errors, p_completed, p_forfeited
    )
    ON CONFLICT (run_id) DO NOTHING
    RETURNING id INTO v_entry_id;
    
    RETURN v_entry_id;
  END IF;
  
  INSERT INTO public.cryptoku_leaderboard (
    run_id, user_id, mode, score, time_seconds, hints_used, errors, completed, forfeited
  )
  VALUES (
    p_run_id, p_user_id, p_mode, p_score, p_time_seconds, p_hints_used, p_errors, p_completed, p_forfeited
  )
  ON CONFLICT (run_id) DO UPDATE SET
    score = EXCLUDED.score,
    time_seconds = EXCLUDED.time_seconds,
    hints_used = EXCLUDED.hints_used,
    errors = EXCLUDED.errors,
    completed = EXCLUDED.completed,
    forfeited = EXCLUDED.forfeited
  RETURNING id INTO v_entry_id;
  
  UPDATE public.leaderboard
  SET 
    cryptoku_high_score = GREATEST(
      COALESCE(cryptoku_high_score, 0),
      p_score
    ),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.leaderboard (user_id, cryptoku_high_score, updated_at)
    VALUES (p_user_id, p_score, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      cryptoku_high_score = GREATEST(public.leaderboard.cryptoku_high_score, p_score),
      updated_at = NOW();
  END IF;
  
  RETURN v_entry_id;
END;
$$;

-- =====================================================
-- VERIFY ALL FUNCTIONS USE EXPLICIT SCHEMA
-- =====================================================
SELECT '=== VERIFICATION ===' as step;

SELECT 
  p.proname,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%public.profiles%' THEN '✅ profiles'
    WHEN pg_get_functiondef(p.oid) LIKE '%public.cryptoku_hints%' THEN '✅ cryptoku_hints'
    WHEN pg_get_functiondef(p.oid) LIKE '%public.leaderboard%' THEN '✅ leaderboard'
    WHEN pg_get_functiondef(p.oid) LIKE '%public.cryptoku_leaderboard%' THEN '✅ cryptoku_leaderboard'
    WHEN pg_get_functiondef(p.oid) LIKE '%public.transactions%' THEN '✅ transactions'
    ELSE '⚠️ Check manually'
  END as uses_explicit_schema
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
-- TEST ALL FUNCTIONS
-- =====================================================
SELECT '=== TESTING ===' as step;

-- Test update_user_balance
SELECT 
  'update_user_balance' as test_name,
  public.update_user_balance(
    (SELECT id FROM profiles LIMIT 1),
    0, 0, 1, 'test', 'Test'
  ) as result;

-- Test add_cryptoku_leaderboard_entry
SELECT 
  'add_cryptoku_leaderboard_entry' as test_name,
  public.add_cryptoku_leaderboard_entry(
    'test-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    (SELECT id FROM profiles LIMIT 1),
    'DEGEN',
    100,
    60,
    0,
    0,
    true,
    false
  ) as result;
