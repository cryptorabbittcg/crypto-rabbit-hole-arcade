-- =====================================================
-- CRYPTOKU LEADERBOARD TABLE
-- =====================================================
-- Creates table for storing Cryptoku leaderboard runs
-- Migrates from Vercel KV to Supabase for better reliability and queryability
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
  
  -- Ensure completed runs are ranked (NOOB excluded)
  CONSTRAINT valid_ranked_run CHECK (
    (mode IN ('DEGEN', 'APE') AND completed = TRUE AND forfeited = FALSE) OR
    mode = 'NOOB' OR
    completed = FALSE OR
    forfeited = TRUE
  )
);

-- Indexes for fast leaderboard queries
CREATE INDEX IF NOT EXISTS idx_cryptoku_leaderboard_mode_score ON cryptoku_leaderboard(mode, score DESC, time_seconds ASC) 
  WHERE completed = TRUE AND forfeited = FALSE AND mode IN ('DEGEN', 'APE');
CREATE INDEX IF NOT EXISTS idx_cryptoku_leaderboard_user ON cryptoku_leaderboard(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cryptoku_leaderboard_run_id ON cryptoku_leaderboard(run_id);
CREATE INDEX IF NOT EXISTS idx_cryptoku_leaderboard_created ON cryptoku_leaderboard(created_at DESC);

-- Add comment
COMMENT ON TABLE cryptoku_leaderboard IS 'Stores Cryptoku leaderboard runs (ranked games only: DEGEN and APE)';
COMMENT ON COLUMN cryptoku_leaderboard.run_id IS 'Unique run ID from the game client';
COMMENT ON COLUMN cryptoku_leaderboard.mode IS 'Game mode: DEGEN, APE, or NOOB (NOOB runs are stored but not ranked)';
COMMENT ON COLUMN cryptoku_leaderboard.score IS 'Final score for the run';
COMMENT ON COLUMN cryptoku_leaderboard.time_seconds IS 'Time taken in seconds';
COMMENT ON COLUMN cryptoku_leaderboard.completed IS 'Whether the run was completed';
COMMENT ON COLUMN cryptoku_leaderboard.forfeited IS 'Whether the run was forfeited';

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function: Add leaderboard entry (atomic operation)
CREATE OR REPLACE FUNCTION add_cryptoku_leaderboard_entry(
  p_run_id TEXT,
  p_user_id UUID,
  p_mode TEXT,
  p_score INTEGER,
  p_time_seconds INTEGER,
  p_hints_used INTEGER,
  p_errors INTEGER,
  p_completed BOOLEAN DEFAULT TRUE,
  p_forfeited BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  -- Only insert ranked runs (DEGEN/APE, completed, not forfeited)
  -- NOOB runs, incomplete runs, and forfeited runs are not ranked
  IF p_mode NOT IN ('DEGEN', 'APE') OR NOT p_completed OR p_forfeited THEN
    -- Still insert for record keeping, but return NULL to indicate not ranked
    INSERT INTO cryptoku_leaderboard (
      run_id,
      user_id,
      mode,
      score,
      time_seconds,
      hints_used,
      errors,
      completed,
      forfeited
    )
    VALUES (
      p_run_id,
      p_user_id,
      p_mode,
      p_score,
      p_time_seconds,
      p_hints_used,
      p_errors,
      p_completed,
      p_forfeited
    )
    ON CONFLICT (run_id) DO NOTHING
    RETURNING id INTO v_entry_id;
    
    RETURN v_entry_id; -- Return ID but this won't be ranked
  END IF;
  
  -- Insert ranked run
  INSERT INTO cryptoku_leaderboard (
    run_id,
    user_id,
    mode,
    score,
    time_seconds,
    hints_used,
    errors,
    completed,
    forfeited
  )
  VALUES (
    p_run_id,
    p_user_id,
    p_mode,
    p_score,
    p_time_seconds,
    p_hints_used,
    p_errors,
    p_completed,
    p_forfeited
  )
  ON CONFLICT (run_id) DO UPDATE SET
    score = EXCLUDED.score,
    time_seconds = EXCLUDED.time_seconds,
    hints_used = EXCLUDED.hints_used,
    errors = EXCLUDED.errors,
    completed = EXCLUDED.completed,
    forfeited = EXCLUDED.forfeited
  RETURNING id INTO v_entry_id;
  
  -- Update user's high score in main leaderboard table
  UPDATE leaderboard
  SET 
    cryptoku_high_score = GREATEST(
      COALESCE(cryptoku_high_score, 0),
      p_score
    ),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Ensure leaderboard entry exists
  IF NOT FOUND THEN
    INSERT INTO leaderboard (user_id, cryptoku_high_score, updated_at)
    VALUES (p_user_id, p_score, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      cryptoku_high_score = GREATEST(leaderboard.cryptoku_high_score, p_score),
      updated_at = NOW();
  END IF;
  
  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get leaderboard entries
CREATE OR REPLACE FUNCTION get_cryptoku_leaderboard(
  p_mode TEXT DEFAULT 'ALL',
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  rank BIGINT,
  run_id TEXT,
  user_id UUID,
  wallet_address TEXT,
  username TEXT,
  mode TEXT,
  score INTEGER,
  time_seconds INTEGER,
  hints_used INTEGER,
  errors INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_runs AS (
    SELECT 
      cl.id,
      cl.run_id,
      cl.user_id,
      cl.mode,
      cl.score,
      cl.time_seconds,
      cl.hints_used,
      cl.errors,
      cl.created_at,
      p.wallet_address,
      p.username,
      ROW_NUMBER() OVER (
        ORDER BY 
          CASE WHEN p_mode = 'ALL' THEN 
            CASE cl.mode WHEN 'APE' THEN 1 WHEN 'DEGEN' THEN 2 ELSE 3 END 
          ELSE 0 END,
          cl.score DESC,
          cl.time_seconds ASC
      ) as global_rank,
      ROW_NUMBER() OVER (
        PARTITION BY cl.mode 
        ORDER BY cl.score DESC, cl.time_seconds ASC
      ) as mode_rank
    FROM cryptoku_leaderboard cl
    JOIN profiles p ON cl.user_id = p.id
    WHERE 
      cl.completed = TRUE 
      AND cl.forfeited = FALSE
      AND cl.mode IN ('DEGEN', 'APE')
      AND (p_mode = 'ALL' OR cl.mode = p_mode)
  )
  SELECT 
    CASE WHEN p_mode = 'ALL' THEN rr.global_rank ELSE rr.mode_rank END as rank,
    rr.run_id,
    rr.user_id,
    rr.wallet_address,
    rr.username,
    rr.mode,
    rr.score,
    rr.time_seconds,
    rr.hints_used,
    rr.errors,
    rr.created_at
  FROM ranked_runs rr
  ORDER BY 
    CASE WHEN p_mode = 'ALL' THEN 
      CASE rr.mode WHEN 'APE' THEN 1 WHEN 'DEGEN' THEN 2 ELSE 3 END 
    ELSE 0 END,
    rr.score DESC,
    rr.time_seconds ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

