-- =====================================================
-- SIMPLE: Just Create the Function
-- =====================================================
-- Copy and paste this entire block
-- =====================================================

CREATE OR REPLACE FUNCTION public.ensure_cryptoku_hints(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
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
  proname,
  pg_get_function_identity_arguments(oid) as signature
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'ensure_cryptoku_hints';
