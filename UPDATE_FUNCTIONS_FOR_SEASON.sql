-- =====================================================
-- UPDATE RPC FUNCTIONS FOR SEASON SUPPORT
-- =====================================================
-- Run this after adding season columns to tables
-- These updates add season parameter to functions that insert data

-- =====================================================
-- UPDATE: add_cryptoku_leaderboard_entry
-- =====================================================
CREATE OR REPLACE FUNCTION add_cryptoku_leaderboard_entry(
  p_run_id TEXT,
  p_user_id UUID,
  p_mode TEXT,
  p_score INTEGER,
  p_time_seconds INTEGER,
  p_hints_used INTEGER,
  p_errors INTEGER,
  p_completed BOOLEAN DEFAULT TRUE,
  p_forfeited BOOLEAN DEFAULT FALSE,
  p_season INTEGER DEFAULT 1  -- Add season parameter (default to Season 1)
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
      forfeited,
      season  -- Add season column
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
      p_forfeited,
      p_season  -- Use season parameter
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
    forfeited,
    season  -- Add season column
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
    p_forfeited,
    p_season  -- Use season parameter
  )
  ON CONFLICT (run_id) DO UPDATE SET
    score = EXCLUDED.score,
    time_seconds = EXCLUDED.time_seconds,
    hints_used = EXCLUDED.hints_used,
    errors = EXCLUDED.errors,
    completed = EXCLUDED.completed,
    forfeited = EXCLUDED.forfeited,
    season = EXCLUDED.season  -- Update season on conflict
  RETURNING id INTO v_entry_id;
  
  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- UPDATE: update_user_balance
-- =====================================================
-- Add season parameter to transactions inserts
CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id UUID,
  p_ape_change INTEGER DEFAULT 0,
  p_tickets_change INTEGER DEFAULT 0,
  p_points_change INTEGER DEFAULT 0,
  p_transaction_type TEXT DEFAULT 'manual',
  p_description TEXT DEFAULT NULL,
  p_season INTEGER DEFAULT 1  -- Add season parameter (default to Season 1)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
BEGIN
  -- Update profile balances
  UPDATE profiles
  SET 
    ape_balance = GREATEST(0, ape_balance + p_ape_change),
    tickets = GREATEST(0, tickets + p_tickets_change),
    points = GREATEST(0, points + p_points_change)
  WHERE id = p_user_id;
  
  -- Record transactions (with season)
  IF p_ape_change != 0 THEN
    INSERT INTO transactions (user_id, transaction_type, amount, currency, description, season)
    VALUES (p_user_id, p_transaction_type, p_ape_change, 'ape', p_description, p_season);
  END IF;
  
  IF p_tickets_change != 0 THEN
    INSERT INTO transactions (user_id, transaction_type, amount, currency, description, season)
    VALUES (p_user_id, p_transaction_type, p_tickets_change, 'tickets', p_description, p_season);
  END IF;
  
  IF p_points_change != 0 THEN
    INSERT INTO transactions (user_id, transaction_type, amount, currency, description, season)
    VALUES (p_user_id, p_transaction_type, p_points_change, 'points', p_description, p_season);
    
    -- Update leaderboard (only for current season)
    UPDATE leaderboard
    SET total_points = total_points + p_points_change
    WHERE user_id = p_user_id AND season = p_season;
  END IF;
END;
$$;

-- =====================================================
-- UPDATE: get_cryptoku_leaderboard
-- =====================================================
-- Add season filter to leaderboard reads
CREATE OR REPLACE FUNCTION get_cryptoku_leaderboard(
  p_mode TEXT DEFAULT 'ALL',
  p_limit INTEGER DEFAULT 50,
  p_season INTEGER DEFAULT 1  -- Add season parameter (default to Season 1)
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
      AND cl.season = p_season  -- Filter by season
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
