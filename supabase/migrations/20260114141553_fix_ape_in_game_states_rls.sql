-- =====================================================
-- FIX APE_IN_GAME_STATES RLS POLICIES
-- =====================================================
-- This migration fixes the remaining 3 permissive RLS policy warnings
-- for table public.ape_in_game_states by adding an ownership column
-- and creating owner-scoped policies.
-- =====================================================

-- =====================================================
-- PART 1: INSPECTION QUERIES
-- =====================================================
-- Run these queries first to verify table structure and current policies

-- Inspect table schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ape_in_game_states'
ORDER BY ordinal_position;

-- Inspect current RLS policies
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
  AND tablename = 'ape_in_game_states'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'ape_in_game_states';

-- =====================================================
-- PART 2: ADD OWNERSHIP COLUMN AND FIX POLICIES
-- =====================================================

DO $$
BEGIN
  -- Check if table exists
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ape_in_game_states') THEN
    RAISE EXCEPTION 'Table public.ape_in_game_states does not exist';
  END IF;

  -- =====================================================
  -- STEP 1: ADD user_id COLUMN (if it doesn't exist)
  -- =====================================================
  -- This is the smallest additive change to enable owner-scoped RLS
  -- The column is nullable initially to handle existing rows
  -- New rows should set user_id when inserting
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'ape_in_game_states' 
      AND column_name = 'user_id'
  ) THEN
    -- Add user_id column (nullable initially for existing rows)
    ALTER TABLE public.ape_in_game_states
      ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    
    -- Add index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_ape_in_game_states_user_id 
      ON public.ape_in_game_states(user_id);
    
    -- Add comment
    COMMENT ON COLUMN public.ape_in_game_states.user_id IS 
      'Owner of the game state (references profiles.id). Required for RLS policies.';
    
    RAISE NOTICE 'Added user_id column to ape_in_game_states table';
  ELSE
    RAISE NOTICE 'user_id column already exists in ape_in_game_states table';
  END IF;

  -- =====================================================
  -- STEP 2: DROP PERMISSIVE POLICIES
  -- =====================================================
  
  DROP POLICY IF EXISTS "Authenticated users can insert game states" ON public.ape_in_game_states;
  DROP POLICY IF EXISTS "Authenticated users can update game states" ON public.ape_in_game_states;
  DROP POLICY IF EXISTS "Authenticated users can delete game states" ON public.ape_in_game_states;
  DROP POLICY IF EXISTS "Anyone can insert game states" ON public.ape_in_game_states;
  DROP POLICY IF EXISTS "Anyone can update game states" ON public.ape_in_game_states;
  DROP POLICY IF EXISTS "Anyone can delete game states" ON public.ape_in_game_states;

  -- =====================================================
  -- STEP 3: CREATE OWNER-SCOPED POLICIES
  -- =====================================================
  -- Assumption: profiles.id = auth.uid()
  -- Policies restrict INSERT/UPDATE/DELETE to rows where user_id = auth.uid()
  
  -- INSERT: Users can only insert game states with their own user_id
  CREATE POLICY "Users can insert own game states"
    ON public.ape_in_game_states
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (select auth.uid()));
  
  -- UPDATE: Users can only update their own game states
  CREATE POLICY "Users can update own game states"
    ON public.ape_in_game_states
    FOR UPDATE
    TO authenticated
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));
  
  -- DELETE: Users can only delete their own game states
  CREATE POLICY "Users can delete own game states"
    ON public.ape_in_game_states
    FOR DELETE
    TO authenticated
    USING (user_id = (select auth.uid()));
  
  -- Note: SELECT policy remains unchanged (public read from previous migration)
  -- If SELECT needs to be restricted, add:
  -- CREATE POLICY "Users can view own game states"
  --   ON public.ape_in_game_states
  --   FOR SELECT
  --   TO authenticated
  --   USING (user_id = (select auth.uid()));
  
  RAISE NOTICE 'Created owner-scoped RLS policies for ape_in_game_states';
END $$;

-- =====================================================
-- NOTES
-- =====================================================
-- Ownership Column: user_id UUID REFERENCES profiles(id)
-- 
-- Why this column:
-- - The table previously had no ownership column (only game_id, game_state JSONB, timestamps)
-- - This is the smallest additive change to enable proper RLS
-- - Follows the same pattern as other tables (user_id references profiles.id)
-- - Assumes profiles.id = auth.uid() for RLS to work correctly
--
-- Important:
-- - The column is nullable initially to handle existing rows
-- - Existing rows with NULL user_id will NOT be accessible via RLS (this is expected for temporary game states)
-- - New inserts MUST set user_id = auth.uid() for the policies to work
-- - If your app uses wallet-based auth instead of Supabase Auth, you may need to adjust the policies
--
-- Migration Impact:
-- - Adds user_id column (nullable, with index)
-- - Replaces permissive policies with owner-scoped policies
-- - Existing rows with NULL user_id will be inaccessible (acceptable for temporary game states)
-- - App code should be updated to set user_id when inserting/updating game states
-- =====================================================

-- =====================================================
-- ROLLBACK SECTION (COMMENTED)
-- =====================================================
-- To rollback this migration:
--
-- 1. Drop the new policies:
--    DROP POLICY IF EXISTS "Users can insert own game states" ON public.ape_in_game_states;
--    DROP POLICY IF EXISTS "Users can update own game states" ON public.ape_in_game_states;
--    DROP POLICY IF EXISTS "Users can delete own game states" ON public.ape_in_game_states;
--
-- 2. Recreate permissive policies (if needed):
--    CREATE POLICY "Authenticated users can insert game states"
--      ON public.ape_in_game_states FOR INSERT TO authenticated WITH CHECK (true);
--    (similar for UPDATE and DELETE)
--
-- 3. Optionally remove the user_id column:
--    DROP INDEX IF EXISTS idx_ape_in_game_states_user_id;
--    ALTER TABLE public.ape_in_game_states DROP COLUMN IF EXISTS user_id;
--
-- NOTE: Rolling back will reintroduce security warnings. Only rollback if necessary.
-- =====================================================

