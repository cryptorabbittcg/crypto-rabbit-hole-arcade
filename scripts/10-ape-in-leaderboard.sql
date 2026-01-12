-- =====================================================
-- APE IN LEADERBOARD MIGRATION
-- =====================================================
-- Step 3: Add run_id column for idempotency and create leaderboard RPC function
-- =====================================================

-- =====================================================
-- MIGRATION: Add run_id column to game_sessions
-- =====================================================
-- Add run_id column for idempotency (unique, nullable for backward compatibility)
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS run_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_sessions_run_id ON game_sessions(run_id) WHERE run_id IS NOT NULL;
COMMENT ON COLUMN game_sessions.run_id IS 'Unique run ID for idempotency (prevents duplicate submissions)';

-- =====================================================
-- FUNCTION: Get Ape In Leaderboard
-- =====================================================
CREATE OR REPLACE FUNCTION get_ape_in_leaderboard(
  p_mode TEXT,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  rank INTEGER,
  user_id UUID,
  wallet_address TEXT,
  username TEXT,
  mode TEXT,
  best_score INTEGER,
  games_played BIGINT,
  last_played TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Handle 'best' mode: return best score per user across all modes (one row per user)
  IF p_mode = 'best' OR p_mode = 'all_best' THEN
    RETURN QUERY
    WITH user_best_across_modes AS (
      SELECT 
        gs.user_id,
        MAX(gs.score) as best_score,
        COUNT(*) as games_played,
        MAX(COALESCE(gs.ended_at, gs.started_at)) as last_played
      FROM game_sessions gs
      WHERE gs.game_type = 'ape_in'
        AND gs.result IN ('won', 'completed')
        AND gs.game_mode IN ('aida', 'lana', 'nifty', 'enj1n', 'pvp', 'multiplayer')
      GROUP BY gs.user_id
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY ubam.best_score DESC, ubam.last_played ASC)::INTEGER as rank,
      p.id as user_id,
      p.wallet_address,
      p.username,
      'all'::TEXT as mode,
      ubam.best_score,
      ubam.games_played,
      ubam.last_played
    FROM user_best_across_modes ubam
    JOIN profiles p ON ubam.user_id = p.id
    ORDER BY ubam.best_score DESC, ubam.last_played ASC
    LIMIT p_limit;
    
    RETURN;
  END IF;

  -- Handle per-mode queries (singleplayer, all, or specific mode)
  RETURN QUERY
  WITH mode_filter AS (
    SELECT CASE 
      WHEN p_mode = 'singleplayer' THEN ARRAY['aida', 'lana', 'nifty', 'enj1n']::TEXT[]
      WHEN p_mode = 'all' THEN ARRAY['aida', 'lana', 'nifty', 'enj1n', 'pvp', 'multiplayer']::TEXT[]
      ELSE ARRAY[p_mode]::TEXT[]
    END as allowed_modes
  ),
  user_best_scores AS (
    SELECT 
      gs.user_id,
      gs.game_mode,
      MAX(gs.score) as best_score,
      COUNT(*) as games_played,
      MAX(COALESCE(gs.ended_at, gs.started_at)) as last_played
    FROM game_sessions gs
    CROSS JOIN mode_filter mf
    WHERE gs.game_type = 'ape_in'
      AND gs.result IN ('won', 'completed')
      AND gs.game_mode = ANY(mf.allowed_modes)
    GROUP BY gs.user_id, gs.game_mode
  ),
  ranked_scores AS (
    SELECT
      ubs.user_id,
      ubs.game_mode as mode,
      ubs.best_score,
      ubs.games_played,
      ubs.last_played,
      ROW_NUMBER() OVER (
        PARTITION BY ubs.game_mode 
        ORDER BY ubs.best_score DESC, ubs.last_played ASC
      ) as mode_rank,
      ROW_NUMBER() OVER (
        ORDER BY ubs.best_score DESC, ubs.last_played ASC
      ) as global_rank
    FROM user_best_scores ubs
  )
  SELECT
    CASE 
      WHEN p_mode = 'all' THEN rs.global_rank
      ELSE rs.mode_rank
    END::INTEGER as rank,
    p.id as user_id,
    p.wallet_address,
    p.username,
    rs.mode,
    rs.best_score,
    rs.games_played,
    rs.last_played
  FROM ranked_scores rs
  JOIN profiles p ON rs.user_id = p.id
  ORDER BY 
    CASE WHEN p_mode = 'all' THEN rs.global_rank ELSE rs.mode_rank END,
    rs.best_score DESC,
    rs.last_played ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION get_ape_in_leaderboard(TEXT, INTEGER) IS 'Get Ape In leaderboard. Modes: specific (aida/lana/nifty/enj1n/pvp/multiplayer), singleplayer, all, or best (best per user across all modes)';

