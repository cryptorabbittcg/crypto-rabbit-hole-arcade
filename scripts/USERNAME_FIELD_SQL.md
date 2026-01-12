# Username Field in Supabase

## SQL Schema

The `username` field already exists in the `profiles` table. Here's the relevant SQL:

```sql
-- From scripts/01-create-tables.sql

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,        -- ✅ Username field exists
  avatar_url TEXT,
  
  -- Game currency and resources
  ape_balance INTEGER DEFAULT 1000,
  tickets INTEGER DEFAULT 5,
  points INTEGER DEFAULT 0,
  
  -- Stats
  total_games_played INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  win_streak INTEGER DEFAULT 0,
  best_win_streak INTEGER DEFAULT 0,
  
  -- Playtime tracking (in seconds)
  total_playtime INTEGER DEFAULT 0,
  
  -- Referral system
  referral_code TEXT UNIQUE,
  referral_count INTEGER DEFAULT 0,
  referral_earnings INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
```

## Field Details

- **Field Name**: `username`
- **Type**: `TEXT`
- **Constraint**: `UNIQUE` (each username must be unique across all profiles)
- **Nullable**: Yes (can be NULL)
- **Indexed**: Yes (for fast lookups)

## What Was Fixed

The `updateProfile` function in `components/providers.tsx` now:
1. ✅ Saves to localStorage (as before)
2. ✅ **NEW**: Also saves username and avatar to Supabase via `ProfileService.updateProfile()`
3. ✅ Uses async IIFE pattern (non-blocking, doesn't break existing code)

## How It Works

When a user updates their username:
1. Local state updates immediately (UI responds instantly)
2. localStorage saves the update (backup/offline support)
3. Supabase is updated asynchronously (persistent storage)
4. Next time user connects wallet, username loads from Supabase ✅

## Verification

To verify the fix works:
1. Update username in Profile Menu
2. Check Supabase `profiles` table - username should be updated
3. Disconnect and reconnect wallet - username should persist ✅

