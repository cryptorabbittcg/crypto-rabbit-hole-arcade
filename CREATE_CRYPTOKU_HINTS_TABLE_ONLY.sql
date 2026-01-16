-- =====================================================
-- STEP 1: CREATE cryptoku_hints TABLE
-- =====================================================
-- Run this FIRST - just creates the table
-- =====================================================

CREATE TABLE IF NOT EXISTS cryptoku_hints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Hint balance and rewards
  hint_balance INTEGER DEFAULT 3 NOT NULL CHECK (hint_balance >= 0),
  total_ranked_completed INTEGER DEFAULT 0 NOT NULL CHECK (total_ranked_completed >= 0),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_cryptoku_hints_user ON cryptoku_hints(user_id);

-- Enable RLS
ALTER TABLE cryptoku_hints ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFY TABLE WAS CREATED
-- =====================================================
SELECT 
  'Table created successfully' as status,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'cryptoku_hints';
