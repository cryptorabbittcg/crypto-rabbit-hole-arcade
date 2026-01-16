-- =====================================================
-- CREATE MISSING TABLES
-- =====================================================
-- Creates tables that may be missing
-- =====================================================

-- =====================================================
-- CREATE transactions TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  
  -- Context
  description TEXT,
  related_id UUID,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);

-- =====================================================
-- CREATE leaderboard TABLE (if missing)
-- =====================================================
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Rankings by category
  total_points INTEGER DEFAULT 0,
  card_battle_wins INTEGER DEFAULT 0,
  ape_in_high_score INTEGER DEFAULT 0,
  cryptoku_high_score INTEGER DEFAULT 0,
  
  -- Overall rank (calculated)
  overall_rank INTEGER,
  
  -- Timestamps
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON leaderboard(total_points DESC);

-- =====================================================
-- VERIFY TABLES WERE CREATED
-- =====================================================
SELECT 
  'Tables verification' as check_name,
  COUNT(*) FILTER (WHERE table_name IN ('transactions', 'leaderboard', 'profiles', 'cryptoku_leaderboard', 'cryptoku_hints')) as found,
  5 as expected
FROM information_schema.tables
WHERE table_schema = 'public';

-- =====================================================
-- TEST update_user_balance AGAIN
-- =====================================================
SELECT '=== TESTING update_user_balance ===' as step;

SELECT 
  'update_user_balance test' as test_name,
  public.update_user_balance(
    (SELECT id FROM profiles LIMIT 1),
    0,   -- ape_change
    0,   -- tickets_change
    5,   -- points_change
    'test',
    'Test after creating transactions table'
  ) as result;

-- Verify transaction was recorded
SELECT 
  'Transaction verification' as check_name,
  COUNT(*) as transaction_count,
  MAX(amount) as last_amount,
  MAX(currency) as last_currency,
  MAX(transaction_type) as last_type
FROM public.transactions
WHERE user_id = (SELECT id FROM profiles LIMIT 1)
  AND transaction_type = 'test';
