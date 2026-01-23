-- =====================================================
-- ISOLATION TEST: get_ape_in_leaderboard with HARD season = 1
-- =====================================================
-- Use this ONLY if PostgREST still returns [] after:
--   - Reload schema (Settings → API → Reload schema)
--   - Confirming: select * from public.get_ape_in_leaderboard('aida', 100); returns rows in SQL editor
--
-- This replaces the dynamic "current_season" subquery with a fixed season = 1.
-- If this version returns rows in the browser RPC call, the problem is the
-- current_season logic in your live function.
--
-- Prerequisites:
--   - public.ape_in_leaderboard exists with: user_id, mode, season, best_score, best_ended_at
--   - public.profiles has: id, wallet_address, username, avatar_url
--
-- If your schema uses different column names (e.g. last_played instead of best_ended_at),
-- adjust the SELECT list before running.
-- =====================================================

create or replace function public.get_ape_in_leaderboard(p_mode text, p_limit integer default 100)
returns table(user_id uuid, wallet_address text, username text, avatar_url text, score integer, ended_at timestamptz)
language sql
security definer
set search_path = 'pg_catalog, public'
as $function$
  select
    a.user_id,
    p.wallet_address,
    p.username,
    p.avatar_url,
    a.best_score as score,
    a.best_ended_at as ended_at
  from public.ape_in_leaderboard a
  join public.profiles p on p.id = a.user_id
  where a.mode = lower(p_mode)
    and a.season = 1
    and a.best_score > 0
  order by a.best_score desc, a.best_ended_at desc
  limit greatest(p_limit, 1);
$function$;

-- After running: Reload schema again, then re-test the browser RPC call.
-- If it returns your row → the problem is the current_season subquery in the original function.
