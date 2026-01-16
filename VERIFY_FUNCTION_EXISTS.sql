-- =====================================================
-- VERIFY FUNCTION EXISTS
-- =====================================================
-- Run this to check if the function exists
-- =====================================================

-- Check if function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'ensure_cryptoku_hints'
    ) THEN '✅ FUNCTION EXISTS'
    ELSE '❌ FUNCTION DOES NOT EXIST'
  END as status;

-- Show function details if it exists
SELECT 
  p.proname,
  pg_get_function_identity_arguments(p.oid) as signature,
  pg_get_function_result(p.oid) as return_type,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'ensure_cryptoku_hints';
