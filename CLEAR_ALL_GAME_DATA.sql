-- =====================================================
-- CLEAR ALL GAME DATA - FRESH START
-- =====================================================
-- This script clears all game-related data while preserving:
-- - User profiles (wallet addresses, usernames, avatars)
-- - Database structure (tables, functions, RLS policies)
-- - Profile balances (APE, tickets, points) - UNCOMMENT IF YOU WANT TO KEEP
-- =====================================================
-- WARNING: This will delete ALL game data permanently!
-- Make a backup before running if needed.
-- =====================================================

BEGIN;

-- =====================================================
-- SECTION 1: Clear Game Sessions
-- =====================================================
DELETE FROM game_sessions;

-- =====================================================
-- SECTION 2: Clear Leaderboard Data
-- =====================================================
-- Clear Cryptoku leaderboard entries
DELETE FROM cryptoku_leaderboard;

-- Clear main leaderboard entries (but keep table structure)
-- This resets: total_points, cryptoku_high_score, ape_in_high_score, card_battle_wins
UPDATE leaderboard SET
  total_points = 0,
  cryptoku_high_score = 0,
  ape_in_high_score = 0,
  card_battle_wins = 0,
  overall_rank = NULL,
  updated_at = NOW();

-- =====================================================
-- SECTION 3: Reset Profile Game Stats
-- =====================================================
-- Reset all game-related stats to 0, but keep:
-- - wallet_address, username, avatar_url
-- - ape_balance, tickets, points (uncomment the lines below if you want to reset these too)
UPDATE profiles SET
  -- Game stats
  total_games_played = 0,
  total_wins = 0,
  total_losses = 0,
  win_streak = 0,
  best_win_streak = 0,
  total_playtime = 0,
  -- Reset points (displayed in header and profile page)
  points = 0,
  -- Uncomment these if you want to reset other balances too:
  -- ape_balance = 1000,  -- Reset to default starting balance
  -- tickets = 5,         -- Reset to default starting tickets
  updated_at = NOW();

-- =====================================================
-- SECTION 4: Clear Cryptoku Hints Data
-- =====================================================
-- Reset hints to default (3 hints, 0 completed games)
UPDATE cryptoku_hints SET
  hint_balance = 3,
  total_ranked_completed = 0,
  updated_at = NOW();

-- =====================================================
-- SECTION 5: Clear Game-Related Transactions
-- =====================================================
-- Delete transactions related to game rewards/earnings
-- Keep purchases/other transactions if you want
-- Uncomment if you want to clear ALL transactions:
-- DELETE FROM transactions;

-- Clear game-related transactions (including points transactions)
DELETE FROM transactions 
WHERE transaction_type IN (
  'game_reward',
  'cryptoku_completion',
  'ape_in_completion',
  'leaderboard_bonus',
  'streak_bonus',
  'verification_test',
  'test',
  'test_fix',
  'test_ape',
  'rls_fix_test',
  'error_test',
  'direct_test',
  'final_test'
)
OR currency = 'points';

-- =====================================================
-- SECTION 6: Clear PvP/Match Data (if exists)
-- =====================================================
DELETE FROM match_history;
DELETE FROM pvp_matches;

-- =====================================================
-- SECTION 7: Clear Inventory (optional)
-- =====================================================
-- Uncomment if you want to clear card inventory:
-- DELETE FROM card_inventory;

-- Uncomment if you want to clear upgrades inventory:
-- DELETE FROM upgrades_inventory;

-- Uncomment if you want to clear pack openings:
-- DELETE FROM pack_openings;

-- =====================================================
-- SECTION 8: Clear Achievements (optional)
-- =====================================================
-- Uncomment if you want to clear achievements:
-- DELETE FROM achievements;

-- =====================================================
-- VERIFICATION - Check what was cleared
-- =====================================================
SELECT 
  'Game sessions' as table_name,
  COUNT(*) as remaining_count
FROM game_sessions
UNION ALL
SELECT 
  'Cryptoku leaderboard',
  COUNT(*)
FROM cryptoku_leaderboard
UNION ALL
SELECT 
  'Leaderboard (non-zero points)',
  COUNT(*)
FROM leaderboard
WHERE total_points > 0 OR cryptoku_high_score > 0 OR ape_in_high_score > 0
UNION ALL
SELECT 
  'Profiles with games played',
  COUNT(*)
FROM profiles
WHERE total_games_played > 0 OR total_wins > 0 OR total_losses > 0
UNION ALL
SELECT 
  'Profiles with playtime',
  COUNT(*)
FROM profiles
WHERE total_playtime > 0;

COMMIT;

-- =====================================================
-- FINAL STATUS
-- =====================================================
SELECT 
  '✅ CLEANUP COMPLETE' as status,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM game_sessions) as game_sessions_remaining,
  (SELECT COUNT(*) FROM cryptoku_leaderboard) as cryptoku_entries_remaining,
  (SELECT COUNT(*) FROM leaderboard WHERE total_points > 0) as leaderboard_entries_with_points,
  (SELECT SUM(total_games_played) FROM profiles) as total_games_played;
