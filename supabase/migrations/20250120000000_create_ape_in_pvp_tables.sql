-- =====================================================
-- APE IN PVP MODE - PHASE 1 TABLES
-- =====================================================
-- Creates tables for PvP matchmaking and leaderboard
-- Phase 1 only: matching infrastructure

-- =====================================================
-- APE_IN_PVP_MATCHES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ape_in_pvp_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Players (join order, NOT turn order)
  player1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Every match must have player1
  player2_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Nullable: waiting matches have no player2 yet
  player1_address TEXT NOT NULL,
  player2_address TEXT, -- Nullable: waiting matches have no player2 yet
  player1_name TEXT,
  player2_name TEXT, -- Nullable: waiting matches have no player2 yet
  player1_avatar_url TEXT,
  player2_avatar_url TEXT, -- Nullable: waiting matches have no player2 yet
  
  -- Match details
  match_code TEXT UNIQUE, -- For private matches (nullable)
  match_type TEXT DEFAULT 'public', -- 'public' or 'private'
  match_status TEXT DEFAULT 'waiting', -- 'waiting', 'rolling_for_first', 'in_progress', 'completed', 'forfeited', 'abandoned'
  
  -- First player selection (server precomputed, revealed on trigger)
  first_roll_seat1 INTEGER, -- Precomputed d6 roll for seat1 (revealed when player clicks)
  first_roll_seat2 INTEGER, -- Precomputed d6 roll for seat2 (revealed when player clicks)
  first_roll_revealed_seat1 BOOLEAN DEFAULT FALSE, -- Has seat1 revealed their roll?
  first_roll_revealed_seat2 BOOLEAN DEFAULT FALSE, -- Has seat2 revealed their roll?
  
  -- Game state (JSONB with strict schema - see plan)
  game_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Results
  winner_id UUID REFERENCES profiles(id),
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  player1_points INTEGER DEFAULT 0, -- Leaderboard points (idempotent write guard)
  player2_points INTEGER DEFAULT 0,
  forfeited_by UUID REFERENCES profiles(id), -- If forfeited
  points_awarded_at TIMESTAMP WITH TIME ZONE, -- Idempotency guard
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  last_action_at TIMESTAMP WITH TIME ZONE, -- For abandonment timeout detection
  
  CHECK (player1_id != player2_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ape_in_pvp_matches_status ON ape_in_pvp_matches(match_status);
CREATE INDEX IF NOT EXISTS idx_ape_in_pvp_matches_code ON ape_in_pvp_matches(match_code);
CREATE INDEX IF NOT EXISTS idx_ape_in_pvp_matches_players ON ape_in_pvp_matches(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_ape_in_pvp_matches_waiting ON ape_in_pvp_matches(match_status, match_type, created_at) WHERE match_status = 'waiting' AND match_type = 'public';

-- =====================================================
-- APE_IN_PVP_LEADERBOARD TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ape_in_pvp_leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Stats
  total_matches INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  forfeits INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0, -- Win=2, Loss=1, Forfeit=0
  
  -- Win rate
  win_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage
  
  -- Timestamps
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_played_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ape_in_pvp_leaderboard_points ON ape_in_pvp_leaderboard(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_ape_in_pvp_leaderboard_win_rate ON ape_in_pvp_leaderboard(win_rate DESC);

-- Comments
COMMENT ON TABLE ape_in_pvp_matches IS 'Ape In PvP matches - Phase 1: matching infrastructure';
COMMENT ON TABLE ape_in_pvp_leaderboard IS 'Ape In PvP leaderboard - tracks wins, losses, points';
