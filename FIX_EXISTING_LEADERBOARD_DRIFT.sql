-- =====================================================
-- ONE-TIME CORRECTION: Fix existing leaderboard drift
-- =====================================================
-- Run this AFTER applying FIX_UPDATE_USER_BALANCE_UPSERT.sql
-- This re-syncs leaderboard.total_points to match profiles.points
-- =====================================================

-- Option 1: Fix all users at once (recommended)
-- This ensures all leaderboard rows exist and match profiles.points
INSERT INTO leaderboard (user_id, total_points, updated_at)
SELECT 
  p.id,
  p.points,
  NOW()
FROM profiles p
WHERE p.points > 0
  AND NOT EXISTS (
    SELECT 1 FROM leaderboard l WHERE l.user_id = p.id
  )
ON CONFLICT (user_id) DO UPDATE
SET
  total_points = EXCLUDED.total_points,
  updated_at = NOW();

-- Option 2: Fix existing rows that are out of sync
-- This updates leaderboard.total_points to match profiles.points for existing rows
UPDATE leaderboard l
SET 
  total_points = p.points,
  updated_at = NOW()
FROM profiles p
WHERE l.user_id = p.id
  AND l.total_points != p.points;

-- =====================================================
-- VERIFY THE FIX
-- =====================================================
-- Run this to confirm all drift is fixed:
-- SELECT
--   p.wallet_address,
--   p.points as profile_points,
--   COALESCE(l.total_points, 0) as leaderboard_points,
--   p.points - COALESCE(l.total_points, 0) as diff,
--   CASE 
--     WHEN p.points - COALESCE(l.total_points, 0) = 0 THEN '✅ Parity OK'
--     WHEN COALESCE(l.total_points, 0) = 0 THEN '⚠️ Leaderboard row missing'
--     ELSE '❌ Drift detected'
--   END as status
-- FROM profiles p
-- LEFT JOIN leaderboard l ON l.user_id = p.id
-- WHERE p.points > 0
-- ORDER BY ABS(p.points - COALESCE(l.total_points, 0)) DESC, p.points DESC
-- LIMIT 20;
