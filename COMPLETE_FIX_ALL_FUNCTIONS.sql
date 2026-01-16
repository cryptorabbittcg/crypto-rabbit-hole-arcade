-- =====================================================
-- COMPLETE FIX: Recreate ALL Functions That Use cryptoku_hints
-- =====================================================
-- This ensures all functions are recreated and can see the table
-- =====================================================

-- =====================================================
-- STEP 1: Create ensure_cryptoku_hints
-- =====================================================
CREATE OR REPLACE FUNCTION public.ensure_cryptoku_hints(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
BEGIN
  INSERT INTO public.cryptoku_hints (user_id, hint_balance, total_ranked_completed)
  VALUES (p_user_id, 3, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- =====================================================
-- STEP 2: Recreate use_cryptoku_hint (calls ensure_cryptoku_hints)
-- =====================================================
CREATE OR REPLACE FUNCTION public.use_cryptoku_hint(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_total_completed INTEGER;
  v_games_until_next INTEGER;
BEGIN
  PERFORM public.ensure_cryptoku_hints(p_user_id);
  
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

-- =====================================================
-- STEP 3: Recreate reward_cryptoku_hint (calls ensure_cryptoku_hints)
-- =====================================================
CREATE OR REPLACE FUNCTION public.reward_cryptoku_hint(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_hints_earned INTEGER;
  v_new_balance INTEGER;
  v_total_completed INTEGER;
  v_old_total INTEGER;
  v_games_until_next INTEGER;
BEGIN
  PERFORM public.ensure_cryptoku_hints(p_user_id);
  
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

-- =====================================================
-- STEP 4: Recreate purchase_cryptoku_hints (calls ensure_cryptoku_hints)
-- =====================================================
CREATE OR REPLACE FUNCTION public.purchase_cryptoku_hints(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
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
  
  PERFORM public.ensure_cryptoku_hints(p_user_id);
  
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
-- STEP 5: Verify All Functions Exist
-- =====================================================
SELECT 
  'Functions verification' as check_name,
  proname,
  CASE WHEN prosecdef THEN '✅ SECURITY DEFINER' ELSE '❌ SECURITY INVOKER' END as security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'ensure_cryptoku_hints',
    'use_cryptoku_hint',
    'reward_cryptoku_hint',
    'purchase_cryptoku_hints'
  )
ORDER BY proname;

-- =====================================================
-- STEP 6: Test All Functions
-- =====================================================
SELECT '=== TESTING FUNCTIONS ===' as step;

-- Test ensure_cryptoku_hints
SELECT 
  'ensure_cryptoku_hints' as function_name,
  public.ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1)) as result;

-- Test use_cryptoku_hint
SELECT 
  'use_cryptoku_hint' as function_name,
  public.use_cryptoku_hint((SELECT id FROM profiles LIMIT 1)) as result;

-- Test reward_cryptoku_hint
SELECT 
  'reward_cryptoku_hint' as function_name,
  public.reward_cryptoku_hint((SELECT id FROM profiles LIMIT 1)) as result;
