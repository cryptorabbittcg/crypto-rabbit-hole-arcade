-- =====================================================
-- RESET ALL STATS FOR TESTING
-- =====================================================
-- This script resets all game stats and scores to 0
-- Use this when you want a clean slate for testing
-- 
-- WARNING: This will reset ALL user stats!
-- Only use this in development/testing environments
-- =====================================================

-- Reset all profile stats
UPDATE profiles
SET 
  -- Currency and Points
  points = 0,
  tickets = 5,  -- Reset to default
  -- Note: ape_balance is preserved (not reset)
  -- ape_balance = 1000,  -- Keep as-is (commented out)
  
  -- Stats
  total_games_played = 0,
  total_wins = 0,
  total_losses = 0,
  win_streak = 0,
  best_win_streak = 0,
  total_playtime = 0,
  
  -- Referral stats (keep or reset? Commented out to preserve)
  -- referral_count = 0,
  -- referral_earnings = 0,
  
  updated_at = NOW();

-- Reset all leaderboard entries
UPDATE leaderboard
SET 
  total_points = 0,
  card_battle_wins = 0,
  ape_in_high_score = 0,
  cryptoku_high_score = 0,
  overall_rank = NULL,
  updated_at = NOW();

-- Optional: Delete all game sessions (uncomment if you want to clear history)
-- DELETE FROM game_sessions;

-- Optional: Reset points_earned in game_sessions (keeps history but resets points)
-- UPDATE game_sessions SET points_earned = 0;

-- Optional: Delete all transactions (uncomment if you want to clear transaction history)
-- DELETE FROM transactions WHERE currency = 'points';

-- Optional: Reset points_reward in achievements (keeps achievements but resets point rewards)
-- UPDATE achievements SET points_reward = 0;

-- Verify the reset (run these queries to check)
-- SELECT wallet_address, points, total_games_played, total_wins FROM profiles;
-- SELECT user_id, total_points, cryptoku_high_score, ape_in_high_score FROM leaderboard;

