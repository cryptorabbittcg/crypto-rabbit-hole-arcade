-- =====================================================
-- VERIFY CRYPTOKU LEADERBOARD DATA
-- =====================================================
-- Check if data exists and why leaderboard might be empty
-- =====================================================

-- =====================================================
-- CHECK 1: Count entries in cryptoku_leaderboard
-- =====================================================
SELECT 
  'Total entries' as check_name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN completed = TRUE THEN 1 END) as completed_count,
  COUNT(CASE WHEN forfeited = FALSE THEN 1 END) as not_forfeited_count,
  COUNT(CASE WHEN mode IN ('DEGEN', 'APE') THEN 1 END) as ranked_mode_count,
  COUNT(CASE WHEN completed = TRUE AND forfeited = FALSE AND mode IN ('DEGEN', 'APE') THEN 1 END) as eligible_count
FROM public.cryptoku_leaderboard;

-- =====================================================
-- CHECK 2: Show recent entries
-- =====================================================
SELECT 
  'Recent entries' as check_name,
  run_id,
  mode,
  score,
  completed,
  forfeited,
  created_at
FROM public.cryptoku_leaderboard
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- CHECK 3: Test get_cryptoku_leaderboard function
-- =====================================================
SELECT 
  'Test DEGEN mode' as check_name,
  rank,
  run_id,
  wallet_address,
  mode,
  score,
  time_seconds
FROM public.get_cryptoku_leaderboard('DEGEN', 10)
LIMIT 5;

SELECT 
  'Test APE mode' as check_name,
  rank,
  run_id,
  wallet_address,
  mode,
  score,
  time_seconds
FROM public.get_cryptoku_leaderboard('APE', 10)
LIMIT 5;

SELECT 
  'Test ALL mode' as check_name,
  rank,
  run_id,
  wallet_address,
  mode,
  score,
  time_seconds
FROM public.get_cryptoku_leaderboard('ALL', 10)
LIMIT 5;

-- =====================================================
-- CHECK 4: Verify RLS policies
-- =====================================================
SELECT 
  'RLS policies' as check_name,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'cryptoku_leaderboard';

-- =====================================================
-- CHECK 5: Check if function exists and has correct signature
-- =====================================================
SELECT 
  'Function check' as check_name,
  proname,
  pg_get_function_arguments(p.oid) as arguments,
  CASE WHEN prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_cryptoku_leaderboard';
