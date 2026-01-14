-- =====================================================
-- FIX APE_IN_GAME_STATES PERMISSIVE RLS POLICIES
-- =====================================================
-- This migration fixes the last 3 linter warnings for permissive RLS policies
-- on public.ape_in_game_states.
--
-- Strategy:
-- - If an owner column exists (user_id/profile_id/created_by/etc), use Option A: owner-scoped policies
-- - If NO owner column exists, use Option B: remove authenticated write policies (server-only writes)
-- =====================================================

DO $$
DECLARE
  has_user_id BOOLEAN := false;
  has_profile_id BOOLEAN := false;
  has_created_by BOOLEAN := false;
  has_owner_id BOOLEAN := false;
  has_wallet_address BOOLEAN := false;
  owner_column TEXT := NULL;
BEGIN
  -- Check for common owner column names
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'ape_in_game_states' 
      AND column_name = 'user_id'
  ) INTO has_user_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'ape_in_game_states' 
      AND column_name = 'profile_id'
  ) INTO has_profile_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'ape_in_game_states' 
      AND column_name = 'created_by'
  ) INTO has_created_by;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'ape_in_game_states' 
      AND column_name = 'owner_id'
  ) INTO has_owner_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'ape_in_game_states' 
      AND column_name = 'wallet_address'
  ) INTO has_wallet_address;

  -- Determine owner column (prefer user_id, then profile_id, etc.)
  IF has_user_id THEN
    owner_column := 'user_id';
  ELSIF has_profile_id THEN
    owner_column := 'profile_id';
  ELSIF has_created_by THEN
    owner_column := 'created_by';
  ELSIF has_owner_id THEN
    owner_column := 'owner_id';
  ELSIF has_wallet_address THEN
    owner_column := 'wallet_address';
  END IF;

  -- Drop the 3 permissive policies
  DROP POLICY IF EXISTS "Authenticated users can insert game states" ON public.ape_in_game_states;
  DROP POLICY IF EXISTS "Authenticated users can update game states" ON public.ape_in_game_states;
  DROP POLICY IF EXISTS "Authenticated users can delete game states" ON public.ape_in_game_states;

  -- Drop owner-scoped policies if they exist (from previous migration attempts)
  DROP POLICY IF EXISTS "Users can insert own game states" ON public.ape_in_game_states;
  DROP POLICY IF EXISTS "Users can update own game states" ON public.ape_in_game_states;
  DROP POLICY IF EXISTS "Users can delete own game states" ON public.ape_in_game_states;

  -- OPTION A: Owner column exists - create owner-scoped policies
  IF owner_column IS NOT NULL THEN
    IF owner_column IN ('user_id', 'profile_id', 'created_by', 'owner_id') THEN
      -- UUID column - compare to auth.uid()
      EXECUTE format('
        CREATE POLICY "Users can insert own game states"
          ON public.ape_in_game_states
          FOR INSERT
          TO authenticated
          WITH CHECK (%I = (select auth.uid()));
      ', owner_column);
      
      EXECUTE format('
        CREATE POLICY "Users can update own game states"
          ON public.ape_in_game_states
          FOR UPDATE
          TO authenticated
          USING (%I = (select auth.uid()))
          WITH CHECK (%I = (select auth.uid()));
      ', owner_column, owner_column);
      
      EXECUTE format('
        CREATE POLICY "Users can delete own game states"
          ON public.ape_in_game_states
          FOR DELETE
          TO authenticated
          USING (%I = (select auth.uid()));
      ', owner_column);
      
      RAISE NOTICE 'Created owner-scoped policies using column: %', owner_column;
    ELSIF owner_column = 'wallet_address' THEN
      -- TEXT column - would need JWT claim or profile lookup
      -- For now, we'll use Option B (server-only) since wallet_address can't be compared to auth.uid()
      RAISE NOTICE 'wallet_address column found but cannot be used with auth.uid(). Using Option B (server-only writes).';
      -- Fall through to Option B
    END IF;
  END IF;

  -- OPTION B: No owner column OR wallet_address (can't use with auth.uid())
  -- Remove authenticated write policies - writes must go through server (service role)
  IF owner_column IS NULL OR owner_column = 'wallet_address' THEN
    -- No policies created = authenticated users cannot INSERT/UPDATE/DELETE
    -- SELECT policy remains unchanged (if it exists)
    RAISE NOTICE 'No suitable owner column found. Write operations are now server-only (no authenticated policies).';
  END IF;
END $$;
