-- =====================================================
-- Fix update_user_balance Function Security
-- =====================================================
-- This migration ensures update_user_balance has:
-- 1. SECURITY DEFINER - runs with function owner's permissions
-- 2. search_path = 'pg_catalog, public' - can find public.profiles table
--
-- This fixes the error: "relation 'profiles' does not exist"
-- which occurs when the function runs with SECURITY INVOKER
-- and can't find tables in the public schema.
-- =====================================================

DO $$
DECLARE
  func_signature TEXT;
BEGIN
  -- Find all overloads of update_user_balance and fix security settings
  FOR func_signature IN
    SELECT 'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'update_user_balance'
  LOOP
    BEGIN
      -- Set SECURITY DEFINER (runs with function owner's permissions)
      EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER', func_signature);
      RAISE NOTICE 'Set SECURITY DEFINER for function: %', func_signature;
      
      -- Set search_path so function can find public schema tables
      EXECUTE format('ALTER FUNCTION %s SET search_path = ''pg_catalog, public''', func_signature);
      RAISE NOTICE 'Set search_path for function: %', func_signature;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not configure function %: %', func_signature, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- Verify the fix
-- =====================================================
-- Run this query to verify the function has the correct settings:
--
-- SELECT 
--   p.proname as function_name,
--   pg_get_function_identity_arguments(p.oid) as arguments,
--   CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security,
--   pg_get_functiondef(p.oid) LIKE '%search_path%' as has_search_path
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND p.proname = 'update_user_balance';
-- =====================================================

-- =====================================================
-- ROLLBACK SECTION (COMMENTED)
-- =====================================================
-- To rollback this migration (NOT RECOMMENDED):
--
-- DO $$
-- DECLARE
--   func_signature TEXT;
-- BEGIN
--   FOR func_signature IN
--     SELECT 'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
--     FROM pg_proc p
--     JOIN pg_namespace n ON p.pronamespace = n.oid
--     WHERE n.nspname = 'public'
--       AND p.proname = 'update_user_balance'
--   LOOP
--     EXECUTE format('ALTER FUNCTION %s SECURITY INVOKER', func_signature);
--     EXECUTE format('ALTER FUNCTION %s RESET search_path', func_signature);
--   END LOOP;
-- END $$;
--
-- NOTE: Rolling back is NOT RECOMMENDED as this will break the function
--       and cause "relation 'profiles' does not exist" errors.
-- =====================================================
