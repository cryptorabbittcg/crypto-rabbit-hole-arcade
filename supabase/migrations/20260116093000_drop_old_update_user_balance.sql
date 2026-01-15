-- =====================================================
-- Drop Old update_user_balance Function
-- =====================================================
-- This migration drops the old version of update_user_balance
-- that has the wrong parameter name (p_ticket_change singular)
-- and is missing p_transaction_type and p_description.
--
-- The correct version with p_tickets_change (plural) and
-- all 6 parameters should remain.
-- =====================================================

-- Drop the old function with wrong signature
-- This is the version with p_ticket_change (singular) and missing params
DROP FUNCTION IF EXISTS public.update_user_balance(
  p_user_id uuid,
  p_ape_change integer,
  p_ticket_change integer,  -- OLD: singular, wrong name
  p_points_change integer
);

-- Verify only the correct function remains
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'update_user_balance';
  
  IF func_count = 1 THEN
    RAISE NOTICE 'Success: Only one update_user_balance function remains (the correct one)';
  ELSIF func_count = 0 THEN
    RAISE WARNING 'Warning: No update_user_balance function found!';
  ELSE
    RAISE WARNING 'Warning: Multiple update_user_balance functions still exist: %', func_count;
  END IF;
END $$;

-- =====================================================
-- Verify the correct function exists
-- =====================================================
-- Run this query to verify only the correct function exists:
--
-- SELECT 
--   p.proname as function_name,
--   pg_get_function_identity_arguments(p.oid) as arguments,
--   CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND p.proname = 'update_user_balance';
--
-- Expected: Only ONE row with:
--   arguments: p_user_id uuid, p_ape_change integer, p_tickets_change integer, p_points_change integer, p_transaction_type text, p_description text
--   security: SECURITY DEFINER
-- =====================================================

-- =====================================================
-- ROLLBACK SECTION (COMMENTED)
-- =====================================================
-- To rollback this migration (NOT RECOMMENDED):
--
-- -- Recreate the old function (this would break things)
-- CREATE OR REPLACE FUNCTION update_user_balance(
--   p_user_id UUID,
--   p_ape_change INTEGER DEFAULT 0,
--   p_ticket_change INTEGER DEFAULT 0,  -- OLD: wrong name
--   p_points_change INTEGER DEFAULT 0
-- )
-- RETURNS VOID
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = 'pg_catalog, public'
-- AS $$
-- BEGIN
--   UPDATE profiles
--   SET 
--     ape_balance = GREATEST(0, ape_balance + p_ape_change),
--     tickets = GREATEST(0, tickets + p_ticket_change),
--     points = GREATEST(0, points + p_points_change)
--   WHERE id = p_user_id;
-- END;
-- $$;
--
-- NOTE: Rolling back is NOT RECOMMENDED as the old function
--       has the wrong parameter name and is missing required parameters.
-- =====================================================
