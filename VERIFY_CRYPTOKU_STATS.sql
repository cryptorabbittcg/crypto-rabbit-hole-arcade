-- =====================================================
-- VERIFY CRYPTOKU STATS AND GAME SESSION RECORDING
-- =====================================================
-- Run this in Supabase SQL Editor to verify that:
-- 1. Game sessions are being recorded for Cryptoku runs
-- 2. Profile stats (total_games_played, total_wins, total_playtime) are updating
-- =====================================================

-- =====================================================
-- 1. CHECK LATEST GAME SESSIONS FOR CRYPTOKU
-- =====================================================
-- This shows the most recent Cryptoku game sessions
SELECT 
  id,
  user_id,
  game_type,
  game_mode,
  run_id,
  score,
  duration,
  result,
  points_earned,
  started_at,
  ended_at
FROM game_sessions
WHERE game_type = 'cryptoku'
ORDER BY ended_at DESC NULLS LAST, started_at DESC
LIMIT 10;

-- =====================================================
-- 2. CHECK FOR SPECIFIC RUN_ID
-- =====================================================
-- Replace 'YOUR_RUN_ID' with an actual run_id from a recent submission
-- SELECT 
--   id,
--   user_id,
--   game_type,
--   game_mode,
--   run_id,
--   score,
--   duration,
--   result,
--   points_earned,
--   started_at,
--   ended_at
-- FROM game_sessions
-- WHERE run_id = 'YOUR_RUN_ID';

-- =====================================================
-- 3. VERIFY PROFILE STATS FOR A SPECIFIC USER
-- =====================================================
-- Replace 'USER_ID' with an actual user_id from profiles table
-- SELECT 
--   id,
--   wallet_address,
--   username,
--   total_games_played,
--   total_wins,
--   total_losses,
--   win_streak,
--   best_win_streak,
--   total_playtime,
--   points,
--   updated_at
-- FROM profiles
-- WHERE id = 'USER_ID'::uuid;

-- =====================================================
-- 4. CHECK PROFILE STATS FOR CRYPTOKU PLAYERS
-- =====================================================
-- Shows users who have played Cryptoku and their stats
SELECT 
  p.id,
  p.wallet_address,
  p.username,
  p.total_games_played,
  p.total_wins,
  p.total_losses,
  p.win_streak,
  p.best_win_streak,
  p.total_playtime,
  p.points,
  COUNT(gs.id) as cryptoku_sessions_count,
  MAX(gs.ended_at) as last_cryptoku_session
FROM profiles p
LEFT JOIN game_sessions gs ON gs.user_id = p.id AND gs.game_type = 'cryptoku'
WHERE EXISTS (
  SELECT 1 FROM game_sessions gs2 
  WHERE gs2.user_id = p.id AND gs2.game_type = 'cryptoku'
)
GROUP BY p.id, p.wallet_address, p.username, p.total_games_played, p.total_wins, 
         p.total_losses, p.win_streak, p.best_win_streak, p.total_playtime, p.points
ORDER BY last_cryptoku_session DESC
LIMIT 10;

-- =====================================================
-- 5. VERIFY GAME SESSION COUNTS MATCH PROFILE STATS
-- =====================================================
-- Compares total_games_played with actual game_sessions count
-- (Should match if record_game_session is being called correctly)
SELECT 
  p.id,
  p.wallet_address,
  p.username,
  p.total_games_played as profile_total_games,
  COUNT(gs.id) as actual_sessions_count,
  COUNT(gs.id) FILTER (WHERE gs.result = 'won') as won_sessions,
  COUNT(gs.id) FILTER (WHERE gs.result = 'lost') as lost_sessions,
  SUM(gs.duration) as total_playtime_from_sessions,
  p.total_playtime as profile_total_playtime,
  CASE 
    WHEN p.total_games_played = COUNT(gs.id) THEN '✅ Match'
    ELSE '⚠️ Mismatch'
  END as stats_consistency
FROM profiles p
LEFT JOIN game_sessions gs ON gs.user_id = p.id
WHERE EXISTS (
  SELECT 1 FROM game_sessions gs2 
  WHERE gs2.user_id = p.id AND gs2.game_type = 'cryptoku'
)
GROUP BY p.id, p.wallet_address, p.username, p.total_games_played, p.total_playtime
HAVING COUNT(gs.id) > 0
ORDER BY p.updated_at DESC
LIMIT 10;

-- =====================================================
-- 6. CHECK CRYPTOKU-SPECIFIC SESSIONS WITH RUN_ID
-- =====================================================
-- Verifies that run_id is being stored for idempotency
SELECT 
  gs.id,
  gs.user_id,
  gs.run_id,
  gs.game_mode as mode,
  gs.score,
  gs.duration,
  gs.points_earned,
  gs.ended_at,
  cl.id as leaderboard_entry_id,
  CASE 
    WHEN gs.run_id IS NOT NULL THEN '✅ Has run_id'
    ELSE '⚠️ Missing run_id'
  END as run_id_status
FROM game_sessions gs
LEFT JOIN cryptoku_leaderboard cl ON cl.run_id = gs.run_id
WHERE gs.game_type = 'cryptoku'
ORDER BY gs.ended_at DESC NULLS LAST, gs.started_at DESC
LIMIT 10;

-- =====================================================
-- EXPECTED RESULTS
-- =====================================================
-- 1. Query 1: Should show recent Cryptoku game_sessions with:
--    - game_type = 'cryptoku'
--    - game_mode in ('DEGEN', 'APE')
--    - result = 'won'
--    - points_earned > 0 (for ranked modes)
--
-- 2. Query 4: Should show profiles with:
--    - total_games_played > 0 (if they've completed games)
--    - total_wins > 0 (if they've completed Cryptoku)
--    - total_playtime > 0 (if games were completed)
--    - cryptoku_sessions_count matches their game completions
--
-- 3. Query 5: Should show:
--    - stats_consistency = '✅ Match' for users where record_game_session is working
--    - profile_total_games should equal actual_sessions_count
--    - profile_total_playtime should match total_playtime_from_sessions
--
-- 4. Query 6: Should show:
--    - run_id_status = '✅ Has run_id' for sessions created after the fix
--    - leaderboard_entry_id should exist (matching entry in cryptoku_leaderboard)
-- =====================================================
