-- =====================================================
-- STEP 2: CREATE RLS POLICIES
-- =====================================================
-- Run this AFTER the table is created
-- =====================================================

-- Allow public read access (for leaderboard/stats)
DROP POLICY IF EXISTS "Cryptoku hints are viewable by everyone (TEMP)" ON cryptoku_hints;
CREATE POLICY "Cryptoku hints are viewable by everyone (TEMP)"
  ON cryptoku_hints
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow wallet-based auth users to insert (for ensure_cryptoku_hints function)
DROP POLICY IF EXISTS "Users can insert own hints (wallet auth)" ON cryptoku_hints;
CREATE POLICY "Users can insert own hints (wallet auth)"
  ON cryptoku_hints
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true); -- Application validates user_id

-- Allow authenticated users to update (for functions)
DROP POLICY IF EXISTS "Authenticated users can update own hints" ON cryptoku_hints;
CREATE POLICY "Authenticated users can update own hints"
  ON cryptoku_hints
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- VERIFY POLICIES WERE CREATED
-- =====================================================
SELECT 
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'cryptoku_hints'
ORDER BY policyname;
