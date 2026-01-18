-- =====================================================
-- VERIFY POINTS PARITY BETWEEN profiles.points AND leaderboard.total_points
-- =====================================================
-- Run this in Supabase SQL Editor to check for drift
-- =====================================================

-- Check for drift between profiles.points and leaderboard.total_points
SELECT
  p.wallet_address,
  p.points as profile_points,
  COALESCE(l.total_points, 0) as leaderboard_points,
  p.points - COALESCE(l.total_points, 0) as diff,
  CASE 
    WHEN p.points - COALESCE(l.total_points, 0) = 0 THEN '✅ Parity OK'
    WHEN COALESCE(l.total_points, 0) = 0 THEN '⚠️ Leaderboard row missing'
    ELSE '❌ Drift detected'
  END as status
FROM profiles p
LEFT JOIN leaderboard l ON l.user_id = p.id
WHERE p.points > 0  -- Only check users with points
ORDER BY ABS(p.points - COALESCE(l.total_points, 0)) DESC, p.points DESC
LIMIT 20;

-- Check specific wallet (replace with your wallet address)
-- SELECT
--   p.wallet_address,
--   p.points as profile_points,
--   COALESCE(l.total_points, 0) as leaderboard_points,
--   p.points - COALESCE(l.total_points, 0) as diff
-- FROM profiles p
-- LEFT JOIN leaderboard l ON l.user_id = p.id
-- WHERE p.wallet_address = '<YOUR_WALLET_ADDRESS>';

-- One-time correction: Re-sync leaderboard.total_points to match profiles.points
-- Run this ONLY if drift is confirmed and after fixing update_user_balance
-- UPDATE leaderboard l
-- SET total_points = p.points
-- FROM profiles p
-- WHERE l.user_id = p.id;
