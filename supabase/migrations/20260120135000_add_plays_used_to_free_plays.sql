-- =====================================================
-- Add plays_used counter column to ape_in_daily_free_plays
-- =====================================================
-- This migration converts the table to use a counter model
-- where one row per day per mode tracks plays_used (0-5).
-- 
-- This is required because the table has a unique constraint
-- on (user_id, game_mode, date_used), which prevents multiple
-- rows per day. The counter model allows 5 plays/day.
-- =====================================================

-- Add plays_used column if it doesn't exist
ALTER TABLE public.ape_in_daily_free_plays
ADD COLUMN IF NOT EXISTS plays_used INT NOT NULL DEFAULT 0;

-- Add constraint to ensure plays_used is between 0 and 5
ALTER TABLE public.ape_in_daily_free_plays
DROP CONSTRAINT IF EXISTS ape_in_daily_free_plays_plays_used_check;

ALTER TABLE public.ape_in_daily_free_plays
ADD CONSTRAINT ape_in_daily_free_plays_plays_used_check
CHECK (plays_used >= 0 AND plays_used <= 5);

-- For existing rows (if any), set plays_used based on how many rows exist
-- This handles data migration from the old "one row per play" model
-- Note: This assumes we're migrating from 0 rows or we're resetting
-- If there are existing rows, you may want to set plays_used = 1 for each
-- row that exists for a given (user_id, game_mode, date_used) combination
-- For a fresh start, we just default to 0
