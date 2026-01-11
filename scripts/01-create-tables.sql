-- =====================================================
-- CRYPTO RABBIT HOLE ARCADE - DATABASE SCHEMA
-- =====================================================
-- This script creates all necessary tables for the arcade platform
-- Execute this first before other scripts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
-- Stores user profile information and game stats
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  avatar_url TEXT,
  
  -- Game currency and resources
  ape_balance INTEGER DEFAULT 1000,
  tickets INTEGER DEFAULT 5,
  points INTEGER DEFAULT 0,
  
  -- Stats
  total_games_played INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  win_streak INTEGER DEFAULT 0,
  best_win_streak INTEGER DEFAULT 0,
  
  -- Playtime tracking (in seconds)
  total_playtime INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CARD INVENTORY TABLE
-- =====================================================
-- Stores user's card collection
CREATE TABLE IF NOT EXISTS card_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Card details
  card_number INTEGER NOT NULL,
  card_name TEXT NOT NULL,
  card_type TEXT NOT NULL, -- 'common', 'rare', 'epic', 'legendary'
  attack INTEGER NOT NULL,
  defense INTEGER NOT NULL,
  
  -- Card state
  is_staked BOOLEAN DEFAULT FALSE,
  stake_start_time TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, card_number)
);

-- =====================================================
-- UPGRADES INVENTORY TABLE
-- =====================================================
-- Stores purchased upgrades that haven't been used yet
CREATE TABLE IF NOT EXISTS upgrades_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Upgrade details
  upgrade_type TEXT NOT NULL, -- 'attack_booster', 'defense_shield', 'health_badge', etc.
  upgrade_name TEXT NOT NULL,
  upgrade_cost INTEGER NOT NULL,
  
  -- Metadata
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- GAME SESSIONS TABLE
-- =====================================================
-- Tracks all game sessions across different games
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Game info
  game_type TEXT NOT NULL, -- 'card_battle', 'ape_in', 'cryptoku', etc.
  game_mode TEXT, -- 'ai', 'pvp', 'solo', etc.
  
  -- Session details
  duration INTEGER, -- in seconds
  score INTEGER DEFAULT 0,
  result TEXT, -- 'won', 'lost', 'draw', 'abandoned'
  
  -- Rewards
  ape_earned INTEGER DEFAULT 0,
  tickets_earned INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- PVP MATCHES TABLE
-- =====================================================
-- Tracks PvP card battle matches
CREATE TABLE IF NOT EXISTS pvp_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Players
  player1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Match details
  winner_id UUID REFERENCES profiles(id),
  match_status TEXT DEFAULT 'waiting', -- 'waiting', 'in_progress', 'completed', 'abandoned'
  
  -- Game state (stored as JSONB for flexibility)
  game_state JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  
  CHECK (player1_id != player2_id)
);

-- =====================================================
-- MATCH HISTORY TABLE
-- =====================================================
-- Detailed history of card battle matches
CREATE TABLE IF NOT EXISTS match_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES pvp_matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Match details
  opponent_id UUID REFERENCES profiles(id),
  card_used INTEGER, -- card number
  result TEXT NOT NULL, -- 'won', 'lost', 'draw'
  
  -- Stats
  damage_dealt INTEGER DEFAULT 0,
  damage_taken INTEGER DEFAULT 0,
  upgrades_used TEXT[], -- array of upgrade types used
  
  -- Rewards
  ape_earned INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  
  -- Timestamp
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TRANSACTIONS TABLE
-- =====================================================
-- Tracks all APE/ticket transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type TEXT NOT NULL, -- 'pack_purchase', 'upgrade_purchase', 'reward', 'stake_reward', etc.
  amount INTEGER NOT NULL, -- positive for earning, negative for spending
  currency TEXT NOT NULL, -- 'ape', 'tickets', 'points'
  
  -- Context
  description TEXT,
  related_id UUID, -- reference to related record (game_session, upgrade, etc.)
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- LEADERBOARD TABLE
-- =====================================================
-- Stores leaderboard rankings
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Rankings by category
  total_points INTEGER DEFAULT 0,
  card_battle_wins INTEGER DEFAULT 0,
  ape_in_high_score INTEGER DEFAULT 0,
  cryptoku_high_score INTEGER DEFAULT 0,
  
  -- Overall rank (calculated)
  overall_rank INTEGER,
  
  -- Timestamps
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- =====================================================
-- ACHIEVEMENTS TABLE
-- =====================================================
-- Tracks user achievements
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Achievement details
  achievement_type TEXT NOT NULL, -- 'first_win', 'win_streak_5', 'collector', etc.
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  
  -- Rewards
  ape_reward INTEGER DEFAULT 0,
  points_reward INTEGER DEFAULT 0,
  
  -- Timestamp
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_type)
);

-- =====================================================
-- SOCIAL RAIDS TABLE
-- =====================================================
-- Tracks social raid participation
CREATE TABLE IF NOT EXISTS social_raids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Raid details
  raid_name TEXT NOT NULL,
  raid_type TEXT NOT NULL, -- 'twitter', 'discord', 'telegram', etc.
  raid_url TEXT,
  raid_description TEXT,
  
  -- Rewards
  ape_reward INTEGER DEFAULT 50,
  points_reward INTEGER DEFAULT 100,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- RAID PARTICIPATION TABLE
-- =====================================================
-- Tracks which users completed which raids
CREATE TABLE IF NOT EXISTS raid_participation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  raid_id UUID REFERENCES social_raids(id) ON DELETE CASCADE,
  
  -- Participation details
  completed BOOLEAN DEFAULT FALSE,
  proof_url TEXT, -- optional proof of completion
  
  -- Timestamps
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(user_id, raid_id)
);

-- =====================================================
-- PACK OPENINGS TABLE
-- =====================================================
-- Tracks pack opening history
CREATE TABLE IF NOT EXISTS pack_openings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Pack details
  pack_type TEXT DEFAULT 'standard', -- 'standard', 'premium', etc.
  cards_pulled INTEGER[], -- array of card numbers pulled
  
  -- Cost
  tickets_spent INTEGER DEFAULT 1,
  
  -- Timestamp
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_card_inventory_user ON card_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_card_inventory_staked ON card_inventory(user_id, is_staked);
CREATE INDEX IF NOT EXISTS idx_upgrades_inventory_user ON upgrades_inventory(user_id, is_used);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_type ON game_sessions(game_type);
CREATE INDEX IF NOT EXISTS idx_pvp_matches_players ON pvp_matches(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_pvp_matches_status ON pvp_matches(match_status);
CREATE INDEX IF NOT EXISTS idx_match_history_user ON match_history(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON leaderboard(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_raid_participation_user ON raid_participation(user_id);

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to leaderboard table
DROP TRIGGER IF EXISTS update_leaderboard_updated_at ON leaderboard;
CREATE TRIGGER update_leaderboard_updated_at
  BEFORE UPDATE ON leaderboard
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE profiles IS 'User profiles with game stats and currency';
COMMENT ON TABLE card_inventory IS 'User card collections';
COMMENT ON TABLE upgrades_inventory IS 'Purchased upgrades not yet used';
COMMENT ON TABLE game_sessions IS 'All game session records';
COMMENT ON TABLE pvp_matches IS 'PvP card battle matches';
COMMENT ON TABLE match_history IS 'Detailed match history';
COMMENT ON TABLE transactions IS 'All currency transactions';
COMMENT ON TABLE leaderboard IS 'Player rankings';
COMMENT ON TABLE achievements IS 'User achievements';
COMMENT ON TABLE social_raids IS 'Available social raids';
COMMENT ON TABLE raid_participation IS 'User raid participation';
COMMENT ON TABLE pack_openings IS 'Pack opening history';
