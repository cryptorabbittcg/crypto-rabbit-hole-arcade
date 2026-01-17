-- =====================================================
-- VERIFY COMPLETE LEADERBOARD SETUP
-- =====================================================
-- Verify all components are working after fixes
-- =====================================================

-- =====================================================
-- CHECK 1: Verify get_leaderboard returns win_streak
-- =====================================================
SELECT 
  'get_leaderboard function' as check_name,
  proname,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%win_streak%' THEN '✅ Returns win_streak'
    ELSE '❌ Missing win_streak - Run FIX_LEADERBOARD_DISPLAYS.sql'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_leaderboard';

-- =====================================================
-- CHECK 2: Check if profiles have wins/streak data
-- =====================================================
SELECT 
  'Profile wins/streak data' as check_name,
  p.wallet_address,
  p.total_wins,
  p.win_streak,
  p.total_games_played,
  l.total_points,
  CASE 
    WHEN p.total_wins > 0 OR p.win_streak > 0 THEN '✅ Has wins/streak data'
    WHEN p.total_games_played > 0 THEN '⚠️ Games played but no wins recorded'
    ELSE 'ℹ️ No games played yet'
  END as status
FROM profiles p
LEFT JOIN leaderboard l ON p.id = l.user_id
WHERE p.wallet_address IN (
  '0x1234567890123456789012345678901234567890',
  '0x431e3ca238fe4af6de90078f0acd688ff19f2968'
)
ORDER BY COALESCE(l.total_points, 0) DESC
LIMIT 5;

-- =====================================================
-- CHECK 3: Verify cryptoku_leaderboard table
-- =====================================================
SELECT 
  'Cryptoku leaderboard table' as check_name,
  COUNT(*) as total_entries,
  COUNT(CASE WHEN completed = TRUE AND forfeited = FALSE AND mode IN ('DEGEN', 'APE') THEN 1 END) as ranked_entries,
  COUNT(CASE WHEN mode = 'DEGEN' THEN 1 END) as degen_entries,
  COUNT(CASE WHEN mode = 'APE' THEN 1 END) as ape_entries
FROM cryptoku_leaderboard;

-- =====================================================
-- CHECK 4: Test get_cryptoku_leaderboard function
-- =====================================================
SELECT 
  'Test get_cryptoku_leaderboard (DEGEN)' as check_name,
  COUNT(*) as entry_count
FROM get_cryptoku_leaderboard('DEGEN', 10);

SELECT 
  'Test get_cryptoku_leaderboard (APE)' as check_name,
  COUNT(*) as entry_count
FROM get_cryptoku_leaderboard('APE', 10);

SELECT 
  'Test get_cryptoku_leaderboard (ALL)' as check_name,
  COUNT(*) as entry_count
FROM get_cryptoku_leaderboard('ALL', 10);

-- =====================================================
-- CHECK 5: Show sample Cryptoku leaderboard entries
-- =====================================================
SELECT 
  'Sample Cryptoku entries' as check_name,
  rank,
  wallet_address,
  mode,
  score,
  time_seconds,
  hints_used,
  errors
FROM get_cryptoku_leaderboard('ALL', 5)
LIMIT 5;

-- =====================================================
-- CHECK 6: Verify all functions have SECURITY DEFINER
-- =====================================================
SELECT 
  'Function security' as check_name,
  proname,
  CASE WHEN prosecdef THEN '✅ SECURITY DEFINER' ELSE '❌ SECURITY INVOKER' END as security,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%search_path%' THEN '✅ Has search_path'
    ELSE '❌ Missing search_path'
  END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'get_leaderboard',
    'add_cryptoku_leaderboard_entry',
    'get_cryptoku_leaderboard',
    'update_user_balance'
  )
ORDER BY proname;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================
SELECT 
  '=== SETUP STATUS ===' as summary,
  (SELECT COUNT(*) FROM cryptoku_leaderboard) as cryptoku_entries,
  (SELECT COUNT(*) FROM profiles p WHERE p.total_wins > 0 OR p.win_streak > 0) as profiles_with_wins,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'get_leaderboard' AND pg_get_functiondef(p.oid) LIKE '%win_streak%') > 0
    THEN '✅ get_leaderboard has win_streak'
    ELSE '⚠️ Run FIX_LEADERBOARD_DISPLAYS.sql'
  END as win_streak_status,
  CASE 
    WHEN (SELECT COUNT(*) FROM cryptoku_leaderboard) > 0
    THEN '✅ Cryptoku leaderboard has data'
    ELSE 'ℹ️ No Cryptoku entries yet (play a game to add)'
  END as cryptoku_data_status;
