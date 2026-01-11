# Storage Summary - What's Where

## ✅ Fully on Supabase

### Core Data
1. **Points System** ✅
   - `profiles.points` - User points
   - `leaderboard.total_points` - Leaderboard points
   - `transactions` - Point transactions

2. **Player Game Stats** ✅
   - `profiles` table: total_games_played, total_wins, total_losses, win_streak, best_win_streak, total_playtime
   - `game_sessions` table: All game session records
   - `leaderboard` table: High scores per game type

3. **Profile Information** ✅
   - `profiles` table: wallet_address, username, avatar_url, ape_balance, tickets, referral data

4. **Cryptoku Hints** ✅ (Just Migrated!)
   - `cryptoku_hints` table: hint_balance, total_ranked_completed
   - Migration: ✅ Automatic from localStorage

5. **Ape In Free Plays** ✅ (Just Migrated!)
   - `ape_in_daily_free_plays` table: Daily free play tracking
   - Migration: ✅ Automatic from localStorage

6. **Hint Rewards** ✅ (Just Migrated!)
   - `cryptoku_hints` table: Reward tracking via total_ranked_completed
   - SQL function: `reward_cryptoku_hint()` - Atomic reward operation

## ✅ Fully Migrated (Just Completed!)

### Cryptoku Leaderboard ✅ (Just Migrated!)
- **Previous Storage**: Vercel KV (Redis)
- **New Storage**: `cryptoku_leaderboard` table in Supabase
- **Status**: ✅ Fully migrated to Supabase
- **Functions**: `CryptokuLeaderboardService` - addEntry(), getLeaderboard()
- **Migration**: ✅ Complete - all new runs go to Supabase

### Other Data (OK to Keep)
- **Cryptoku Stats** (clean streak, completion counts): Still in KV (low priority, works fine)
- **Session Data**: localStorage/sessionStorage (ephemeral, OK)
- **UI State**: localStorage (preferences, OK)

## 🎯 Future: Onchain Leaderboard Integration

### Current Leaderboard Table Structure
```sql
leaderboard (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  total_points INTEGER,
  card_battle_wins INTEGER,
  ape_in_high_score INTEGER,
  cryptoku_high_score INTEGER,
  overall_rank INTEGER,
  updated_at TIMESTAMP
)
```

### Recommended Schema for Onchain Integration

To support Thirdweb onchain leaderboard, consider adding:

```sql
-- Add onchain fields to leaderboard table
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS onchain_tx_hash TEXT;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS onchain_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS onchain_block_number BIGINT;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS onchain_timestamp TIMESTAMP WITH TIME ZONE;

-- Add index for onchain queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_onchain ON leaderboard(onchain_verified, total_points DESC);
```

### Recommended Approach

1. **Keep Supabase as Source of Truth**
   - Store all leaderboard data in Supabase
   - Use Supabase for queries and rankings

2. **Add Onchain Verification Layer**
   - When updating leaderboard, optionally write to blockchain
   - Store transaction hash in `onchain_tx_hash`
   - Mark as verified once onchain transaction confirms
   - Keep Supabase data as primary (fast queries)

3. **Hybrid Query Strategy**
   - Query Supabase for fast leaderboard display
   - Query onchain for verification/proof
   - Combine data in UI (e.g., show "verified" badge)

4. **Migration Path**
   - Keep current KV leaderboard for now (if working)
   - Create new Supabase-based leaderboard system
   - Migrate KV data to Supabase
   - Add onchain verification on top

## Summary

### ✅ Fully Migrated to Supabase
- Points system
- Player stats
- Profiles
- Hints (just migrated!)
- Free plays (just migrated!)
- Hint rewards (just migrated!)

### ✅ All Critical Data Migrated
- Cryptoku leaderboard runs ✅ (just migrated!)
- Note: Cryptoku stats (clean streak, completion counts) still in KV but low priority

### ✅ Ready for Onchain
- Leaderboard table structure is compatible
- Can add onchain fields without breaking existing code
- Supabase remains primary source (fast queries)
- Onchain adds verification layer (immutable proof)

