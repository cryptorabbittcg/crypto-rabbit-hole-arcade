-- =====================================================
-- CLEAR GAME DATA - OPTIONS
-- =====================================================
-- Choose which level of cleanup you want
-- =====================================================

-- =====================================================
-- OPTION 1: MINIMAL - Reset Stats Only
-- =====================================================
-- Keeps: Balances, transactions, leaderboard entries, inventory
-- Resets: Profile game stats only
-- =====================================================
/*
BEGIN;
UPDATE profiles SET
  total_games_played = 0,
  total_wins = 0,
  total_losses = 0,
  win_streak = 0,
  best_win_streak = 0,
  total_playtime = 0,
  updated_at = NOW();
COMMIT;
*/

-- =====================================================
-- OPTION 2: MODERATE - Reset Stats + Leaderboards
-- =====================================================
-- Keeps: Balances, transactions, inventory
-- Resets: Profile stats, leaderboard entries, game sessions
-- =====================================================
/*
BEGIN;
DELETE FROM game_sessions;
DELETE FROM cryptoku_leaderboard;
UPDATE leaderboard SET
  total_points = 0,
  cryptoku_high_score = 0,
  ape_in_high_score = 0,
  card_battle_wins = 0,
  overall_rank = NULL,
  updated_at = NOW();
UPDATE profiles SET
  total_games_played = 0,
  total_wins = 0,
  total_losses = 0,
  win_streak = 0,
  best_win_streak = 0,
  total_playtime = 0,
  updated_at = NOW();
UPDATE cryptoku_hints SET
  hint_balance = 3,
  total_ranked_completed = 0,
  updated_at = NOW();
COMMIT;
*/

-- =====================================================
-- OPTION 3: COMPLETE - Full Reset (as in CLEAR_ALL_GAME_DATA.sql)
-- =====================================================
-- See CLEAR_ALL_GAME_DATA.sql for complete reset
-- =====================================================

-- =====================================================
-- OPTION 4: NUCLEAR - Everything Including Balances
-- =====================================================
-- WARNING: This resets EVERYTHING including balances!
-- =====================================================
/*
BEGIN;
DELETE FROM game_sessions;
DELETE FROM cryptoku_leaderboard;
DELETE FROM match_history;
DELETE FROM pvp_matches;
DELETE FROM transactions;
DELETE FROM card_inventory;
DELETE FROM upgrades_inventory;
DELETE FROM pack_openings;
DELETE FROM achievements;
UPDATE leaderboard SET
  total_points = 0,
  cryptoku_high_score = 0,
  ape_in_high_score = 0,
  card_battle_wins = 0,
  overall_rank = NULL,
  updated_at = NOW();
UPDATE profiles SET
  total_games_played = 0,
  total_wins = 0,
  total_losses = 0,
  win_streak = 0,
  best_win_streak = 0,
  total_playtime = 0,
  ape_balance = 1000,
  tickets = 5,
  points = 0,
  updated_at = NOW();
UPDATE cryptoku_hints SET
  hint_balance = 3,
  total_ranked_completed = 0,
  updated_at = NOW();
COMMIT;
*/
