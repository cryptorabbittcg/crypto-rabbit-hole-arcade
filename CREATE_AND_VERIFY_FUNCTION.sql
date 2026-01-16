-- =====================================================
-- CREATE ensure_cryptoku_hints AND VERIFY IT WORKS
-- =====================================================
-- This creates the function and immediately verifies it
-- =====================================================

-- =====================================================
-- STEP 1: Create the function
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
-- STEP 2: Verify function exists
-- =====================================================
SELECT 
  'Function verification' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'ensure_cryptoku_hints'
    ) THEN '✅ FUNCTION EXISTS'
    ELSE '❌ FUNCTION MISSING'
  END as status;

-- =====================================================
-- STEP 3: Test the function directly
-- =====================================================
SELECT 
  'Direct function test' as test_name,
  public.ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1)) as result;

-- =====================================================
-- STEP 4: Verify record was created
-- =====================================================
SELECT 
  'Record verification' as check_name,
  COUNT(*) as record_count
FROM public.cryptoku_hints
WHERE user_id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- STEP 5: Test from use_cryptoku_hint
-- =====================================================
SELECT 
  'use_cryptoku_hint test' as test_name,
  use_cryptoku_hint((SELECT id FROM profiles LIMIT 1)) as result;
