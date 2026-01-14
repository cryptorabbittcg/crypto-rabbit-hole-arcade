-- =====================================================
-- Fix Cryptoku Game Logging Issues
-- =====================================================
-- This migration fixes:
-- 1. Missing INSERT policy on cryptoku_leaderboard (prevents game completion logging)
-- 2. Ensures get_leaderboard function has correct search_path
-- 3. Verifies add_cryptoku_leaderboard_entry function has SECURITY DEFINER
-- =====================================================

-- =====================================================
-- 1. Fix cryptoku_leaderboard RLS policies
-- =====================================================
-- The table has RLS enabled but only a SELECT policy.
-- The add_cryptoku_leaderboard_entry function uses SECURITY DEFINER,
-- but RLS still applies to function calls unless the function is SECURITY DEFINER
-- AND the table allows the operation. We need to ensure the function can insert.

DO $$
BEGIN
  -- Check if cryptoku_leaderboard table exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cryptoku_leaderboard') THEN
    -- Ensure RLS is enabled (should already be, but be safe)
    ALTER TABLE public.cryptoku_leaderboard ENABLE ROW LEVEL SECURITY;
    
    -- Add INSERT policy for authenticated users (function will use this)
    -- Note: The function add_cryptoku_leaderboard_entry uses SECURITY DEFINER,
    -- but RLS policies still apply. We need a policy that allows inserts.
    -- Since the function validates user_id, we can allow authenticated inserts.
    DROP POLICY IF EXISTS "Authenticated users can insert leaderboard entries" ON public.cryptoku_leaderboard;
    CREATE POLICY "Authenticated users can insert leaderboard entries"
      ON public.cryptoku_leaderboard
      FOR INSERT
      TO authenticated
      WITH CHECK (true); -- Function validates ownership via user_id parameter
    
    -- Ensure SELECT policy exists (for public reads)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'cryptoku_leaderboard'
      AND policyname = 'Cryptoku leaderboard is viewable by everyone'
    ) THEN
      CREATE POLICY "Cryptoku leaderboard is viewable by everyone"
        ON public.cryptoku_leaderboard
        FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
  END IF;
END $$;

-- =====================================================
-- 2. Ensure add_cryptoku_leaderboard_entry has SECURITY DEFINER
-- =====================================================
-- This allows the function to bypass RLS when inserting
DO $$
DECLARE
  func_signature TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'add_cryptoku_leaderboard_entry'
  ) THEN
    -- Get the exact function signature
    FOR func_signature IN
      SELECT 'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname = 'add_cryptoku_leaderboard_entry'
    LOOP
      BEGIN
        -- Set SECURITY DEFINER so function runs with creator's privileges
        EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER', func_signature);
        
        -- Set search_path for security
        EXECUTE format('ALTER FUNCTION %s SET search_path = ''pg_catalog, public''', func_signature);
        
        RAISE NOTICE 'Configured function: %', func_signature;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not configure function %: %', func_signature, SQLERRM;
      END;
    END LOOP;
  ELSE
    RAISE NOTICE 'Function add_cryptoku_leaderboard_entry does not exist';
  END IF;
END $$;

-- =====================================================
-- 3. Ensure get_leaderboard function exists and has correct search_path
-- =====================================================
DO $$
BEGIN
  -- Check if function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_leaderboard'
  ) THEN
    -- Set search_path for all overloads
    FOR func_signature IN
      SELECT 'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname = 'get_leaderboard'
    LOOP
      BEGIN
        EXECUTE format('ALTER FUNCTION %s SET search_path = ''pg_catalog, public''', func_signature);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set search_path for function %: %', func_signature, SQLERRM;
      END;
    END LOOP;
  ELSE
    RAISE NOTICE 'Function get_leaderboard does not exist. Please run scripts/03-functions.sql';
  END IF;
END $$;

-- =====================================================
-- 4. Ensure get_cryptoku_leaderboard function has correct search_path
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_cryptoku_leaderboard'
  ) THEN
    FOR func_signature IN
      SELECT 'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname = 'get_cryptoku_leaderboard'
    LOOP
      BEGIN
        EXECUTE format('ALTER FUNCTION %s SET search_path = ''pg_catalog, public''', func_signature);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set search_path for function %: %', func_signature, SQLERRM;
      END;
    END LOOP;
  END IF;
END $$;

-- =====================================================
-- 5. Ensure update_user_balance function has SECURITY DEFINER
-- =====================================================
-- This function is called from the submit-result API to award points
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'update_user_balance'
  ) THEN
    FOR func_signature IN
      SELECT 'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname = 'update_user_balance'
    LOOP
      BEGIN
        -- Set SECURITY DEFINER
        EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER', func_signature);
        -- Set search_path
        EXECUTE format('ALTER FUNCTION %s SET search_path = ''pg_catalog, public''', func_signature);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not configure function %: %', func_signature, SQLERRM;
      END;
    END LOOP;
  END IF;
END $$;

-- =====================================================
-- ROLLBACK SECTION (COMMENTED)
-- =====================================================
-- To rollback this migration:
--
-- 1. Remove INSERT policy:
--    DROP POLICY IF EXISTS "Authenticated users can insert leaderboard entries" ON public.cryptoku_leaderboard;
--
-- 2. Reset function security (NOT RECOMMENDED):
--    ALTER FUNCTION public.add_cryptoku_leaderboard_entry(...) SECURITY INVOKER;
--    ALTER FUNCTION public.update_user_balance(...) SECURITY INVOKER;
--
-- NOTE: This migration fixes critical game logging functionality.
--       Rolling back is NOT RECOMMENDED unless absolutely necessary.
-- =====================================================

