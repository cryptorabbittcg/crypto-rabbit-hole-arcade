-- =====================================================
-- DEBUG RLS BLOCKING ISSUE
-- =====================================================
-- Check if RLS is blocking INSERTs even with set_config
-- =====================================================

-- =====================================================
-- STEP 1: Check Current RLS Policies
-- =====================================================
SELECT 
  'RLS Policies' as check_name,
  policyname,
  permissive,
  roles,
  cmd,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'transactions'
ORDER BY policyname;

-- =====================================================
-- STEP 2: Check if RLS is Enabled
-- =====================================================
SELECT 
  'RLS Status' as check_name,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'transactions';

-- =====================================================
-- STEP 3: Test Direct INSERT with Session Variable Set
-- =====================================================
-- This simulates what the function should do
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get a test user
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  -- Set the session variable (like the function does)
  PERFORM set_config('app.current_user_id', test_user_id::text, true);
  
  -- Try to insert directly
  BEGIN
    INSERT INTO public.transactions (user_id, transaction_type, amount, currency, description)
    VALUES (test_user_id, 'direct_test', 10, 'points', 'Direct INSERT test with session var');
    
    RAISE NOTICE '✅ Direct INSERT succeeded!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Direct INSERT failed: %', SQLERRM;
  END;
END $$;

-- Check if it worked
SELECT 
  'Direct INSERT result' as check_name,
  COUNT(*) as count,
  MAX(transaction_type) as last_type
FROM public.transactions
WHERE transaction_type = 'direct_test';

-- =====================================================
-- STEP 4: Test INSERT as Service Role (Bypass RLS)
-- =====================================================
-- Check if we can insert without RLS check
SELECT 
  'Service role check' as check_name,
  current_setting('role', true) as current_role,
  auth.role() as auth_role;

-- =====================================================
-- STEP 5: Check Function Definition for Errors
-- =====================================================
-- Look for the INSERT statement in the function
SELECT 
  'Function INSERT check' as check_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%INSERT INTO public.transactions%' 
      AND pg_get_functiondef(p.oid) LIKE '%p_points_change != 0%'
      AND pg_get_functiondef(p.oid) LIKE '%set_config%'
    THEN '✅ Function has all required parts'
    ELSE '⚠️ Function may be missing parts'
  END as status,
  -- Show a snippet of the INSERT part
  substring(
    pg_get_functiondef(p.oid),
    position('IF p_points_change' in pg_get_functiondef(p.oid)),
    200
  ) as insert_snippet
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'update_user_balance';

-- =====================================================
-- STEP 6: Test Function with Error Handling
-- =====================================================
-- Wrap function call to catch any errors
DO $$
DECLARE
  test_user_id UUID;
  error_msg TEXT;
BEGIN
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  BEGIN
    PERFORM public.update_user_balance(
      test_user_id,
      0, 0, 20, 'error_test', 'Testing with error handling'
    );
    RAISE NOTICE '✅ Function executed without error';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
    RAISE NOTICE '❌ Function error: %', error_msg;
  END;
END $$;

-- Check if transaction was created
SELECT 
  'Function execution result' as check_name,
  COUNT(*) as transaction_count,
  MAX(amount) as last_amount
FROM public.transactions
WHERE transaction_type = 'error_test';

-- =====================================================
-- STEP 7: Check if Service Role Policy Exists
-- =====================================================
SELECT 
  'Service role policy check' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'transactions'
        AND policyname = 'Service role can insert transactions'
    ) THEN '✅ Service role policy exists'
    ELSE '❌ Service role policy missing'
  END as status;
