-- =====================================================
-- FIX TRANSACTIONS RLS FOR update_user_balance
-- =====================================================
-- Problem: update_user_balance has SECURITY DEFINER but
-- RLS policy requires current_setting('app.current_user_id')
-- which may not be set when function runs.
--
-- Solution: Add a policy that allows service role/functions
-- to insert transactions, OR modify function to set session var
-- =====================================================

-- =====================================================
-- OPTION 1: Add Policy for Service Role (Recommended)
-- =====================================================
-- This allows the service role (used by admin client) to insert
-- transactions without needing the session variable

DROP POLICY IF EXISTS "Service role can insert transactions" ON public.transactions;
CREATE POLICY "Service role can insert transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (
    -- Allow if called from service role context
    -- (when using admin client with service_role_key)
    auth.role() = 'service_role'
  );

-- =====================================================
-- OPTION 2: Allow SECURITY DEFINER Functions
-- =====================================================
-- Alternative: Allow inserts when user_id matches the function's parameter
-- This is less secure but works if service_role check doesn't work

-- DROP POLICY IF EXISTS "Functions can insert transactions" ON public.transactions;
-- CREATE POLICY "Functions can insert transactions"
--   ON public.transactions
--   FOR INSERT
--   WITH CHECK (true);  -- Allow all inserts from functions
--   -- WARNING: This is permissive - only use if Option 1 doesn't work

-- =====================================================
-- OPTION 3: Modify Function to Set Session Variable
-- =====================================================
-- Update the function to set the session variable before INSERT
-- This ensures RLS policy passes

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
  -- Set session variable for RLS policies
  PERFORM set_config('app.current_user_id', p_user_id::text, true);
  
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
-- VERIFY THE FIX
-- =====================================================
-- Check policies on transactions table
SELECT 
  'RLS Policies' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'transactions'
ORDER BY policyname;

-- Check function definition includes set_config
SELECT 
  'Function has set_config' as check_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%set_config%' THEN '✅ Function sets session variable'
    ELSE '❌ Function missing set_config'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'update_user_balance';
