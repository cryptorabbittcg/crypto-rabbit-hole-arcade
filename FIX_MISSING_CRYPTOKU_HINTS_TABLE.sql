-- =====================================================
-- FIX: Create Missing cryptoku_hints Table
-- =====================================================
-- This table is missing from your database.
-- Run this script to create it.
-- =====================================================

-- =====================================================
-- CRYPTOKU HINTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cryptoku_hints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Hint balance and rewards
  hint_balance INTEGER DEFAULT 3 NOT NULL CHECK (hint_balance >= 0),
  total_ranked_completed INTEGER DEFAULT 0 NOT NULL CHECK (total_ranked_completed >= 0),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_cryptoku_hints_user ON cryptoku_hints(user_id);

-- Add comments
COMMENT ON TABLE cryptoku_hints IS 'Stores Cryptoku hint balances and reward tracking for each user';
COMMENT ON COLUMN cryptoku_hints.hint_balance IS 'Current hint balance (default: 3 free hints)';
COMMENT ON COLUMN cryptoku_hints.total_ranked_completed IS 'Total ranked games completed (for reward calculation: +1 hint every 10 games)';

-- Enable RLS
ALTER TABLE cryptoku_hints ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
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
-- TRIGGER FOR updated_at
-- =====================================================
-- Create trigger function if it doesn't exist
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

-- =====================================================
-- VERIFY TABLE WAS CREATED
-- =====================================================
SELECT 
  'Table created' as status,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'cryptoku_hints';

-- =====================================================
-- IMPORTANT: DO NOT TEST FUNCTIONS YET
-- =====================================================
-- The table is now created, but you need to verify it exists first
-- Run this query to verify:
-- SELECT COUNT(*) FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name = 'cryptoku_hints';
-- Should return: 1
--
-- Then you can test the function separately:
-- SELECT ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1));
