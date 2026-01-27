-- =====================================================
-- APE IN PVP MODE - RLS POLICIES
-- =====================================================
-- Row Level Security policies for PvP tables
-- Phase 1: matching infrastructure

-- =====================================================
-- APE_IN_PVP_MATCHES RLS
-- =====================================================
ALTER TABLE ape_in_pvp_matches ENABLE ROW LEVEL SECURITY;

-- SELECT: Server-only reads (all reads via API routes with service-role)
-- NOTE: App uses wallet → profiles.id, not Supabase auth.uid()
-- API routes enforce participant checks server-side
CREATE POLICY "No client match reads"
ON ape_in_pvp_matches FOR SELECT
USING (false);

-- INSERT: BLOCKED for clients (all inserts via server API routes with service-role)
CREATE POLICY "Clients cannot insert matches"
ON ape_in_pvp_matches FOR INSERT
WITH CHECK (false);

-- UPDATE: BLOCKED for clients (all updates via server API routes with service-role)
CREATE POLICY "Clients cannot update match state"
ON ape_in_pvp_matches FOR UPDATE
USING (false)
WITH CHECK (false);

-- DELETE: BLOCKED for clients (matches archived, not deleted)
CREATE POLICY "Clients cannot delete matches"
ON ape_in_pvp_matches FOR DELETE
USING (false);

-- =====================================================
-- APE_IN_PVP_LEADERBOARD RLS
-- =====================================================
ALTER TABLE ape_in_pvp_leaderboard ENABLE ROW LEVEL SECURITY;

-- SELECT: Public read (anyone can view leaderboard)
CREATE POLICY "Public can view leaderboard"
ON ape_in_pvp_leaderboard FOR SELECT
USING (true);

-- INSERT: Server-only (via service-role)
CREATE POLICY "Clients cannot insert leaderboard"
ON ape_in_pvp_leaderboard FOR INSERT
WITH CHECK (false);

-- UPDATE: Server-only (via service-role)
CREATE POLICY "Clients cannot update leaderboard"
ON ape_in_pvp_leaderboard FOR UPDATE
USING (false)
WITH CHECK (false);

-- DELETE: Server-only (via service-role)
CREATE POLICY "Clients cannot delete leaderboard"
ON ape_in_pvp_leaderboard FOR DELETE
USING (false);
