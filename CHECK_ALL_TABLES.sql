-- =====================================================
-- CHECK ALL REQUIRED TABLES EXIST
-- =====================================================
-- Verify all tables needed for submit-result exist
-- =====================================================

SELECT '=== REQUIRED TABLES CHECK ===' as check_type;

WITH required_tables AS (
  SELECT unnest(ARRAY[
    'profiles',
    'cryptoku_leaderboard',
    'cryptoku_hints',
    'leaderboard',
    'game_sessions',
    'transactions'
  ]) as table_name
)
SELECT 
  rt.table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = rt.table_name
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM required_tables rt
ORDER BY rt.table_name;

-- =====================================================
-- CHECK transactions TABLE SPECIFICALLY
-- =====================================================
SELECT '=== transactions TABLE DETAIL ===' as check_type;

SELECT 
  'transactions table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'transactions'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING - NEEDS TO BE CREATED'
  END as status;

-- If table exists, show columns
SELECT 
  'transactions columns' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'transactions'
ORDER BY ordinal_position;
