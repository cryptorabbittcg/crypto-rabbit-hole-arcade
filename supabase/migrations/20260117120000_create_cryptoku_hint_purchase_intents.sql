-- =====================================================
-- Create cryptoku_hint_purchase_intents Table
-- =====================================================
-- This migration creates the cryptoku_hint_purchase_intents table
-- for tracking hint purchase intents before transaction verification.
-- =====================================================

-- =====================================================
-- CRYPTOKU HINT PURCHASE INTENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cryptoku_hint_purchase_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  intent_id TEXT UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  hints_amount INTEGER NOT NULL CHECK (hints_amount > 0),
  price_wei TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  tx_hash TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_hint_intents_status ON cryptoku_hint_purchase_intents(status);
CREATE INDEX IF NOT EXISTS idx_hint_intents_wallet_address ON cryptoku_hint_purchase_intents(wallet_address);
CREATE INDEX IF NOT EXISTS idx_hint_intents_expires_at ON cryptoku_hint_purchase_intents(expires_at);
CREATE INDEX IF NOT EXISTS idx_hint_intents_user_id ON cryptoku_hint_purchase_intents(user_id);

-- Add comments
COMMENT ON TABLE cryptoku_hint_purchase_intents IS 'Stores hint purchase intents for Cryptoku game before transaction verification';
COMMENT ON COLUMN cryptoku_hint_purchase_intents.intent_id IS 'Unique, unguessable identifier for the purchase intent';
COMMENT ON COLUMN cryptoku_hint_purchase_intents.status IS 'Intent status: pending (awaiting tx), completed (tx verified), expired (past expires_at)';
COMMENT ON COLUMN cryptoku_hint_purchase_intents.tx_hash IS 'Transaction hash from blockchain (unique, set when completed)';

-- Enable RLS
ALTER TABLE cryptoku_hint_purchase_intents ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================
-- Security: No SELECT policy for anon/authenticated users
-- All intent reads must go through server routes using createAdminClient()
-- This prevents exposing wallet addresses, tx hashes, and intent IDs to unauthorized users
-- 
-- Admin operations (insert/update/select) are handled via createAdminClient() with service role key
-- No policies needed as API routes use admin client which bypasses RLS
