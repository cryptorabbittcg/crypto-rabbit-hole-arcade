-- =====================================================
-- CREATE CRYPTOKU LEADERBOARD TABLE
-- =====================================================
-- This creates the missing cryptoku_leaderboard table
-- Based on migration: 20260116094000_create_cryptoku_leaderboard_table.sql
-- =====================================================

-- =====================================================
-- CRYPTOKU LEADERBOARD TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cryptoku_leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id TEXT UNIQUE NOT NULL, -- Original run ID from game
  
  -- User reference
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Game details
  mode TEXT NOT NULL CHECK (mode IN ('NOOB', 'DEGEN', 'APE')),
  score INTEGER NOT NULL CHECK (score >= 0),
  time_seconds INTEGER NOT NULL CHECK (time_seconds >= 0),
  hints_used INTEGER NOT NULL CHECK (hints_used >= 0),
  errors INTEGER NOT NULL CHECK (errors >= 0),
  
  -- Completion status
  completed BOOLEAN DEFAULT TRUE NOT NULL,
  forfeited BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cryptoku_leaderboard_mode_score ON cryptoku_leaderboard(mode, score DESC, time_seconds ASC) 
  WHERE completed = TRUE AND forfeited = FALSE AND mode IN ('DEGEN', 'APE');
CREATE INDEX IF NOT EXISTS idx_cryptoku_leaderboard_user ON cryptoku_leaderboard(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cryptoku_leaderboard_run_id ON cryptoku_leaderboard(run_id);
CREATE INDEX IF NOT EXISTS idx_cryptoku_leaderboard_created ON cryptoku_leaderboard(created_at DESC);

-- Comments
COMMENT ON TABLE cryptoku_leaderboard IS 'Stores Cryptoku leaderboard runs (ranked games only: DEGEN and APE)';
COMMENT ON COLUMN cryptoku_leaderboard.run_id IS 'Unique run ID from the game client';
COMMENT ON COLUMN cryptoku_leaderboard.mode IS 'Game mode: DEGEN, APE, or NOOB (NOOB runs are stored but not ranked)';
COMMENT ON COLUMN cryptoku_leaderboard.score IS 'Final score for the run';
COMMENT ON COLUMN cryptoku_leaderboard.time_seconds IS 'Time taken in seconds';
COMMENT ON COLUMN cryptoku_leaderboard.completed IS 'Whether the run was completed';
COMMENT ON COLUMN cryptoku_leaderboard.forfeited IS 'Whether the run was forfeited';

-- =====================================================
-- UPDATE TRIGGER
-- =====================================================
DROP TRIGGER IF EXISTS update_cryptoku_leaderboard_updated_at ON cryptoku_leaderboard;
CREATE TRIGGER update_cryptoku_leaderboard_updated_at
  BEFORE UPDATE ON cryptoku_leaderboard
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE cryptoku_leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view leaderboard entries
DROP POLICY IF EXISTS "Cryptoku leaderboard is viewable by everyone" ON cryptoku_leaderboard;
CREATE POLICY "Cryptoku leaderboard is viewable by everyone"
  ON cryptoku_leaderboard FOR SELECT
  USING (true);

-- Allow authenticated users to insert (via function with SECURITY DEFINER)
DROP POLICY IF EXISTS "Authenticated users can insert leaderboard entries" ON cryptoku_leaderboard;
CREATE POLICY "Authenticated users can insert leaderboard entries"
  ON cryptoku_leaderboard FOR INSERT
  WITH CHECK (true);

-- Allow functions to insert (for add_cryptoku_leaderboard_entry)
DROP POLICY IF EXISTS "Functions can insert leaderboard entries" ON cryptoku_leaderboard;
CREATE POLICY "Functions can insert leaderboard entries"
  ON cryptoku_leaderboard FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- VERIFY TABLE CREATION
-- =====================================================
SELECT 
  'Table created' as check_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cryptoku_leaderboard';
