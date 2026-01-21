-- =====================================================
-- Ape In Consume Play RPC Function
-- =====================================================
-- Atomic play consumption: free first, then purchased
-- 
-- CRITICAL: This function must be atomic (single transaction)
-- to prevent race conditions and double game starts.
-- 
-- Priority:
-- 1. Free play first (mode-specific, daily reset)
-- 2. Purchased play second (global balance)
-- 3. Reject if both are 0
-- 
-- DEPENDENCIES:
-- - Table: ape_in_daily_free_plays (must exist)
--   * Uses counter model: one row per day per mode with plays_used (0-5)
--   * Requires unique constraint on (user_id, game_mode, date_used)
--   * Requires plays_used column (added by migration 20260120135000)
--   * Migration: 20260120135000_add_plays_used_to_free_plays.sql must run FIRST
-- - Table: ape_in_purchased_plays_balances (must exist with user_id as PK)
--   * Created by migration: 20260120130000_create_ape_in_purchased_plays_balances.sql
--   * This migration must run BEFORE this RPC migration
-- - Table: profiles (must exist)
-- =====================================================

CREATE OR REPLACE FUNCTION public.ape_in_consume_play(
  p_wallet_address TEXT,
  p_game_mode TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  error TEXT,
  free_plays_remaining INT,
  purchased_plays_remaining INT,
  total_plays_remaining INT,
  consumed_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
DECLARE
  v_user_id UUID;
  v_consumed_type TEXT := NULL;
  v_free_plays_remaining INT := 0;
  v_purchased_plays_remaining INT := 0;
  v_total_plays_remaining INT := 0;
  v_today_date DATE;
  v_free_plays_used_today INT;
  v_free_plays_per_day INT := 5;
  v_free_play_modes TEXT[] := ARRAY['aida', 'lana', 'enj1n', 'nifty'];
  v_purchased_balance INT;
BEGIN
  -- Normalize wallet address
  p_wallet_address := LOWER(p_wallet_address);
  p_game_mode := LOWER(p_game_mode);

  -- Get today's date (DATE type for proper comparison)
  v_today_date := CURRENT_DATE;

  -- Resolve user_id from wallet address
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE wallet_address = p_wallet_address
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT
      FALSE::BOOLEAN,
      'Profile not found'::TEXT,
      0::INT,
      0::INT,
      0::INT,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Sandy does not consume plays (always free tutorial)
  IF p_game_mode = 'sandy' THEN
    RETURN QUERY SELECT
      FALSE::BOOLEAN,
      'Sandy does not consume plays'::TEXT,
      0::INT,
      0::INT,
      0::INT,
      NULL::TEXT;
    RETURN;
  END IF;

  -- =====================================================
  -- STEP 1: Try to consume FREE play (mode-specific)
  -- =====================================================
  -- Only specific modes have free plays
  -- Uses counter model: one row per day per mode with plays_used (0-5)
  IF p_game_mode = ANY(v_free_play_modes) THEN
    -- Atomic upsert: insert or increment plays_used counter
    -- Only increment if plays_used < 5 (allows up to 5 plays/day)
    INSERT INTO public.ape_in_daily_free_plays (
      user_id,
      game_mode,
      date_used,
      plays_used
    )
    VALUES (
      v_user_id,
      p_game_mode,
      v_today_date,
      1
    )
    ON CONFLICT (user_id, game_mode, date_used)
    DO UPDATE SET
      plays_used = CASE
        WHEN ape_in_daily_free_plays.plays_used < v_free_plays_per_day
        THEN ape_in_daily_free_plays.plays_used + 1
        ELSE ape_in_daily_free_plays.plays_used
      END
    RETURNING plays_used INTO v_free_plays_used_today;

    -- Check if we successfully consumed a play (plays_used <= 5 after increment)
    IF v_free_plays_used_today IS NOT NULL AND v_free_plays_used_today <= v_free_plays_per_day THEN
      -- Free play consumed successfully
      v_consumed_type := 'free';
      v_free_plays_remaining := GREATEST(0, v_free_plays_per_day - v_free_plays_used_today);
    ELSE
      -- No free plays available (already at 5 or increment failed)
      -- Re-fetch current plays_used to compute remaining
      SELECT COALESCE(plays_used, 0) INTO v_free_plays_used_today
      FROM public.ape_in_daily_free_plays
      WHERE user_id = v_user_id
        AND game_mode = p_game_mode
        AND date_used = v_today_date;

      v_free_plays_remaining := GREATEST(0, v_free_plays_per_day - COALESCE(v_free_plays_used_today, 0));
      -- Continue to purchased play attempt (v_consumed_type remains NULL)
    END IF;
  ELSE
    -- Mode doesn't support free plays
    v_free_plays_remaining := 0;
  END IF;

  -- =====================================================
  -- STEP 2: If free play not consumed, try PURCHASED play
  -- =====================================================
  IF v_consumed_type IS NULL THEN
    -- Ensure purchased plays balance row exists (for users who haven't purchased yet)
    INSERT INTO public.ape_in_purchased_plays_balances (user_id, balance, updated_at)
    VALUES (v_user_id, 0, NOW())
    ON CONFLICT (user_id) DO NOTHING;

    -- Atomic decrement: balance = balance - 1 (executed in DB, prevents lost update)
    UPDATE public.ape_in_purchased_plays_balances
    SET balance = balance - 1,
        updated_at = NOW()
    WHERE user_id = v_user_id
      AND balance > 0
    RETURNING balance INTO v_purchased_balance;

    -- Check if update succeeded (balance was > 0)
    IF v_purchased_balance IS NOT NULL THEN
      v_consumed_type := 'purchased';
      v_purchased_plays_remaining := v_purchased_balance;
    ELSE
      -- No purchased plays available
      SELECT COALESCE(balance, 0) INTO v_purchased_plays_remaining
      FROM public.ape_in_purchased_plays_balances
      WHERE user_id = v_user_id;
    END IF;
  ELSE
    -- Free play was consumed, ensure purchased row exists for consistent response
    INSERT INTO public.ape_in_purchased_plays_balances (user_id, balance, updated_at)
    VALUES (v_user_id, 0, NOW())
    ON CONFLICT (user_id) DO NOTHING;

    SELECT COALESCE(balance, 0) INTO v_purchased_plays_remaining
    FROM public.ape_in_purchased_plays_balances
    WHERE user_id = v_user_id;
  END IF;

  -- =====================================================
  -- STEP 3: Compute remaining balances and return result
  -- =====================================================
  -- If free plays remaining wasn't computed yet, compute it now
  -- Use IS DISTINCT FROM for NULL-safe comparison
  IF v_consumed_type IS DISTINCT FROM 'free' AND p_game_mode = ANY(v_free_play_modes) THEN
    -- Fetch current plays_used from counter model
    SELECT COALESCE(plays_used, 0) INTO v_free_plays_used_today
    FROM public.ape_in_daily_free_plays
    WHERE user_id = v_user_id
      AND game_mode = p_game_mode
      AND date_used = v_today_date;

    v_free_plays_remaining := GREATEST(0, v_free_plays_per_day - COALESCE(v_free_plays_used_today, 0));
  END IF;

  -- NULL guards: ensure no NULLs leak into response
  v_free_plays_remaining := COALESCE(v_free_plays_remaining, 0);
  v_purchased_plays_remaining := COALESCE(v_purchased_plays_remaining, 0);

  v_total_plays_remaining := v_free_plays_remaining + v_purchased_plays_remaining;

  -- Return result
  IF v_consumed_type IS NULL THEN
    -- No play was consumed
    RETURN QUERY SELECT
      FALSE::BOOLEAN,
      'No plays available'::TEXT,
      v_free_plays_remaining,
      v_purchased_plays_remaining,
      v_total_plays_remaining,
      NULL::TEXT;
  ELSE
    -- Play was consumed successfully
    RETURN QUERY SELECT
      TRUE::BOOLEAN,
      NULL::TEXT,
      v_free_plays_remaining,
      v_purchased_plays_remaining,
      v_total_plays_remaining,
      v_consumed_type;
  END IF;
END;
$$;

-- Revoke public access (only callable via service role/admin client)
REVOKE ALL ON FUNCTION public.ape_in_consume_play(TEXT, TEXT) FROM PUBLIC;

-- Grant execute to authenticated users (if needed, or keep restricted to service role only)
-- GRANT EXECUTE ON FUNCTION public.ape_in_consume_play(TEXT, TEXT) TO authenticated;
