-- =====================================================
-- Create cryptoku_hints Table
-- =====================================================
-- This migration creates the cryptoku_hints table that was missing.
-- The table stores hint balances and reward tracking for Cryptoku game.
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
-- CRYPTOKU HINTS FUNCTIONS
-- =====================================================
-- Ensure the functions exist (they may have been created via scripts)

-- Helper function: Ensure hints record exists (creates if doesn't exist)
CREATE OR REPLACE FUNCTION ensure_cryptoku_hints(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
BEGIN
  -- Try to insert, ignore if already exists
  INSERT INTO cryptoku_hints (user_id, hint_balance, total_ranked_completed)
  VALUES (p_user_id, 3, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Function: Use a hint (atomic operation with row locking)
CREATE OR REPLACE FUNCTION use_cryptoku_hint(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_total_completed INTEGER;
  v_games_until_next INTEGER;
BEGIN
  -- Ensure record exists (create if doesn't)
  PERFORM ensure_cryptoku_hints(p_user_id);
  
  -- Get current balance with row lock (prevents race conditions)
  SELECT hint_balance, total_ranked_completed
  INTO v_current_balance, v_total_completed
  FROM cryptoku_hints
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Check if has hints
  IF v_current_balance IS NULL OR v_current_balance <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No hints remaining',
      'hintBalance', COALESCE(v_current_balance, 0)
    );
  END IF;
  
  -- Decrement hint balance atomically
  UPDATE cryptoku_hints
  SET 
    hint_balance = hint_balance - 1,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND hint_balance > 0
  RETURNING hint_balance, total_ranked_completed
  INTO v_new_balance, v_total_completed;
  
  -- Verify decrement succeeded
  IF v_new_balance IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to use hint'
    );
  END IF;
  
  -- Calculate games until next free hint
  v_games_until_next := 10 - (v_total_completed % 10);
  
  RETURN json_build_object(
    'success', true,
    'hintBalance', v_new_balance,
    'gamesUntilNextFreeHint', v_games_until_next
  );
END;
$$;

-- Function: Reward hint on game completion (atomic operation)
CREATE OR REPLACE FUNCTION reward_cryptoku_hint(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
DECLARE
  v_hints_earned INTEGER;
  v_new_balance INTEGER;
  v_total_completed INTEGER;
  v_old_total INTEGER;
  v_games_until_next INTEGER;
BEGIN
  -- Ensure record exists (create if doesn't)
  PERFORM ensure_cryptoku_hints(p_user_id);
  
  -- Get current total_ranked_completed to check if we should reward
  SELECT total_ranked_completed INTO v_old_total
  FROM cryptoku_hints
  WHERE user_id = p_user_id;
  
  -- Calculate if this completion earns a hint (every 10 games)
  IF (v_old_total + 1) % 10 = 0 THEN
    v_hints_earned := 1;
  ELSE
    v_hints_earned := 0;
  END IF;
  
  -- Increment total_ranked_completed and reward hint if needed
  UPDATE cryptoku_hints
  SET 
    total_ranked_completed = total_ranked_completed + 1,
    hint_balance = hint_balance + v_hints_earned,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING 
    total_ranked_completed,
    hint_balance
  INTO v_total_completed, v_new_balance;
  
  -- Calculate games until next free hint
  v_games_until_next := 10 - (v_total_completed % 10);
  
  RETURN json_build_object(
    'hintsEarned', v_hints_earned,
    'hintBalance', v_new_balance,
    'totalRankedCompleted', v_total_completed,
    'gamesUntilNextFreeHint', v_games_until_next
  );
END;
$$;

-- Function: Purchase hints
CREATE OR REPLACE FUNCTION purchase_cryptoku_hints(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
DECLARE
  v_new_balance INTEGER;
  v_total_completed INTEGER;
  v_games_until_next INTEGER;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid amount'
    );
  END IF;
  
  -- Ensure record exists (create if doesn't)
  PERFORM ensure_cryptoku_hints(p_user_id);
  
  -- Add purchased hints
  UPDATE cryptoku_hints
  SET 
    hint_balance = hint_balance + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING hint_balance, total_ranked_completed
  INTO v_new_balance, v_total_completed;
  
  -- Calculate games until next free hint
  v_games_until_next := 10 - (v_total_completed % 10);
  
  RETURN json_build_object(
    'success', true,
    'hintBalance', v_new_balance,
    'gamesUntilNextFreeHint', v_games_until_next
  );
END;
$$;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run this query to verify the table was created:
--
-- SELECT 
--   table_name,
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'cryptoku_hints'
-- ORDER BY ordinal_position;
--
-- Expected columns:
-- - id (uuid)
-- - user_id (uuid)
-- - hint_balance (integer)
-- - total_ranked_completed (integer)
-- - created_at (timestamp with time zone)
-- - updated_at (timestamp with time zone)
-- =====================================================
