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
