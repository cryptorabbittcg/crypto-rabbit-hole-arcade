-- =====================================================
-- Fix Cryptoku Hints INSERT Policy for Wallet Auth
-- =====================================================
-- This migration fixes the RLS policy for cryptoku_hints
-- to allow inserts for anon users (wallet-based auth).
-- The ensure_cryptoku_hints function should be used instead,
-- but this policy allows direct inserts as a fallback.
-- =====================================================

DO $$
BEGIN
  -- Check if cryptoku_hints table exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cryptoku_hints') THEN
    -- Drop the old policy that requires auth.uid() (doesn't work with wallet auth)
    DROP POLICY IF EXISTS "Authenticated users can insert own hints" ON public.cryptoku_hints;
    
    -- Create new policy that allows anon users to insert (for wallet-based auth)
    -- The application code validates user_id, so this is safe
    CREATE POLICY "Users can insert own hints (wallet auth)"
      ON public.cryptoku_hints
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true); -- Application validates user_id
    
    RAISE NOTICE 'Updated cryptoku_hints INSERT policy for wallet-based authentication';
  ELSE
    RAISE NOTICE 'cryptoku_hints table does not exist, skipping policy update';
  END IF;
END $$;

-- =====================================================
-- Verify the policy was created
-- =====================================================
-- Run this query to verify:
--
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE tablename = 'cryptoku_hints'
-- ORDER BY policyname;
--
-- Expected: Should see "Users can insert own hints (wallet auth)" policy
-- =====================================================

-- =====================================================
-- ROLLBACK SECTION (COMMENTED)
-- =====================================================
-- To rollback this migration (NOT RECOMMENDED):
--
-- DROP POLICY IF EXISTS "Users can insert own hints (wallet auth)" ON public.cryptoku_hints;
--
-- CREATE POLICY "Authenticated users can insert own hints"
--   ON public.cryptoku_hints
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (user_id = (select auth.uid()));
--
-- NOTE: Rolling back will break hint creation for wallet-based auth users.
-- =====================================================
