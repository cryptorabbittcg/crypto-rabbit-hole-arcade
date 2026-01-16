-- =====================================================
-- RECREATE ensure_cryptoku_hints FUNCTION
-- =====================================================
-- The function was dropped but not recreated properly
-- This recreates it with the correct signature
-- =====================================================

-- =====================================================
-- STEP 1: Check What Functions Exist
-- =====================================================
SELECT '=== CHECKING EXISTING FUNCTIONS ===' as step;

SELECT 
  p.proname,
  pg_get_function_identity_arguments(p.oid) as signature,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'ensure_cryptoku_hints';

-- =====================================================
-- STEP 2: Drop All Versions (if any exist)
-- =====================================================
SELECT '=== DROPPING OLD VERSIONS ===' as step;

DROP FUNCTION IF EXISTS ensure_cryptoku_hints(UUID);
DROP FUNCTION IF EXISTS ensure_cryptoku_hints(uuid);
DROP FUNCTION IF EXISTS public.ensure_cryptoku_hints(UUID);
DROP FUNCTION IF EXISTS public.ensure_cryptoku_hints(uuid);

-- =====================================================
-- STEP 3: Verify Table Exists
-- =====================================================
SELECT '=== VERIFYING TABLE ===' as step;

SELECT 
  'Table exists' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'cryptoku_hints'
    ) THEN '✅ YES'
    ELSE '❌ NO - TABLE MISSING!'
  END as status;

-- =====================================================
-- STEP 4: Create Function with Explicit Signature
-- =====================================================
SELECT '=== CREATING FUNCTION ===' as step;

CREATE FUNCTION ensure_cryptoku_hints(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
BEGIN
  INSERT INTO public.cryptoku_hints (user_id, hint_balance, total_ranked_completed)
  VALUES (p_user_id, 3, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- =====================================================
-- STEP 5: Verify Function Was Created
-- =====================================================
SELECT '=== VERIFYING FUNCTION ===' as step;

SELECT 
  'Function created' as check_name,
  p.proname,
  pg_get_function_identity_arguments(p.oid) as signature,
  CASE WHEN p.prosecdef THEN '✅ SECURITY DEFINER' ELSE '❌ SECURITY INVOKER' END as security,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%search_path%' THEN '✅ HAS search_path'
    ELSE '❌ MISSING search_path'
  END as search_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'ensure_cryptoku_hints';

-- =====================================================
-- STEP 6: Test the Function
-- =====================================================
SELECT '=== TESTING FUNCTION ===' as step;

-- Test it
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get a test user
  SELECT id INTO test_user_id FROM profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'No profiles found to test with';
  END IF;
  
  -- Call the function
  PERFORM ensure_cryptoku_hints(test_user_id);
  
  RAISE NOTICE 'Function executed successfully for user: %', test_user_id;
END $$;

-- =====================================================
-- STEP 7: Verify Record Was Created
-- =====================================================
SELECT '=== VERIFYING RECORD ===' as step;

SELECT 
  'Record created' as check_name,
  COUNT(*) as count,
  MAX(hint_balance) as hint_balance,
  MAX(total_ranked_completed) as total_ranked_completed
FROM public.cryptoku_hints
WHERE user_id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- STEP 8: Test use_cryptoku_hint Can Call It
-- =====================================================
SELECT '=== TESTING use_cryptoku_hint ===' as step;

SELECT 
  'use_cryptoku_hint test' as test_name,
  use_cryptoku_hint((SELECT id FROM profiles LIMIT 1)) as result;
