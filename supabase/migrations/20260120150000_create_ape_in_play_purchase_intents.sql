-- =====================================================
-- Create ape_in_play_purchase_intents Table
-- =====================================================
-- This migration creates the ape_in_play_purchase_intents table
-- for tracking play purchase intents before transaction verification.
-- =====================================================

-- =====================================================
-- APE IN PLAY PURCHASE INTENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ape_in_play_purchase_intents (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  intent_id TEXT UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  game_mode TEXT NULL, -- For analytics only (not used in verification)
  plays_amount INT NOT NULL CHECK (plays_amount > 0),
  price_wei TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
  tx_hash TEXT UNIQUE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NULL
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ape_in_play_intents_status ON public.ape_in_play_purchase_intents(status);
CREATE INDEX IF NOT EXISTS idx_ape_in_play_intents_wallet_address ON public.ape_in_play_purchase_intents(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ape_in_play_intents_expires_at ON public.ape_in_play_purchase_intents(expires_at);
CREATE INDEX IF NOT EXISTS idx_ape_in_play_intents_user_id ON public.ape_in_play_purchase_intents(user_id);

-- Add comments
COMMENT ON TABLE public.ape_in_play_purchase_intents IS 'Stores play purchase intents for Ape In game before transaction verification';
COMMENT ON COLUMN public.ape_in_play_purchase_intents.intent_id IS 'Unique, unguessable identifier for the purchase intent';
COMMENT ON COLUMN public.ape_in_play_purchase_intents.status IS 'Intent status: pending (awaiting tx), completed (tx verified), expired (past expires_at), failed (verification failed)';
COMMENT ON COLUMN public.ape_in_play_purchase_intents.tx_hash IS 'Transaction hash from blockchain (unique, set when completed)';
COMMENT ON COLUMN public.ape_in_play_purchase_intents.game_mode IS 'Game mode for analytics only (not used in verification)';

-- Enable RLS
ALTER TABLE public.ape_in_play_purchase_intents ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================
-- Security: No SELECT policy for anon/authenticated users
-- All intent reads must go through server routes using createAdminClient()
-- This prevents exposing wallet addresses, tx hashes, and intent IDs to unauthorized users
-- 
-- Admin operations (insert/update/select) are handled via createAdminClient() with service role key
-- No policies needed as API routes use admin client which bypasses RLS
