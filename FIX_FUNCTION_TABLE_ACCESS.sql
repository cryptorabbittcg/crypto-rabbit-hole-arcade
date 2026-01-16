-- =====================================================
-- FIX: Function Can't Find cryptoku_hints Table
-- =====================================================
-- The function exists but can't see the table
-- This recreates the function to fix the issue
-- =====================================================

-- =====================================================
-- STEP 1: Verify Table Exists in Public Schema
-- =====================================================
SELECT '=== VERIFYING TABLE ===' as step;

SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN schemaname = 'public' AND tablename = 'cryptoku_hints' THEN '✅ FOUND IN PUBLIC SCHEMA'
    ELSE '❌ WRONG SCHEMA OR MISSING'
  END as status
FROM pg_tables
WHERE tablename = 'cryptoku_hints';

-- =====================================================
-- STEP 2: Recreate ensure_cryptoku_hints Function
-- =====================================================
-- This ensures the function can see the table
SELECT '=== RECREATING FUNCTION ===' as step;

CREATE OR REPLACE FUNCTION ensure_cryptoku_hints(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
BEGIN
  -- Explicitly reference public schema to be safe
  INSERT INTO public.cryptoku_hints (user_id, hint_balance, total_ranked_completed)
  VALUES (p_user_id, 3, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- =====================================================
-- STEP 3: Verify Function Can See Table
-- =====================================================
SELECT '=== TESTING FUNCTION ===' as step;

-- Test with explicit schema check
DO $$
DECLARE
  test_user_id UUID;
  table_exists BOOLEAN;
BEGIN
  -- Get a test user
  SELECT id INTO test_user_id FROM profiles LIMIT 1;
  
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'cryptoku_hints'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE EXCEPTION 'Table cryptoku_hints does not exist in public schema';
  END IF;
  
  -- Try to call the function
  PERFORM ensure_cryptoku_hints(test_user_id);
  
  RAISE NOTICE 'Function executed successfully';
END $$;

-- =====================================================
-- STEP 4: Verify Record Was Created
-- =====================================================
SELECT '=== VERIFYING RECORD ===' as step;

SELECT 
  'Record created' as status,
  COUNT(*) as count,
  MAX(hint_balance) as hint_balance,
  MAX(total_ranked_completed) as total_ranked_completed
FROM cryptoku_hints
WHERE user_id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- STEP 5: Check Function Definition
-- =====================================================
SELECT '=== FUNCTION DEFINITION ===' as step;

SELECT 
  p.proname,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%search_path%' THEN '✅ HAS search_path'
    ELSE '❌ MISSING search_path'
  END as search_path_status,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%public.cryptoku_hints%' THEN '✅ Uses public schema'
    WHEN pg_get_functiondef(p.oid) LIKE '%cryptoku_hints%' THEN '⚠️ Uses unqualified name'
    ELSE '❌ No table reference'
  END as table_reference
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'ensure_cryptoku_hints';
