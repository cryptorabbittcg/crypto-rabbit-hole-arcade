-- =====================================================
-- SIMPLE FIX: Create cryptoku_hints Table
-- =====================================================
-- Just run this - it creates the table and nothing else
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

-- Verify
SELECT 'Table created' as status, COUNT(*) as columns 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'cryptoku_hints';
