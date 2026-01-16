-- =====================================================
-- FIX: Function Can't Find Table Even Though It Exists
-- =====================================================
-- Table exists but function can't see it
-- This recreates function with explicit schema qualification
-- =====================================================

-- =====================================================
-- STEP 1: Verify Table Exists
-- =====================================================
SELECT '=== VERIFYING TABLE ===' as step;

SELECT 
  'Table exists' as check_name,
  schemaname,
  tablename,
  '✅ CONFIRMED' as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'cryptoku_hints';

-- =====================================================
-- STEP 2: Test Direct Query
-- =====================================================
SELECT '=== TESTING DIRECT QUERY ===' as step;

SELECT 
  'Direct query test' as check_name,
  COUNT(*) as row_count
FROM public.cryptoku_hints;

-- =====================================================
-- STEP 3: Drop Function
-- =====================================================
SELECT '=== DROPPING FUNCTION ===' as step;

DROP FUNCTION IF EXISTS ensure_cryptoku_hints(UUID);
DROP FUNCTION IF EXISTS ensure_cryptoku_hints(uuid);
DROP FUNCTION IF EXISTS public.ensure_cryptoku_hints(UUID);
DROP FUNCTION IF EXISTS public.ensure_cryptoku_hints(uuid);

-- =====================================================
-- STEP 4: Recreate Function with Explicit Schema
-- =====================================================
SELECT '=== RECREATING FUNCTION ===' as step;

CREATE FUNCTION public.ensure_cryptoku_hints(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
BEGIN
  -- Explicitly use public schema
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
  n.nspname as schema_name,
  pg_get_function_identity_arguments(p.oid) as signature,
  CASE WHEN p.prosecdef THEN '✅ SECURITY DEFINER' ELSE '❌ SECURITY INVOKER' END as security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'ensure_cryptoku_hints';

-- =====================================================
-- STEP 6: Test Function
-- =====================================================
SELECT '=== TESTING FUNCTION ===' as step;

-- Test with explicit schema call
SELECT 
  'Function test' as test_name,
  public.ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1)) as result;

-- =====================================================
-- STEP 7: Verify Record Created
-- =====================================================
SELECT '=== VERIFYING RECORD ===' as step;

SELECT 
  'Record created' as check_name,
  COUNT(*) as record_count,
  MAX(hint_balance) as hint_balance
FROM public.cryptoku_hints
WHERE user_id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- STEP 8: Test from use_cryptoku_hint
-- =====================================================
SELECT '=== TESTING use_cryptoku_hint ===' as step;

SELECT 
  'use_cryptoku_hint test' as test_name,
  use_cryptoku_hint((SELECT id FROM profiles LIMIT 1)) as result;
