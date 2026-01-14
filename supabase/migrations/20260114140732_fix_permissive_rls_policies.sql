-- =====================================================
-- FIX PERMISSIVE RLS POLICIES (rls_policy_always_true)
-- =====================================================
-- This migration fixes Supabase linter warnings for permissive RLS policies
-- that use USING (true) or WITH CHECK (true) for INSERT, UPDATE, DELETE operations.
--
-- Tables affected:
-- - public.profiles (INSERT + UPDATE)
-- - public.ape_in_daily_free_plays (INSERT)
-- - public.ape_in_game_states (INSERT + UPDATE + DELETE)
--
-- IMPORTANT NOTE:
-- This migration assumes profiles.id = auth.uid() (Supabase Auth integration).
-- If your app uses wallet-based authentication instead of Supabase Auth:
-- - auth.uid() will be NULL and these policies will block writes
-- - You may need to use service role (admin client) for writes instead
-- - Or modify policies to use wallet-based authentication patterns
-- =====================================================

-- =====================================================
-- PART 1: INSPECTION QUERIES
-- =====================================================
-- Run these queries first to verify table structure and current policies

-- Inspect current policies for affected tables
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check,
  roles,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'ape_in_daily_free_plays', 'ape_in_game_states')
ORDER BY tablename, policyname;

-- Inspect column structure for ape_in_game_states
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ape_in_game_states'
ORDER BY ordinal_position;

-- Inspect column structure for ape_in_daily_free_plays
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ape_in_daily_free_plays'
ORDER BY ordinal_position;

-- =====================================================
-- PART 2: FIX PERMISSIVE POLICIES
-- =====================================================

DO $$
BEGIN
  -- =====================================================
  -- FIX PROFILES TABLE
  -- =====================================================
  -- Assumption: profiles.id = auth.uid()
  -- Restrict INSERT and UPDATE to authenticated users only
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    -- Ensure RLS is enabled
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    
    -- Drop permissive INSERT policy
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    
    -- Create restricted INSERT policy: only authenticated users can insert, and id must match auth.uid()
    CREATE POLICY "Users can insert their own profile"
      ON public.profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (id = (select auth.uid()));
    
    -- Drop permissive UPDATE policy
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    
    -- Create restricted UPDATE policy: only authenticated users can update their own profile
    CREATE POLICY "Users can update own profile"
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (id = (select auth.uid()))
      WITH CHECK (id = (select auth.uid()));
  END IF;

  -- =====================================================
  -- FIX APE_IN_DAILY_FREE_PLAYS TABLE
  -- =====================================================
  -- This table has user_id UUID REFERENCES profiles(id)
  -- Assumption: profiles.id = auth.uid(), so user_id = auth.uid()
  -- Restrict INSERT to authenticated users only, and user_id must match auth.uid()
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ape_in_daily_free_plays') THEN
    -- Ensure RLS is enabled
    ALTER TABLE public.ape_in_daily_free_plays ENABLE ROW LEVEL SECURITY;
    
    -- Drop permissive INSERT policy
    DROP POLICY IF EXISTS "Ape In daily free plays are writable by everyone (TEMP)" ON public.ape_in_daily_free_plays;
    
    -- Drop existing policy if it exists (in case it was created previously)
    DROP POLICY IF EXISTS "Users can insert own daily free plays" ON public.ape_in_daily_free_plays;
    
    -- Create restricted INSERT policy: only authenticated users can insert, and user_id must match auth.uid()
    CREATE POLICY "Users can insert own daily free plays"
      ON public.ape_in_daily_free_plays
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = (select auth.uid()));
  END IF;

  -- =====================================================
  -- FIX APE_IN_GAME_STATES TABLE
  -- =====================================================
  -- WARNING: This table has NO user_id or profile_id column!
  -- It only has: game_id (TEXT), game_state (JSONB), timestamps
  -- 
  -- Since there's no ownership column, we cannot restrict by user ownership.
  -- Options:
  -- 1. Restrict to authenticated users only (still permissive but better than anon)
  -- 2. Lock down completely and require service role (breaks current client-side writes)
  --
  -- For now, we'll restrict to authenticated users only.
  -- TODO: Consider adding a user_id column or moving writes to server routes with service role.
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ape_in_game_states') THEN
    -- Ensure RLS is enabled
    ALTER TABLE public.ape_in_game_states ENABLE ROW LEVEL SECURITY;
    
    -- Drop all existing policies (both old permissive and new restricted ones)
    DROP POLICY IF EXISTS "Anyone can insert game states" ON public.ape_in_game_states;
    DROP POLICY IF EXISTS "Authenticated users can insert game states" ON public.ape_in_game_states;
    DROP POLICY IF EXISTS "Anyone can update game states" ON public.ape_in_game_states;
    DROP POLICY IF EXISTS "Authenticated users can update game states" ON public.ape_in_game_states;
    DROP POLICY IF EXISTS "Anyone can delete game states" ON public.ape_in_game_states;
    DROP POLICY IF EXISTS "Authenticated users can delete game states" ON public.ape_in_game_states;
    
    -- Create restricted INSERT policy: only authenticated users can insert
    -- NOTE: This is still permissive (no ownership check) because there's no user_id column
    CREATE POLICY "Authenticated users can insert game states"
      ON public.ape_in_game_states
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
    
    -- Create restricted UPDATE policy: only authenticated users can update
    -- NOTE: This is still permissive (no ownership check) because there's no user_id column
    CREATE POLICY "Authenticated users can update game states"
      ON public.ape_in_game_states
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
    
    -- Create restricted DELETE policy: only authenticated users can delete
    -- NOTE: This is still permissive (no ownership check) because there's no user_id column
    CREATE POLICY "Authenticated users can delete game states"
      ON public.ape_in_game_states
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- =====================================================
-- ROLLBACK SECTION (COMMENTED)
-- =====================================================
-- To rollback this migration, you would need to:
--
-- 1. Re-run the permissive policies from the previous migration:
--    (See supabase/migrations/20260114131605_phase3_security.sql)
--
-- NOTE: Rolling back these security fixes is NOT RECOMMENDED as it will reintroduce
--       security vulnerabilities. Only rollback if absolutely necessary for troubleshooting.
-- =====================================================

