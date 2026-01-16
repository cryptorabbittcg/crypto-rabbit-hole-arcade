-- =====================================================
-- RECREATE TABLE AND FUNCTION TOGETHER
-- =====================================================
-- This ensures table exists before function is created
-- =====================================================

-- =====================================================
-- STEP 1: Drop function first (if exists)
-- =====================================================
DROP FUNCTION IF EXISTS ensure_cryptoku_hints(UUID);
DROP FUNCTION IF EXISTS ensure_cryptoku_hints(uuid);

-- =====================================================
-- STEP 2: Create table (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS cryptoku_hints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  hint_balance INTEGER DEFAULT 3 NOT NULL CHECK (hint_balance >= 0),
  total_ranked_completed INTEGER DEFAULT 0 NOT NULL CHECK (total_ranked_completed >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cryptoku_hints_user ON cryptoku_hints(user_id);
ALTER TABLE cryptoku_hints ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Verify table exists
-- =====================================================
SELECT 
  'Table verification' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'cryptoku_hints'
    ) THEN '✅ TABLE EXISTS'
    ELSE '❌ TABLE MISSING'
  END as status;

-- =====================================================
-- STEP 4: Create function AFTER table exists
-- =====================================================
CREATE FUNCTION ensure_cryptoku_hints(p_user_id UUID)
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

-- =====================================================
-- STEP 5: Test function immediately
-- =====================================================
SELECT 
  'Function test' as check_name,
  ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1)) as result,
  '✅ Should return: (no error)' as expected;

-- =====================================================
-- STEP 6: Verify record was created
-- =====================================================
SELECT 
  'Record verification' as check_name,
  COUNT(*) as record_count
FROM public.cryptoku_hints
WHERE user_id = (SELECT id FROM profiles LIMIT 1);
