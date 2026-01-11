-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================
-- This script sets up RLS policies to protect user data
-- Execute after creating tables

-- Enable RLS on all tables
-- Note: For wallet-based authentication (not Supabase Auth), we disable RLS on profiles
-- since we can't easily set app.current_user_wallet session variables.
-- Application code validates wallet ownership instead.
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE card_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrades_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pvp_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE raid_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_openings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================
-- RLS is DISABLED for profiles table (see above)
-- This is because we use wallet-based authentication, not Supabase Auth
-- Application code validates wallet ownership for security
-- No policies needed when RLS is disabled

-- =====================================================
-- CARD INVENTORY POLICIES
-- =====================================================
-- Users can only see their own cards
DROP POLICY IF EXISTS "Users can view own cards" ON card_inventory;
CREATE POLICY "Users can view own cards"
  ON card_inventory FOR SELECT
  USING (user_id::text = current_setting('app.current_user_id', true));

-- Users can insert their own cards
DROP POLICY IF EXISTS "Users can insert own cards" ON card_inventory;
CREATE POLICY "Users can insert own cards"
  ON card_inventory FOR INSERT
  WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

-- Users can update their own cards
DROP POLICY IF EXISTS "Users can update own cards" ON card_inventory;
CREATE POLICY "Users can update own cards"
  ON card_inventory FOR UPDATE
  USING (user_id::text = current_setting('app.current_user_id', true));

-- =====================================================
-- UPGRADES INVENTORY POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view own upgrades" ON upgrades_inventory;
CREATE POLICY "Users can view own upgrades"
  ON upgrades_inventory FOR SELECT
  USING (user_id::text = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can insert own upgrades" ON upgrades_inventory;
CREATE POLICY "Users can insert own upgrades"
  ON upgrades_inventory FOR INSERT
  WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can update own upgrades" ON upgrades_inventory;
CREATE POLICY "Users can update own upgrades"
  ON upgrades_inventory FOR UPDATE
  USING (user_id::text = current_setting('app.current_user_id', true));

-- =====================================================
-- GAME SESSIONS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view own game sessions" ON game_sessions;
CREATE POLICY "Users can view own game sessions"
  ON game_sessions FOR SELECT
  USING (user_id::text = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can insert own game sessions" ON game_sessions;
CREATE POLICY "Users can insert own game sessions"
  ON game_sessions FOR INSERT
  WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can update own game sessions" ON game_sessions;
CREATE POLICY "Users can update own game sessions"
  ON game_sessions FOR UPDATE
  USING (user_id::text = current_setting('app.current_user_id', true));

-- =====================================================
-- PVP MATCHES POLICIES
-- =====================================================
-- Users can view matches they're involved in
DROP POLICY IF EXISTS "Users can view own matches" ON pvp_matches;
CREATE POLICY "Users can view own matches"
  ON pvp_matches FOR SELECT
  USING (
    player1_id::text = current_setting('app.current_user_id', true) OR
    player2_id::text = current_setting('app.current_user_id', true)
  );

-- Users can create matches
DROP POLICY IF EXISTS "Users can create matches" ON pvp_matches;
CREATE POLICY "Users can create matches"
  ON pvp_matches FOR INSERT
  WITH CHECK (
    player1_id::text = current_setting('app.current_user_id', true) OR
    player2_id::text = current_setting('app.current_user_id', true)
  );

-- Users can update matches they're involved in
DROP POLICY IF EXISTS "Users can update own matches" ON pvp_matches;
CREATE POLICY "Users can update own matches"
  ON pvp_matches FOR UPDATE
  USING (
    player1_id::text = current_setting('app.current_user_id', true) OR
    player2_id::text = current_setting('app.current_user_id', true)
  );

-- =====================================================
-- MATCH HISTORY POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view own match history" ON match_history;
CREATE POLICY "Users can view own match history"
  ON match_history FOR SELECT
  USING (user_id::text = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can insert own match history" ON match_history;
CREATE POLICY "Users can insert own match history"
  ON match_history FOR INSERT
  WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

-- =====================================================
-- TRANSACTIONS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (user_id::text = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

-- =====================================================
-- LEADERBOARD POLICIES
-- =====================================================
-- Everyone can view leaderboard
DROP POLICY IF EXISTS "Leaderboard is viewable by everyone" ON leaderboard;
CREATE POLICY "Leaderboard is viewable by everyone"
  ON leaderboard FOR SELECT
  USING (true);

-- Users can insert their own leaderboard entry
DROP POLICY IF EXISTS "Users can insert own leaderboard entry" ON leaderboard;
CREATE POLICY "Users can insert own leaderboard entry"
  ON leaderboard FOR INSERT
  WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

-- Users can update their own leaderboard entry
DROP POLICY IF EXISTS "Users can update own leaderboard entry" ON leaderboard;
CREATE POLICY "Users can update own leaderboard entry"
  ON leaderboard FOR UPDATE
  USING (user_id::text = current_setting('app.current_user_id', true));

-- =====================================================
-- ACHIEVEMENTS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view own achievements" ON achievements;
CREATE POLICY "Users can view own achievements"
  ON achievements FOR SELECT
  USING (user_id::text = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can insert own achievements" ON achievements;
CREATE POLICY "Users can insert own achievements"
  ON achievements FOR INSERT
  WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

-- =====================================================
-- SOCIAL RAIDS POLICIES
-- =====================================================
-- Everyone can view active raids
DROP POLICY IF EXISTS "Active raids are viewable by everyone" ON social_raids;
CREATE POLICY "Active raids are viewable by everyone"
  ON social_raids FOR SELECT
  USING (is_active = true);

-- =====================================================
-- RAID PARTICIPATION POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view own raid participation" ON raid_participation;
CREATE POLICY "Users can view own raid participation"
  ON raid_participation FOR SELECT
  USING (user_id::text = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can insert own raid participation" ON raid_participation;
CREATE POLICY "Users can insert own raid participation"
  ON raid_participation FOR INSERT
  WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can update own raid participation" ON raid_participation;
CREATE POLICY "Users can update own raid participation"
  ON raid_participation FOR UPDATE
  USING (user_id::text = current_setting('app.current_user_id', true));

-- =====================================================
-- PACK OPENINGS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view own pack openings" ON pack_openings;
CREATE POLICY "Users can view own pack openings"
  ON pack_openings FOR SELECT
  USING (user_id::text = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can insert own pack openings" ON pack_openings;
CREATE POLICY "Users can insert own pack openings"
  ON pack_openings FOR INSERT
  WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

-- =====================================================
-- APE IN GAME STATES POLICIES
-- =====================================================
-- Allow public read/write for game states (API uses anon key)
-- Games are identified by game_id, not user_id, so we allow all access
ALTER TABLE ape_in_game_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view game states" ON ape_in_game_states;
CREATE POLICY "Anyone can view game states"
  ON ape_in_game_states FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert game states" ON ape_in_game_states;
CREATE POLICY "Anyone can insert game states"
  ON ape_in_game_states FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update game states" ON ape_in_game_states;
CREATE POLICY "Anyone can update game states"
  ON ape_in_game_states FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Anyone can delete game states" ON ape_in_game_states;
CREATE POLICY "Anyone can delete game states"
  ON ape_in_game_states FOR DELETE
  USING (true);
