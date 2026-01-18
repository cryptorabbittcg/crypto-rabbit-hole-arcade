-- =====================================================
-- FIX: Make update_user_balance UPSERT leaderboard (prevent drift)
-- =====================================================
-- This fixes the issue where leaderboard.total_points doesn't update
-- if the leaderboard row doesn't exist for a user.
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
    
    -- Update / create leaderboard row safely (UPSERT)
    INSERT INTO leaderboard (user_id, total_points, updated_at)
    VALUES (p_user_id, GREATEST(p_points_change, 0), NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET
      total_points = leaderboard.total_points + p_points_change,
      updated_at = NOW();
  END IF;
END;
$$;

-- =====================================================
-- ONE-TIME CORRECTION: Re-sync leaderboard.total_points
-- =====================================================
-- Run this after applying the fix to correct any existing drift
-- =====================================================

-- UPDATE leaderboard l
-- SET total_points = p.points
-- FROM profiles p
-- WHERE l.user_id = p.id;
