-- =====================================================
-- Fix Cryptoku Hints RLS Issues
-- =====================================================
-- This migration fixes:
-- 1. Missing UPDATE/INSERT policies on cryptoku_hints (prevents hint usage)
-- 2. Ensures use_cryptoku_hint function has SECURITY DEFINER
-- 3. Ensures ensure_cryptoku_hints function has SECURITY DEFINER
-- 4. Ensures reward_cryptoku_hint function has SECURITY DEFINER
-- =====================================================

-- =====================================================
-- 1. Fix cryptoku_hints RLS policies
-- =====================================================
-- The table has RLS enabled but only a SELECT policy.
-- The functions need to UPDATE and INSERT, so we need policies for those operations.
-- Since the functions validate user_id, we can allow authenticated users to modify their own hints.

DO $$
BEGIN
  -- Check if cryptoku_hints table exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cryptoku_hints') THEN
    -- Ensure RLS is enabled (should already be, but be safe)
    ALTER TABLE public.cryptoku_hints ENABLE ROW LEVEL SECURITY;
    
    -- Add INSERT policy for authenticated users (function will use this)
    DROP POLICY IF EXISTS "Authenticated users can insert own hints" ON public.cryptoku_hints;
    CREATE POLICY "Authenticated users can insert own hints"
      ON public.cryptoku_hints
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = (select auth.uid()));
    
    -- Add UPDATE policy for authenticated users (function will use this)
    DROP POLICY IF EXISTS "Authenticated users can update own hints" ON public.cryptoku_hints;
    CREATE POLICY "Authenticated users can update own hints"
      ON public.cryptoku_hints
      FOR UPDATE
      TO authenticated
      USING (user_id = (select auth.uid()))
      WITH CHECK (user_id = (select auth.uid()));
    
    -- Ensure SELECT policy exists (for public reads)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'cryptoku_hints'
      AND policyname = 'Cryptoku hints are viewable by everyone (TEMP)'
    ) THEN
      CREATE POLICY "Cryptoku hints are viewable by everyone (TEMP)"
        ON public.cryptoku_hints
        FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
  END IF;
END $$;

-- =====================================================
-- 2. Ensure use_cryptoku_hint has SECURITY DEFINER
-- =====================================================
-- This allows the function to bypass RLS when updating hints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'use_cryptoku_hint'
  ) THEN
    -- Set SECURITY DEFINER so function runs with creator's privileges
    ALTER FUNCTION public.use_cryptoku_hint(UUID) SECURITY DEFINER;
    
    -- Set search_path for security
    ALTER FUNCTION public.use_cryptoku_hint(UUID) SET search_path = 'pg_catalog, public';
  END IF;
END $$;

-- =====================================================
-- 3. Ensure ensure_cryptoku_hints has SECURITY DEFINER
-- =====================================================
-- This allows the function to bypass RLS when inserting hints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'ensure_cryptoku_hints'
  ) THEN
    -- Set SECURITY DEFINER so function runs with creator's privileges
    ALTER FUNCTION public.ensure_cryptoku_hints(UUID) SECURITY DEFINER;
    
    -- Set search_path for security
    ALTER FUNCTION public.ensure_cryptoku_hints(UUID) SET search_path = 'pg_catalog, public';
  END IF;
END $$;

-- =====================================================
-- 4. Ensure reward_cryptoku_hint has SECURITY DEFINER
-- =====================================================
-- This allows the function to bypass RLS when updating hints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'reward_cryptoku_hint'
  ) THEN
    -- Set SECURITY DEFINER so function runs with creator's privileges
    ALTER FUNCTION public.reward_cryptoku_hint(UUID) SECURITY DEFINER;
    
    -- Set search_path for security
    ALTER FUNCTION public.reward_cryptoku_hint(UUID) SET search_path = 'pg_catalog, public';
  END IF;
END $$;

-- =====================================================
-- 5. Ensure purchase_cryptoku_hints has SECURITY DEFINER
-- =====================================================
-- This allows the function to bypass RLS when updating hints
DO $$
DECLARE
  func_rec RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'purchase_cryptoku_hints'
  ) THEN
    FOR func_rec IN
      SELECT 'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as func_signature
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname = 'purchase_cryptoku_hints'
    LOOP
      BEGIN
        -- Set SECURITY DEFINER
        EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER', func_rec.func_signature);
        -- Set search_path
        EXECUTE format('ALTER FUNCTION %s SET search_path = ''pg_catalog, public''', func_rec.func_signature);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not configure function %: %', func_rec.func_signature, SQLERRM;
      END;
    END LOOP;
  END IF;
END $$;

-- =====================================================
-- ROLLBACK SECTION (COMMENTED)
-- =====================================================
-- To rollback this migration:
--
-- 1. Remove INSERT/UPDATE policies:
--    DROP POLICY IF EXISTS "Authenticated users can insert own hints" ON public.cryptoku_hints;
--    DROP POLICY IF EXISTS "Authenticated users can update own hints" ON public.cryptoku_hints;
--
-- 2. Reset function security (NOT RECOMMENDED):
--    ALTER FUNCTION public.use_cryptoku_hint(UUID) SECURITY INVOKER;
--    ALTER FUNCTION public.ensure_cryptoku_hints(UUID) SECURITY INVOKER;
--    ALTER FUNCTION public.reward_cryptoku_hint(UUID) SECURITY INVOKER;
--
-- NOTE: This migration fixes critical hint functionality.
--       Rolling back is NOT RECOMMENDED unless absolutely necessary.
-- =====================================================

