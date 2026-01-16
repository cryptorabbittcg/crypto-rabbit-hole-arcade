-- =====================================================
-- VERIFY cryptoku_hints TABLE AND COMPLETE SETUP
-- =====================================================
-- Run this after creating the table
-- =====================================================

-- =====================================================
-- STEP 1: Verify Table Structure
-- =====================================================
SELECT '=== TABLE STRUCTURE ===' as check_type;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'cryptoku_hints'
ORDER BY ordinal_position;

-- =====================================================
-- STEP 2: Add RLS Policies (if not already added)
-- =====================================================
SELECT '=== CREATING RLS POLICIES ===' as check_type;

-- Allow public read access
DROP POLICY IF EXISTS "Cryptoku hints are viewable by everyone (TEMP)" ON cryptoku_hints;
CREATE POLICY "Cryptoku hints are viewable by everyone (TEMP)"
  ON cryptoku_hints
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow wallet-based auth users to insert
DROP POLICY IF EXISTS "Users can insert own hints (wallet auth)" ON cryptoku_hints;
CREATE POLICY "Users can insert own hints (wallet auth)"
  ON cryptoku_hints
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow authenticated users to update
DROP POLICY IF EXISTS "Authenticated users can update own hints" ON cryptoku_hints;
CREATE POLICY "Authenticated users can update own hints"
  ON cryptoku_hints
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Verify policies
SELECT 
  'Policies created' as status,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'cryptoku_hints';

-- =====================================================
-- STEP 3: Create Trigger (if not already exists)
-- =====================================================
SELECT '=== CREATING TRIGGER ===' as check_type;

-- Create trigger function
CREATE OR REPLACE FUNCTION update_cryptoku_hints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_cryptoku_hints_updated_at ON cryptoku_hints;
CREATE TRIGGER update_cryptoku_hints_updated_at
  BEFORE UPDATE ON cryptoku_hints
  FOR EACH ROW
  EXECUTE FUNCTION update_cryptoku_hints_updated_at();

-- Verify trigger
SELECT 
  'Trigger created' as status,
  COUNT(*) as trigger_count
FROM pg_trigger
WHERE tgrelid = 'cryptoku_hints'::regclass
  AND tgisinternal = false;

-- =====================================================
-- STEP 4: Test ensure_cryptoku_hints Function
-- =====================================================
SELECT '=== TESTING FUNCTION ===' as check_type;

-- Test the function
SELECT 
  'Testing ensure_cryptoku_hints' as test_name,
  ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1)) as result;

-- Verify record was created
SELECT 
  'Verification' as check_name,
  COUNT(*) as hints_records,
  MAX(hint_balance) as max_balance,
  MAX(total_ranked_completed) as max_completed
FROM cryptoku_hints
WHERE user_id = (SELECT id FROM profiles LIMIT 1);

-- =====================================================
-- STEP 5: Test Other Functions
-- =====================================================
SELECT '=== TESTING OTHER FUNCTIONS ===' as check_type;

-- Test use_cryptoku_hint (should work if hints exist)
SELECT 
  'Testing use_cryptoku_hint' as test_name,
  use_cryptoku_hint((SELECT id FROM profiles LIMIT 1)) as result;

-- Test reward_cryptoku_hint
SELECT 
  'Testing reward_cryptoku_hint' as test_name,
  reward_cryptoku_hint((SELECT id FROM profiles LIMIT 1)) as result;

-- =====================================================
-- STEP 6: Final Verification
-- =====================================================
SELECT '=== FINAL VERIFICATION ===' as check_type;

SELECT 
  'Table exists' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'cryptoku_hints'
    ) THEN '✅ YES'
    ELSE '❌ NO'
  END as status

UNION ALL

SELECT 
  'Policies exist',
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'cryptoku_hints') >= 3 
    THEN '✅ YES'
    ELSE '❌ NO'
  END

UNION ALL

SELECT 
  'Trigger exists',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgrelid = 'cryptoku_hints'::regclass AND tgisinternal = false
    ) THEN '✅ YES'
    ELSE '❌ NO'
  END

UNION ALL

SELECT 
  'Function works',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM cryptoku_hints 
      WHERE user_id = (SELECT id FROM profiles LIMIT 1)
    ) THEN '✅ YES'
    ELSE '❌ NO'
  END;
