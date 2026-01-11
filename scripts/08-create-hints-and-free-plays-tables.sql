-- =====================================================
-- CRYPTOKU HINTS & APE IN FREE PLAYS TABLES
-- =====================================================
-- Creates tables for storing Cryptoku hints and Ape In daily free plays
-- Migrates from localStorage to Supabase for better reliability
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

-- Add comment
COMMENT ON TABLE cryptoku_hints IS 'Stores Cryptoku hint balances and reward tracking for each user';
COMMENT ON COLUMN cryptoku_hints.hint_balance IS 'Current hint balance (default: 3 free hints)';
COMMENT ON COLUMN cryptoku_hints.total_ranked_completed IS 'Total ranked games completed (for reward calculation: +1 hint every 10 games)';

-- =====================================================
-- APE IN DAILY FREE PLAYS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ape_in_daily_free_plays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Game mode and date
  game_mode TEXT NOT NULL CHECK (game_mode IN ('aida', 'lana', 'enj1n', 'nifty')),
  date_used DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Timestamps
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: One play per user per mode per day
  UNIQUE(user_id, game_mode, date_used)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ape_in_daily_free_plays_user ON ape_in_daily_free_plays(user_id, date_used);
CREATE INDEX IF NOT EXISTS idx_ape_in_daily_free_plays_date ON ape_in_daily_free_plays(date_used);
CREATE INDEX IF NOT EXISTS idx_ape_in_daily_free_plays_mode ON ape_in_daily_free_plays(game_mode, date_used);

-- Add comment
COMMENT ON TABLE ape_in_daily_free_plays IS 'Tracks daily free plays used in Ape In game (5 per day per mode)';
COMMENT ON COLUMN ape_in_daily_free_plays.game_mode IS 'Game mode: aida, lana, enj1n, or nifty';
COMMENT ON COLUMN ape_in_daily_free_plays.date_used IS 'Date the free play was used (UTC date, resets at midnight UTC)';

-- =====================================================
-- CRYPTOKU HINTS FUNCTIONS
-- =====================================================

-- Helper function: Ensure hints record exists (creates if doesn't exist)
CREATE OR REPLACE FUNCTION ensure_cryptoku_hints(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Try to insert, ignore if already exists
  INSERT INTO cryptoku_hints (user_id, hint_balance, total_ranked_completed)
  VALUES (p_user_id, 3, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function: Use a hint (atomic operation with row locking)
CREATE OR REPLACE FUNCTION use_cryptoku_hint(p_user_id UUID)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql;

-- Function: Reward hint on game completion (atomic operation)
CREATE OR REPLACE FUNCTION reward_cryptoku_hint(p_user_id UUID)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql;

-- Function: Purchase hints
CREATE OR REPLACE FUNCTION purchase_cryptoku_hints(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cryptoku_hints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cryptoku_hints_updated_at ON cryptoku_hints;
CREATE TRIGGER update_cryptoku_hints_updated_at
  BEFORE UPDATE ON cryptoku_hints
  FOR EACH ROW
  EXECUTE FUNCTION update_cryptoku_hints_updated_at();

