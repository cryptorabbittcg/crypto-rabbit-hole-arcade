-- =====================================================
-- PHASE 3 SECURITY FIXES
-- =====================================================
-- This migration fixes Supabase Security Advisor errors:
-- 1. Enables RLS on public tables
-- 2. Adds minimal policies to preserve current behavior
-- 3. Fixes "role mutable search_path" warnings for functions
-- =====================================================

-- =====================================================
-- PART 1: ENABLE RLS ON TABLES
-- =====================================================

-- Enable RLS on all specified tables
-- Using IF NOT EXISTS pattern where possible, but ALTER TABLE doesn't support it
-- These are idempotent operations (safe to re-run)

DO $$
BEGIN
  -- Check and enable RLS if not already enabled
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ape_in_game_states') THEN
    ALTER TABLE public.ape_in_game_states ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cryptoku_leaderboard') THEN
    ALTER TABLE public.cryptoku_leaderboard ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ape_in_daily_free_plays') THEN
    ALTER TABLE public.ape_in_daily_free_plays ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cryptoku_hints') THEN
    ALTER TABLE public.cryptoku_hints ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'social_raids') THEN
    ALTER TABLE public.social_raids ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =====================================================
-- PART 2: CREATE MINIMAL POLICIES
-- =====================================================

-- Leaderboard policies (public read for leaderboards)
-- Cryptoku leaderboard: public read
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cryptoku_leaderboard') THEN
    DROP POLICY IF EXISTS "Cryptoku leaderboard is viewable by everyone" ON public.cryptoku_leaderboard;
    CREATE POLICY "Cryptoku leaderboard is viewable by everyone"
      ON public.cryptoku_leaderboard
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Social raids: public read (preserve existing behavior)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'social_raids') THEN
    -- Drop existing policy if it exists and recreate to ensure consistency
    DROP POLICY IF EXISTS "Active raids are viewable by everyone" ON public.social_raids;
    CREATE POLICY "Active raids are viewable by everyone"
      ON public.social_raids
      FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;

-- Profiles: TEMP public read (preserve current behavior, TODO: restrict later)
-- TODO: This is a TEMPORARY permissive policy. Later, we should:
--       1. Remove public read access
--       2. Only allow reads through server-side routes using service role
--       3. Or create a restricted view for public profile data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
    DROP POLICY IF EXISTS "Profiles are viewable by everyone (TEMP)" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    
    -- TEMP: Allow public read (anon key access from browser)
    CREATE POLICY "Profiles are viewable by everyone (TEMP)"
      ON public.profiles
      FOR SELECT
      TO anon, authenticated
      USING (true);
    
    -- Allow users to insert their own profile (if needed)
    CREATE POLICY "Users can insert their own profile"
      ON public.profiles
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
    
    -- Allow users to update their own profile (if needed)
    -- NOTE: This is permissive - in production, you'd want to validate wallet ownership
    CREATE POLICY "Users can update own profile"
      ON public.profiles
      FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Cryptoku hints: TEMP public read (preserve current behavior)
-- TODO: This should be restricted later - hints should only be accessible by owner
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cryptoku_hints') THEN
    DROP POLICY IF EXISTS "Cryptoku hints are viewable by everyone (TEMP)" ON public.cryptoku_hints;
    CREATE POLICY "Cryptoku hints are viewable by everyone (TEMP)"
      ON public.cryptoku_hints
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Ape In game states: public read/write (game states are public by design)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ape_in_game_states') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Anyone can view game states" ON public.ape_in_game_states;
    DROP POLICY IF EXISTS "Anyone can insert game states" ON public.ape_in_game_states;
    DROP POLICY IF EXISTS "Anyone can update game states" ON public.ape_in_game_states;
    DROP POLICY IF EXISTS "Anyone can delete game states" ON public.ape_in_game_states;
    
    CREATE POLICY "Anyone can view game states"
      ON public.ape_in_game_states
      FOR SELECT
      TO anon, authenticated
      USING (true);
    
    CREATE POLICY "Anyone can insert game states"
      ON public.ape_in_game_states
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
    
    CREATE POLICY "Anyone can update game states"
      ON public.ape_in_game_states
      FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
    
    CREATE POLICY "Anyone can delete game states"
      ON public.ape_in_game_states
      FOR DELETE
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Ape In daily free plays: TEMP public read/write (preserve current behavior)
-- TODO: Restrict to owner-only access later
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ape_in_daily_free_plays') THEN
    DROP POLICY IF EXISTS "Ape In daily free plays are viewable by everyone (TEMP)" ON public.ape_in_daily_free_plays;
    DROP POLICY IF EXISTS "Ape In daily free plays are writable by everyone (TEMP)" ON public.ape_in_daily_free_plays;
    
    CREATE POLICY "Ape In daily free plays are viewable by everyone (TEMP)"
      ON public.ape_in_daily_free_plays
      FOR SELECT
      TO anon, authenticated
      USING (true);
    
    CREATE POLICY "Ape In daily free plays are writable by everyone (TEMP)"
      ON public.ape_in_daily_free_plays
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- PART 3: FIX ROLE MUTABLE SEARCH_PATH FOR FUNCTIONS
-- =====================================================

-- Fix search_path for all functions to prevent security issues
-- Using dynamic signature detection to handle all function overloads correctly

DO $$
DECLARE
  func_signature TEXT;
  func_names TEXT[] := ARRAY[
    'ensure_cryptoku_hints',
    'use_cryptoku_hint',
    'reward_cryptoku_hint',
    'get_top_game_scores',
    'purchase_cryptoku_hints',
    'update_cryptoku_hints_updated_at',
    'get_or_create_profile',
    'cleanup_expired_ape_in_games',
    'add_cryptoku_leaderboard_entry',
    'get_cryptoku_leaderboard',
    'update_user_balance',
    'record_game_session',
    'purchase_upgrade',
    'get_leaderboard',
    'find_pvp_opponent',
    'get_ape_in_leaderboard',
    'update_updated_at_column',
    'add_card_to_inventory'
  ];
  func_name TEXT;
BEGIN
  -- Loop through each function name and fix search_path for all overloads
  FOREACH func_name IN ARRAY func_names
  LOOP
    -- Find all overloads of this function and fix search_path for each
    FOR func_signature IN
      SELECT 'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = func_name
    LOOP
      BEGIN
        EXECUTE format('ALTER FUNCTION %s SET search_path = ''pg_catalog, public''', func_signature);
      EXCEPTION WHEN OTHERS THEN
        -- Log but don't fail on errors (function might not exist or already have search_path set)
        RAISE NOTICE 'Could not set search_path for function %: %', func_signature, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- ROLLBACK SECTION (COMMENTED)
-- =====================================================
-- To rollback this migration, you would need to:
--
-- 1. Disable RLS on tables (NOT RECOMMENDED - this is a security risk):
--    ALTER TABLE public.ape_in_game_states DISABLE ROW LEVEL SECURITY;
--    ALTER TABLE public.cryptoku_leaderboard DISABLE ROW LEVEL SECURITY;
--    ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
--    ALTER TABLE public.ape_in_daily_free_plays DISABLE ROW LEVEL SECURITY;
--    ALTER TABLE public.cryptoku_hints DISABLE ROW LEVEL SECURITY;
--    ALTER TABLE public.social_raids DISABLE ROW LEVEL SECURITY;
--
-- 2. Drop policies:
--    DROP POLICY IF EXISTS "Cryptoku leaderboard is viewable by everyone" ON public.cryptoku_leaderboard;
--    DROP POLICY IF EXISTS "Active raids are viewable by everyone" ON public.social_raids;
--    DROP POLICY IF EXISTS "Profiles are viewable by everyone (TEMP)" ON public.profiles;
--    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
--    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
--    DROP POLICY IF EXISTS "Cryptoku hints are viewable by everyone (TEMP)" ON public.cryptoku_hints;
--    DROP POLICY IF EXISTS "Anyone can view game states" ON public.ape_in_game_states;
--    DROP POLICY IF EXISTS "Anyone can insert game states" ON public.ape_in_game_states;
--    DROP POLICY IF EXISTS "Anyone can update game states" ON public.ape_in_game_states;
--    DROP POLICY IF EXISTS "Anyone can delete game states" ON public.ape_in_game_states;
--    DROP POLICY IF EXISTS "Ape In daily free plays are viewable by everyone (TEMP)" ON public.ape_in_daily_free_plays;
--    DROP POLICY IF EXISTS "Ape In daily free plays are writable by everyone (TEMP)" ON public.ape_in_daily_free_plays;
--
-- 3. Reset function search_path (NOT RECOMMENDED - reintroduces security vulnerability):
--    ALTER FUNCTION public.ensure_cryptoku_hints(...) RESET search_path;
--    (repeat for all functions)
--
-- NOTE: Rolling back RLS and search_path fixes is NOT RECOMMENDED as these are security improvements.
--       If rollback is needed, it should be done carefully and only for troubleshooting.
-- =====================================================

