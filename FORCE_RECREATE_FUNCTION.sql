-- =====================================================
-- FORCE RECREATE FUNCTION TO REFRESH TABLE REFERENCE
-- =====================================================
-- The function exists but can't see the table
-- Recreating it will refresh its view of the schema
-- =====================================================

-- =====================================================
-- STEP 1: Verify Table Exists
-- =====================================================
SELECT '=== VERIFYING TABLE ===' as step;

SELECT 
  schemaname,
  tablename,
  'Table exists' as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'cryptoku_hints';

-- =====================================================
-- STEP 2: Drop and Recreate Function
-- =====================================================
SELECT '=== RECREATING FUNCTION ===' as step;

-- Drop the function first
DROP FUNCTION IF EXISTS ensure_cryptoku_hints(UUID);

-- Recreate it with explicit schema reference
CREATE FUNCTION ensure_cryptoku_hints(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
BEGIN
  -- Explicitly use public schema
  INSERT INTO public.cryptoku_hints (user_id, hint_balance, total_ranked_completed)
  VALUES (p_user_id, 3, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- =====================================================
-- STEP 3: Test the Function
-- =====================================================
SELECT '=== TESTING FUNCTION ===' as step;

-- Test it
SELECT 
  'Function test' as test_name,
  ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1)) as result;

-- =====================================================
-- STEP 4: Verify It Worked
-- =====================================================
SELECT '=== VERIFICATION ===' as step;

SELECT 
  'Record created' as status,
  COUNT(*) as count,
  MAX(hint_balance) as hint_balance
FROM public.cryptoku_hints
WHERE user_id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- STEP 5: Also Fix Other Functions That Use This Table
-- =====================================================
SELECT '=== FIXING OTHER FUNCTIONS ===' as step;

-- Fix use_cryptoku_hint
CREATE OR REPLACE FUNCTION use_cryptoku_hint(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_total_completed INTEGER;
  v_games_until_next INTEGER;
BEGIN
  PERFORM ensure_cryptoku_hints(p_user_id);
  
  SELECT hint_balance, total_ranked_completed
  INTO v_current_balance, v_total_completed
  FROM public.cryptoku_hints
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_current_balance IS NULL OR v_current_balance <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No hints remaining',
      'hintBalance', COALESCE(v_current_balance, 0)
    );
  END IF;
  
  UPDATE public.cryptoku_hints
  SET 
    hint_balance = hint_balance - 1,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND hint_balance > 0
  RETURNING hint_balance, total_ranked_completed
  INTO v_new_balance, v_total_completed;
  
  IF v_new_balance IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to use hint'
    );
  END IF;
  
  v_games_until_next := 10 - (v_total_completed % 10);
  
  RETURN json_build_object(
    'success', true,
    'hintBalance', v_new_balance,
    'gamesUntilNextFreeHint', v_games_until_next
  );
END;
$$;

-- Fix reward_cryptoku_hint
CREATE OR REPLACE FUNCTION reward_cryptoku_hint(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
DECLARE
  v_hints_earned INTEGER;
  v_new_balance INTEGER;
  v_total_completed INTEGER;
  v_old_total INTEGER;
  v_games_until_next INTEGER;
BEGIN
  PERFORM ensure_cryptoku_hints(p_user_id);
  
  SELECT total_ranked_completed INTO v_old_total
  FROM public.cryptoku_hints
  WHERE user_id = p_user_id;
  
  IF (v_old_total + 1) % 10 = 0 THEN
    v_hints_earned := 1;
  ELSE
    v_hints_earned := 0;
  END IF;
  
  UPDATE public.cryptoku_hints
  SET 
    total_ranked_completed = total_ranked_completed + 1,
    hint_balance = hint_balance + v_hints_earned,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING 
    total_ranked_completed,
    hint_balance
  INTO v_total_completed, v_new_balance;
  
  v_games_until_next := 10 - (v_total_completed % 10);
  
  RETURN json_build_object(
    'hintsEarned', v_hints_earned,
    'hintBalance', v_new_balance,
    'totalRankedCompleted', v_total_completed,
    'gamesUntilNextFreeHint', v_games_until_next
  );
END;
$$;

-- Fix purchase_cryptoku_hints
CREATE OR REPLACE FUNCTION purchase_cryptoku_hints(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
DECLARE
  v_new_balance INTEGER;
  v_total_completed INTEGER;
  v_games_until_next INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid amount'
    );
  END IF;
  
  PERFORM ensure_cryptoku_hints(p_user_id);
  
  UPDATE public.cryptoku_hints
  SET 
    hint_balance = hint_balance + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING hint_balance, total_ranked_completed
  INTO v_new_balance, v_total_completed;
  
  v_games_until_next := 10 - (v_total_completed % 10);
  
  RETURN json_build_object(
    'success', true,
    'hintBalance', v_new_balance,
    'gamesUntilNextFreeHint', v_games_until_next
  );
END;
$$;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================
SELECT '=== FINAL VERIFICATION ===' as step;

SELECT 
  'All functions fixed' as status,
  COUNT(*) as function_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'ensure_cryptoku_hints',
    'use_cryptoku_hint',
    'reward_cryptoku_hint',
    'purchase_cryptoku_hints'
  )
  AND p.prosecdef = true
  AND pg_get_functiondef(p.oid) LIKE '%search_path%'
  AND pg_get_functiondef(p.oid) LIKE '%public.cryptoku_hints%';

-- Should return: 4
