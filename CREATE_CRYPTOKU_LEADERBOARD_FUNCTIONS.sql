-- =====================================================
-- CREATE CRYPTOKU LEADERBOARD FUNCTIONS
-- =====================================================
-- Creates the functions needed for Cryptoku leaderboard
-- =====================================================

-- =====================================================
-- FUNCTION: add_cryptoku_leaderboard_entry
-- =====================================================
CREATE OR REPLACE FUNCTION public.add_cryptoku_leaderboard_entry(
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
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  -- Insert or update leaderboard entry (ON CONFLICT on run_id)
  INSERT INTO public.cryptoku_leaderboard (
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
    score = GREATEST(public.cryptoku_leaderboard.score, EXCLUDED.score),
    time_seconds = LEAST(public.cryptoku_leaderboard.time_seconds, EXCLUDED.time_seconds),
    hints_used = EXCLUDED.hints_used,
    errors = EXCLUDED.errors,
    completed = EXCLUDED.completed,
    forfeited = EXCLUDED.forfeited,
    updated_at = NOW()
  RETURNING id INTO v_entry_id;
  
  -- Update leaderboard.cryptoku_high_score if this is a ranked run
  -- (DEGEN or APE mode, completed, not forfeited)
  IF p_mode IN ('DEGEN', 'APE') AND p_completed = TRUE AND p_forfeited = FALSE THEN
    -- Ensure leaderboard entry exists
    INSERT INTO public.leaderboard (user_id, cryptoku_high_score, updated_at)
    VALUES (p_user_id, p_score, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      cryptoku_high_score = GREATEST(public.leaderboard.cryptoku_high_score, p_score),
      updated_at = NOW();
  END IF;
  
  RETURN v_entry_id;
END;
$$;

-- =====================================================
-- FUNCTION: get_cryptoku_leaderboard
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_cryptoku_leaderboard(
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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
STABLE
AS $$
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
    FROM public.cryptoku_leaderboard cl
    JOIN public.profiles p ON cl.user_id = p.id
    WHERE 
      cl.completed = TRUE 
      AND cl.forfeited = FALSE
      AND cl.mode IN ('DEGEN', 'APE')
      AND (p_mode = 'ALL' OR cl.mode = p_mode)
  )
  SELECT 
    CASE WHEN p_mode = 'ALL' THEN rr.global_rank ELSE rr.mode_rank END::BIGINT as rank,
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
$$;

-- =====================================================
-- VERIFY FUNCTIONS
-- =====================================================
SELECT 
  'Functions created' as check_name,
  proname,
  CASE WHEN prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN ('add_cryptoku_leaderboard_entry', 'get_cryptoku_leaderboard')
ORDER BY proname;
