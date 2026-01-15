-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================
-- Useful functions for common operations

-- =====================================================
-- GET OR CREATE PROFILE
-- =====================================================
CREATE OR REPLACE FUNCTION get_or_create_profile(
  p_wallet_address TEXT,
  p_username TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to find existing profile
  SELECT id INTO v_user_id
  FROM profiles
  WHERE wallet_address = p_wallet_address;
  
  -- If not found, create new profile
  IF v_user_id IS NULL THEN
    INSERT INTO profiles (wallet_address, username)
    VALUES (p_wallet_address, p_username)
    RETURNING id INTO v_user_id;
    
    -- Create initial leaderboard entry
    INSERT INTO leaderboard (user_id)
    VALUES (v_user_id);
  END IF;
  
  -- Update last login
  UPDATE profiles
  SET last_login = NOW()
  WHERE id = v_user_id;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ADD CARD TO INVENTORY
-- =====================================================
CREATE OR REPLACE FUNCTION add_card_to_inventory(
  p_user_id UUID,
  p_card_number INTEGER,
  p_card_name TEXT,
  p_card_type TEXT,
  p_attack INTEGER,
  p_defense INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_card_id UUID;
BEGIN
  INSERT INTO card_inventory (
    user_id, card_number, card_name, card_type, attack, defense
  )
  VALUES (
    p_user_id, p_card_number, p_card_name, p_card_type, p_attack, p_defense
  )
  ON CONFLICT (user_id, card_number) DO NOTHING
  RETURNING id INTO v_card_id;
  
  RETURN v_card_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- UPDATE USER BALANCE
-- =====================================================
CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id UUID,
  p_ape_change INTEGER DEFAULT 0,
  p_tickets_change INTEGER DEFAULT 0,
  p_points_change INTEGER DEFAULT 0,
  p_transaction_type TEXT DEFAULT 'manual',
  p_description TEXT DEFAULT NULL
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
  
  -- Record transactions
  IF p_ape_change != 0 THEN
    INSERT INTO transactions (user_id, transaction_type, amount, currency, description)
    VALUES (p_user_id, p_transaction_type, p_ape_change, 'ape', p_description);
  END IF;
  
  IF p_tickets_change != 0 THEN
    INSERT INTO transactions (user_id, transaction_type, amount, currency, description)
    VALUES (p_user_id, p_transaction_type, p_tickets_change, 'tickets', p_description);
  END IF;
  
  IF p_points_change != 0 THEN
    INSERT INTO transactions (user_id, transaction_type, amount, currency, description)
    VALUES (p_user_id, p_transaction_type, p_points_change, 'points', p_description);
    
    -- Update leaderboard
    UPDATE leaderboard
    SET total_points = total_points + p_points_change
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- =====================================================
-- RECORD GAME SESSION
-- =====================================================
CREATE OR REPLACE FUNCTION record_game_session(
  p_user_id UUID,
  p_game_type TEXT,
  p_game_mode TEXT,
  p_duration INTEGER,
  p_result TEXT,
  p_ape_earned INTEGER DEFAULT 0,
  p_tickets_earned INTEGER DEFAULT 0,
  p_points_earned INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
  v_is_win BOOLEAN;
BEGIN
  v_is_win := (p_result = 'won');
  
  -- Insert game session
  INSERT INTO game_sessions (
    user_id, game_type, game_mode, duration, result,
    ape_earned, tickets_earned, points_earned, ended_at
  )
  VALUES (
    p_user_id, p_game_type, p_game_mode, p_duration, p_result,
    p_ape_earned, p_tickets_earned, p_points_earned, NOW()
  )
  RETURNING id INTO v_session_id;
  
  -- Update profile stats
  UPDATE profiles
  SET 
    total_games_played = total_games_played + 1,
    total_wins = total_wins + CASE WHEN v_is_win THEN 1 ELSE 0 END,
    total_losses = total_losses + CASE WHEN p_result = 'lost' THEN 1 ELSE 0 END,
    win_streak = CASE WHEN v_is_win THEN win_streak + 1 ELSE 0 END,
    best_win_streak = GREATEST(best_win_streak, CASE WHEN v_is_win THEN win_streak + 1 ELSE 0 END),
    total_playtime = total_playtime + p_duration
  WHERE id = p_user_id;
  
  -- Update balances
  PERFORM update_user_balance(
    p_user_id,
    p_ape_earned,
    p_tickets_earned,
    p_points_earned,
    'game_reward',
    'Reward from ' || p_game_type
  );
  
  -- Update leaderboard game-specific stats
  IF p_game_type = 'card_battle' AND v_is_win THEN
    UPDATE leaderboard
    SET card_battle_wins = card_battle_wins + 1
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PURCHASE UPGRADE
-- =====================================================
CREATE OR REPLACE FUNCTION purchase_upgrade(
  p_user_id UUID,
  p_upgrade_type TEXT,
  p_upgrade_name TEXT,
  p_upgrade_cost INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_upgrade_id UUID;
  v_current_balance INTEGER;
BEGIN
  -- Check if user has enough APE
  SELECT ape_balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_current_balance < p_upgrade_cost THEN
    RAISE EXCEPTION 'Insufficient APE balance';
  END IF;
  
  -- Deduct APE
  PERFORM update_user_balance(
    p_user_id,
    -p_upgrade_cost,
    0,
    0,
    'upgrade_purchase',
    'Purchased ' || p_upgrade_name
  );
  
  -- Add to inventory
  INSERT INTO upgrades_inventory (
    user_id, upgrade_type, upgrade_name, upgrade_cost
  )
  VALUES (
    p_user_id, p_upgrade_type, p_upgrade_name, p_upgrade_cost
  )
  RETURNING id INTO v_upgrade_id;
  
  RETURN v_upgrade_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GET TOP GAME SCORES
-- =====================================================
CREATE OR REPLACE FUNCTION get_top_game_scores(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  wallet_address TEXT,
  max_score INTEGER,
  game_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_best_scores AS (
    SELECT DISTINCT ON (gs.user_id)
      gs.user_id,
      gs.score as max_score,
      gs.game_type
    FROM game_sessions gs
    ORDER BY gs.user_id, gs.score DESC
  )
  SELECT 
    p.id as user_id,
    p.username,
    p.wallet_address,
    ubs.max_score,
    ubs.game_type
  FROM user_best_scores ubs
  JOIN profiles p ON ubs.user_id = p.id
  ORDER BY ubs.max_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GET LEADERBOARD
-- =====================================================
-- Drop existing function first if return type changed
DROP FUNCTION IF EXISTS get_leaderboard(INTEGER);

CREATE OR REPLACE FUNCTION get_leaderboard(
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  rank INTEGER,
  user_id UUID,
  username TEXT,
  wallet_address TEXT,
  avatar_url TEXT,
  total_points INTEGER,
  total_wins INTEGER,
  card_battle_wins INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROW_NUMBER() OVER (ORDER BY l.total_points DESC)::INTEGER as rank,
    p.id as user_id,
    p.username,
    p.wallet_address,
    p.avatar_url,
    l.total_points,
    p.total_wins,
    l.card_battle_wins
  FROM leaderboard l
  JOIN profiles p ON l.user_id = p.id
  ORDER BY l.total_points DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIND PVP OPPONENT
-- =====================================================
CREATE OR REPLACE FUNCTION find_pvp_opponent(
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_match_id UUID;
  v_opponent_id UUID;
BEGIN
  -- Look for waiting matches
  SELECT id, player1_id INTO v_match_id, v_opponent_id
  FROM pvp_matches
  WHERE match_status = 'waiting'
    AND player1_id != p_user_id
    AND player2_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF v_match_id IS NOT NULL THEN
    -- Join existing match
    UPDATE pvp_matches
    SET 
      player2_id = p_user_id,
      match_status = 'in_progress',
      started_at = NOW()
    WHERE id = v_match_id;
    
    RETURN v_match_id;
  ELSE
    -- Create new match
    INSERT INTO pvp_matches (player1_id, match_status)
    VALUES (p_user_id, 'waiting')
    RETURNING id INTO v_match_id;
    
    RETURN v_match_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
