-- =====================================================
-- Fix / Guarantee Overall Leaderboard RPC
-- =====================================================
-- Ensures public.get_leaderboard(p_limit) exists with a stable signature
-- and returns profile fields needed by the Arcade Hub "Overall" tab:
-- - wallet_address (for fallback display)
-- - username
-- - avatar_url
-- - total_points
--
-- Also includes total_wins / win_streak for compatibility with existing clients.
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  rank integer,
  user_id uuid,
  username text,
  wallet_address text,
  avatar_url text,
  total_points integer,
  total_wins integer,
  win_streak integer,
  card_battle_wins integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY l.total_points DESC)::integer AS rank,
    l.user_id,
    p.username,
    COALESCE(p.wallet_address, '') AS wallet_address,
    p.avatar_url,
    l.total_points,
    COALESCE(p.total_wins, 0) AS total_wins,
    COALESCE(p.win_streak, 0) AS win_streak,
    COALESCE(l.card_battle_wins, 0) AS card_battle_wins
  FROM public.leaderboard l
  LEFT JOIN public.profiles p ON p.id = l.user_id
  ORDER BY l.total_points DESC
  LIMIT p_limit;
END;
$$;

-- Permissions: this RPC is used for public leaderboard reads.
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO service_role;

COMMENT ON FUNCTION public.get_leaderboard(integer) IS
'Overall leaderboard RPC for Arcade Hub. Returns rank, wallet_address, username, avatar_url, total_points (plus total_wins/win_streak for compatibility).';

