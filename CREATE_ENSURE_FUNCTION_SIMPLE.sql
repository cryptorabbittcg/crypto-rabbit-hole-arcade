-- =====================================================
-- SIMPLE FIX: Create ensure_cryptoku_hints Function
-- =====================================================
-- Just run this - it creates the function
-- =====================================================

-- Drop any existing version first
DROP FUNCTION IF EXISTS ensure_cryptoku_hints(UUID);
DROP FUNCTION IF EXISTS ensure_cryptoku_hints(uuid);
DROP FUNCTION IF EXISTS public.ensure_cryptoku_hints(UUID);
DROP FUNCTION IF EXISTS public.ensure_cryptoku_hints(uuid);

-- Create the function
CREATE OR REPLACE FUNCTION ensure_cryptoku_hints(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
BEGIN
  INSERT INTO public.cryptoku_hints (user_id, hint_balance, total_ranked_completed)
  VALUES (p_user_id, 3, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Verify it was created
SELECT 
  'Function created' as status,
  p.proname,
  pg_get_function_identity_arguments(p.oid) as signature
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'ensure_cryptoku_hints';

-- Test it
SELECT ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1));

-- Verify it worked
SELECT COUNT(*) as records_created FROM cryptoku_hints;
