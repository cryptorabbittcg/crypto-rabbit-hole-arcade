-- =====================================================
-- Ape In Purchased Plays Balances Table
-- =====================================================
-- Stores global purchased plays balance per user (Model A)
-- 
-- Design: One row per user, balance is global (not mode-specific)
-- This table is required for the ape_in_consume_play RPC function.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ape_in_purchased_plays_balances (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups (primary key already provides this, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_ape_in_purchased_plays_balances_user_id
ON public.ape_in_purchased_plays_balances(user_id);

-- Optional: Trigger to auto-update updated_at (if you want automatic timestamp updates)
-- Note: The RPC function manually sets updated_at, so this is optional
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ape_in_purchased_plays_balances_updated_at
ON public.ape_in_purchased_plays_balances;

CREATE TRIGGER trg_ape_in_purchased_plays_balances_updated_at
BEFORE UPDATE ON public.ape_in_purchased_plays_balances
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS: This table should only be accessed via service role (admin client)
-- No policies needed as API routes use createAdminClient() which bypasses RLS
-- If you want to add RLS later, policies would go here
