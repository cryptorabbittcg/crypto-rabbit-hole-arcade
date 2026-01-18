-- =====================================================
-- VERIFY STATS COLUMNS EXIST IN profiles TABLE
-- =====================================================
-- Run this to confirm all stat columns exist before fixing RPCs
-- =====================================================

-- Check if all required stat columns exist
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN (
    'total_games_played',
    'total_wins',
    'total_losses',
    'win_streak',
    'best_win_streak',
    'total_playtime'
  )
ORDER BY column_name;

-- Check all columns in profiles table (full view)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;
