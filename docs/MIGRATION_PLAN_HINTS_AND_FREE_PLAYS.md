# Migration Plan: Cryptoku Hints & Ape In Free Plays → Supabase

## Overview

Migrating Cryptoku hints and Ape In daily free plays from localStorage to Supabase for:
- **Reliability**: Server-side persistence, not lost on browser clear
- **Cross-device sync**: Works across different browsers/devices
- **Data integrity**: Atomic transactions prevent race conditions
- **Consistency**: All game data in one place (Supabase)
- **Manageability**: Can query/reset/admin via SQL

---

## 1. Cryptoku Hints System

### Current State (localStorage)
- **Storage**: `localStorage` key: `cryptoku_hints_{wallet_address}`
- **Data Structure**:
  ```typescript
  {
    hintBalance: number,           // Current hint balance
    gamesUntilNextFreeHint: number, // Games remaining until next free hint
    totalRankedCompleted: number    // Total ranked games completed (DEGEN/APE only)
  }
  ```
- **Default**: 3 free hints on first play
- **Rewards**: +1 hint every 10 completed ranked games
- **Purchase**: 0.10 $APE per hint (stub implementation)

### Proposed Supabase Schema

**Table: `cryptoku_hints`**
```sql
CREATE TABLE cryptoku_hints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Hint balance and rewards
  hint_balance INTEGER DEFAULT 3 NOT NULL,        -- Current hint balance
  total_ranked_completed INTEGER DEFAULT 0 NOT NULL, -- Total ranked games completed
  
  -- Computed field: gamesUntilNextFreeHint = 10 - (total_ranked_completed % 10)
  -- Can be computed in application layer or added as generated column
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cryptoku_hints_user ON cryptoku_hints(user_id);
```

**Why this design:**
- `user_id` foreign key ensures data integrity with profiles
- `UNIQUE` constraint prevents duplicate entries
- `hint_balance` defaults to 3 (initial free hints)
- `total_ranked_completed` tracks progress for rewards
- `gamesUntilNextFreeHint` calculated as: `10 - (total_ranked_completed % 10)`

### Functionality Flow

#### **Getting Hints Balance**
1. User opens Cryptoku game
2. API call: `GET /api/cryptoku/hints/balance?address={address}`
3. Backend: Look up profile by wallet_address → get user_id
4. Query: `SELECT * FROM cryptoku_hints WHERE user_id = {user_id}`
5. If not found: Create default entry (hint_balance = 3)
6. Return: `{ hintBalance, gamesUntilNextFreeHint }`

#### **Using a Hint**
1. User clicks hint button in game
2. API call: `POST /api/cryptoku/hints/use` with `{ address }`
3. Backend: 
   - Get or create hints record for user
   - **Atomic check**: `SELECT hint_balance FROM cryptoku_hints WHERE user_id = {user_id} FOR UPDATE`
   - If `hint_balance <= 0`: Return error
   - **Atomic update**: `UPDATE cryptoku_hints SET hint_balance = hint_balance - 1 WHERE user_id = {user_id} AND hint_balance > 0`
   - Verify update succeeded (hint actually decremented)
4. Return: `{ success: true, hintBalance: new_balance }`
5. Game applies hint to board

**Key Safety**: Using `FOR UPDATE` row-level locking prevents race conditions where multiple requests try to use last hint simultaneously.

#### **Rewarding Free Hints (Game Completion)**
1. User completes ranked game (DEGEN or APE mode)
2. API call: `POST /api/cryptoku/submit-result` with game result
3. Backend processing:
   - Get current hints record
   - Increment `total_ranked_completed` by 1
   - Calculate: `newTotal = total_ranked_completed + 1`
   - Calculate hints earned: `hintsEarned = floor(newTotal / 10) - floor((newTotal - 1) / 10)`
   - If `hintsEarned > 0`: Increment `hint_balance` by 1
   - Update both fields atomically in single transaction
4. Return in response: `{ hintsEarned: 0 or 1, hintBalance: new_balance, gamesUntilNextFreeHint: computed }`

#### **Purchasing Hints**
1. User clicks "Purchase Hints" (0.10 $APE per hint)
2. API call: `POST /api/cryptoku/hints/purchase` with `{ address, amount }`
3. Backend:
   - Verify payment (currently stub, will integrate with Glyph)
   - Get or create hints record
   - **Atomic update**: `UPDATE cryptoku_hints SET hint_balance = hint_balance + {amount} WHERE user_id = {user_id}`
   - Record transaction in `transactions` table
4. Return: `{ success: true, hintBalance: new_balance }`

### Legacy Data Migration

**Migration Strategy:**
1. On first API call after migration, check localStorage for legacy data
2. If found: Import to Supabase, then clear localStorage
3. If not found: Create default Supabase entry

**Migration Code Location:**
- In `getCryptokuHints()` function
- Check localStorage first (one-time migration)
- Create Supabase record from localStorage data
- Clear localStorage after successful migration
- Future calls use Supabase only

---

## 2. Ape In Daily Free Plays System

### Current State (localStorage)
- **Storage**: `localStorage` key: `dailyFreePlays_{wallet_address}`
- **Data Structure**: Array of:
  ```typescript
  {
    gameMode: GameMode,      // 'aida' | 'lana' | 'enj1n' | 'nifty'
    walletAddress: string,
    dateUsed: string,        // YYYY-MM-DD format
    timestamp: number
  }[]
  ```
- **Default**: 5 free plays per day per mode
- **Modes with free plays**: aida, lana, enj1n, nifty
- **Sandy mode**: Always free (tutorial, doesn't count)
- **Reset**: At midnight local time (user's timezone)

### Proposed Supabase Schema

**Table: `ape_in_daily_free_plays`**
```sql
CREATE TABLE ape_in_daily_free_plays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Game mode and date
  game_mode TEXT NOT NULL,  -- 'aida' | 'lana' | 'enj1n' | 'nifty'
  date_used DATE NOT NULL,  -- Date in UTC (YYYY-MM-DD)
  
  -- Timestamps
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: One play per user per mode per day
  UNIQUE(user_id, game_mode, date_used)
);

CREATE INDEX idx_ape_in_daily_free_plays_user ON ape_in_daily_free_plays(user_id, date_used);
CREATE INDEX idx_ape_in_daily_free_plays_date ON ape_in_daily_free_plays(date_used);
```

**Why this design:**
- One row per free play used (denormalized for simplicity)
- `UNIQUE(user_id, game_mode, date_used)` prevents duplicates
- `date_used` as DATE type (UTC) for consistent date comparisons
- Indexed for fast queries by user and date
- Old rows can be cleaned up periodically (optional: delete rows older than 7 days)

### Functionality Flow

#### **Checking Free Plays Remaining**
1. User opens Ape In game, selects mode (e.g., "Aida")
2. Backend call: Check eligibility via service
3. Query: `SELECT COUNT(*) FROM ape_in_daily_free_plays WHERE user_id = {user_id} AND game_mode = {mode} AND date_used = CURRENT_DATE`
4. Calculate: `remaining = 5 - count`
5. Return: `{ freePlaysRemaining: remaining, isEligible: remaining > 0 }`
6. UI displays: "Free plays: X/5" or "Purchase for 0.10 $APE"

#### **Using a Free Play**
1. User starts game with eligible mode
2. Backend call: `useDailyFreeGame(user_id, game_mode)`
3. Backend:
   - **Atomic insert**: `INSERT INTO ape_in_daily_free_plays (user_id, game_mode, date_used) VALUES ({user_id}, {mode}, CURRENT_DATE) ON CONFLICT DO NOTHING`
   - Check if insert succeeded (CONFLICT means already used today)
   - If conflict: Return error (already used free play today)
4. Game proceeds with free play
5. UI updates: "Free plays: X/5" decremented

**Key Safety**: `ON CONFLICT DO NOTHING` prevents duplicate free plays on race conditions.

#### **Reset Logic (Automatic)**
- No explicit reset needed!
- Date comparison (`date_used = CURRENT_DATE`) automatically filters to today's plays
- Yesterday's plays don't count (different date)
- Midnight reset is automatic via date comparison
- Server uses UTC dates, so reset happens at UTC midnight (consistent globally)

#### **Sandy Mode (Tutorial)**
- Sandy is always free (no database check needed)
- Handled in application logic: `if (gameMode === 'sandy') return true`

### Legacy Data Migration

**Migration Strategy:**
1. On first API call after migration, check localStorage for legacy data
2. If found: 
   - Parse array of free plays
   - Filter to today's date (only migrate current day's plays)
   - Insert into Supabase (if not already exists)
   - Clear localStorage after successful migration
3. If not found: User starts fresh (5 free plays available)

**Why only migrate today's plays:**
- Prevents migrating old plays from previous days
- User gets fresh start with current day's allocation
- Keeps data clean

---

## 3. Database Functions for Safety

### Cryptoku: Atomic Hint Usage
```sql
CREATE OR REPLACE FUNCTION use_cryptoku_hint(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get current balance with row lock
  SELECT hint_balance INTO v_current_balance
  FROM cryptoku_hints
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Create default if doesn't exist
  IF v_current_balance IS NULL THEN
    INSERT INTO cryptoku_hints (user_id, hint_balance)
    VALUES (p_user_id, 3)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING hint_balance INTO v_current_balance;
  END IF;
  
  -- Check if has hints
  IF v_current_balance <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'No hints remaining');
  END IF;
  
  -- Decrement hint balance atomically
  UPDATE cryptoku_hints
  SET hint_balance = hint_balance - 1,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND hint_balance > 0
  RETURNING hint_balance INTO v_new_balance;
  
  -- Verify decrement succeeded
  IF v_new_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Failed to use hint');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'hintBalance', v_new_balance,
    'gamesUntilNextFreeHint', 10 - (total_ranked_completed % 10)
  );
END;
$$ LANGUAGE plpgsql;
```

### Cryptoku: Reward Hints on Game Completion
```sql
CREATE OR REPLACE FUNCTION reward_cryptoku_hint(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_hints_earned INTEGER;
  v_new_balance INTEGER;
  v_total_completed INTEGER;
BEGIN
  -- Get or create hints record
  INSERT INTO cryptoku_hints (user_id, hint_balance, total_ranked_completed)
  VALUES (p_user_id, 3, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Increment total_ranked_completed and check for reward
  UPDATE cryptoku_hints
  SET 
    total_ranked_completed = total_ranked_completed + 1,
    hint_balance = CASE 
      WHEN (total_ranked_completed + 1) % 10 = 0 
      THEN hint_balance + 1 
      ELSE hint_balance 
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING 
    total_ranked_completed,
    hint_balance,
    CASE WHEN total_ranked_completed % 10 = 9 THEN 1 ELSE 0 END
  INTO v_total_completed, v_new_balance, v_hints_earned;
  
  RETURN json_build_object(
    'hintsEarned', v_hints_earned,
    'hintBalance', v_new_balance,
    'gamesUntilNextFreeHint', 10 - (v_total_completed % 10)
  );
END;
$$ LANGUAGE plpgsql;
```

---

## 4. API Route Changes

### Cryptoku Hints API Routes

**File: `app/api/cryptoku/hints/balance/route.ts`**
- Change: Query Supabase instead of localStorage/KV
- Migration: Check localStorage on first call, migrate if found
- Return: `{ hintBalance, gamesUntilNextFreeHint }`

**File: `app/api/cryptoku/hints/use/route.ts`**
- Change: Use SQL function `use_cryptoku_hint(user_id)` for atomic operation
- Migration: Migrate localStorage data if exists
- Return: `{ success: true, hintBalance: new_balance }`

**File: `app/api/cryptoku/hints/purchase/route.ts`**
- Change: Update Supabase instead of localStorage/KV
- Migration: Migrate localStorage data if exists
- Return: `{ success: true, hintBalance: new_balance }`

**File: `app/api/cryptoku/submit-result/route.ts`**
- Change: Call SQL function `reward_cryptoku_hint(user_id)` instead of KV update
- Return: Include `hintsEarned` in response

### Ape In Free Plays (New API Routes)

**New File: `app/api/ape-in/free-plays/check/route.ts`**
- GET endpoint: Check free plays remaining for a mode
- Query: Count today's free plays for user + mode
- Return: `{ freePlaysRemaining: number, isEligible: boolean }`

**New File: `app/api/ape-in/free-plays/use/route.ts`**
- POST endpoint: Use a free play
- Insert: Add row to `ape_in_daily_free_plays` with ON CONFLICT handling
- Return: `{ success: true, freePlaysRemaining: number }`

**Modify: `app/api/ape-in/game/create/route.ts`**
- Check free play eligibility before creating game
- If eligible: Automatically use free play
- If not: Require payment

---

## 5. Service Layer Changes

### New Service: `lib/supabase/services/cryptoku-hints.service.ts`
```typescript
export class CryptokuHintsService {
  async getHints(userId: string): Promise<PlayerHints>
  async useHint(userId: string): Promise<PlayerHints>
  async purchaseHints(userId: string, amount: number): Promise<PlayerHints>
  async rewardHint(userId: string): Promise<{ hintsEarned: number, hints: PlayerHints }>
  private async migrateFromLocalStorage(walletAddress: string): Promise<void>
}
```

### New Service: `lib/supabase/services/ape-in-free-plays.service.ts`
```typescript
export class ApeInFreePlaysService {
  async getFreePlaysRemaining(userId: string, gameMode: GameMode): Promise<number>
  async isEligible(userId: string, gameMode: GameMode): Promise<boolean>
  async useFreePlay(userId: string, gameMode: GameMode): Promise<{ success: boolean, remaining: number }>
  private async migrateFromLocalStorage(walletAddress: string): Promise<void>
}
```

### Update: `lib/cryptoku-store.ts`
- **Deprecate**: Remove KV/localStorage code
- **New**: Import and use `CryptokuHintsService`
- **Backward compatibility**: Keep same function signatures for API routes

### Update: `features/games/ape-in/lib/dailyFreeGames.ts`
- **Deprecate**: Remove localStorage code
- **New**: Call API routes instead of localStorage
- **Keep**: Same public API (static methods) for minimal code changes

---

## 6. Legacy Code Handling

### Migration Strategy

1. **One-Time Migration on First Access**
   - When user first accesses hints/free plays after migration
   - Check localStorage for legacy data
   - If found: Import to Supabase
   - Clear localStorage after successful migration
   - Log migration for monitoring

2. **Backward Compatibility Period**
   - Keep localStorage checks for 1-2 weeks
   - Log when legacy data is found (monitoring)
   - After period: Remove localStorage checks entirely

3. **Error Handling**
   - If Supabase migration fails: Fall back to localStorage temporarily
   - Log error for investigation
   - User can retry (will attempt migration again)

### Code Changes Pattern

**Before (localStorage):**
```typescript
const stored = localStorage.getItem('cryptoku_hints_address')
const hints = stored ? JSON.parse(stored) : DEFAULT_HINTS
```

**After (Supabase with migration):**
```typescript
async function getHints(address: string) {
  // 1. Get user_id from wallet_address
  const profile = await ProfileService.getProfileByWallet(address)
  if (!profile) throw new Error('Profile not found')
  
  // 2. Try Supabase first
  let hints = await CryptokuHintsService.getHints(profile.id)
  
  // 3. Migration check (one-time)
  if (typeof window !== 'undefined') {
    const legacyKey = `cryptoku_hints_${address.toLowerCase()}`
    const legacy = localStorage.getItem(legacyKey)
    if (legacy) {
      try {
        await CryptokuHintsService.migrateFromLocalStorage(address, JSON.parse(legacy))
        localStorage.removeItem(legacyKey) // Clear after migration
        hints = await CryptokuHintsService.getHints(profile.id) // Re-fetch
      } catch (error) {
        console.error('Migration failed, using Supabase data:', error)
      }
    }
  }
  
  return hints
}
```

---

## 7. User Experience & Edge Cases

### Cryptoku Hints - How It Feels

1. **First Time Playing**
   - User opens Cryptoku → 3 free hints shown
   - Smooth, no difference from before

2. **Using Hints**
   - Click hint button → Hint applied instantly
   - Balance decrements: "2 hints remaining"
   - If balance = 0: "No hints remaining, purchase more?"

3. **Earning Free Hints**
   - Complete ranked game (DEGEN/APE)
   - See notification: "🎉 +1 free hint! (Earned every 10 games)"
   - Balance increments: "4 hints remaining"
   - Counter: "6 games until next free hint"

4. **Purchasing Hints**
   - Click "Purchase Hints" → Payment processed
   - Balance increments: "+10 hints"
   - Total: "14 hints remaining"

5. **Cross-Device Sync**
   - Use hint on Phone → Balance updates
   - Open on Desktop → Same balance shows
   - Seamless sync

### Ape In Free Plays - How It Feels

1. **Daily Reset**
   - Midnight UTC: All modes reset to 5/5 free plays
   - User sees: "Free plays: 5/5" for each mode
   - Smooth, automatic

2. **Using Free Plays**
   - Click "Play Aida" → "Free play used! 4/5 remaining"
   - Play 4 more times → "0/5 free plays remaining"
   - Next attempt: "Purchase for 0.10 $APE" button

3. **Mode-Specific**
   - Aida: 5/5 free plays
   - Lana: 5/5 free plays
   - Each mode tracks independently
   - User can use all 5 in one mode, still has 5 in others

4. **Sandy Mode**
   - Always free (no database check)
   - No "free plays" counter shown
   - Tutorial mode, unlimited plays

---

## 8. Data Integrity Guarantees

### Race Condition Prevention

**Cryptoku Hints:**
- `FOR UPDATE` row locking prevents simultaneous hint usage
- Atomic SQL updates ensure balance can't go negative
- Transaction isolation prevents double-spending

**Ape In Free Plays:**
- `UNIQUE(user_id, game_mode, date_used)` constraint prevents duplicates
- `ON CONFLICT DO NOTHING` handles race conditions gracefully
- Date-based filtering ensures only today's plays count

### Transaction Safety

All operations use database transactions:
- Hint usage: Single atomic UPDATE
- Hint rewards: Single atomic UPDATE (increment both fields)
- Free play usage: Single atomic INSERT

### Error Recovery

- If database error: Return error, don't apply hint/play
- User can retry (idempotent operations)
- No partial state (all-or-nothing)

---

## 9. Testing Strategy

### Migration Testing
1. Create test user with localStorage data
2. Trigger migration
3. Verify data in Supabase matches localStorage
4. Verify localStorage cleared
5. Verify future calls use Supabase only

### Functionality Testing
1. **Cryptoku Hints:**
   - Use hints until balance = 0
   - Complete 10 games, verify +1 hint reward
   - Purchase hints, verify balance increases
   - Test concurrent hint usage (race condition)

2. **Ape In Free Plays:**
   - Use all 5 free plays in one mode
   - Verify can't use 6th free play
   - Verify other modes still have 5/5
   - Test date rollover (simulate next day)

### Edge Cases
- User with no localStorage data (fresh user)
- User with corrupted localStorage data
- Database connection failure
- Concurrent requests (race conditions)
- Date timezone edge cases

---

## 10. Implementation Order

### Phase 1: Database Setup
1. Create SQL migration script
2. Add `cryptoku_hints` table
3. Add `ape_in_daily_free_plays` table
4. Create SQL functions for atomic operations
5. Add indexes

### Phase 2: Service Layer
1. Create `CryptokuHintsService`
2. Create `ApeInFreePlaysService`
3. Implement migration logic
4. Add error handling

### Phase 3: API Routes
1. Update Cryptoku hints API routes
2. Create Ape In free plays API routes
3. Update submit-result route for hint rewards
4. Test all endpoints

### Phase 4: Frontend Integration
1. Update Cryptoku game to use new API (should be transparent)
2. Update Ape In game to use new API routes
3. Remove localStorage dependencies
4. Test end-to-end flows

### Phase 5: Cleanup
1. Remove deprecated KV/localStorage code
2. Remove migration logic (after monitoring period)
3. Update documentation

---

## 11. Rollback Plan

If issues arise:
1. Keep old localStorage code in git history
2. Feature flag to toggle between Supabase/localStorage
3. Monitor error logs for migration failures
4. Quick revert: Switch feature flag back to localStorage

---

## Summary

**What Changes:**
- Storage: localStorage → Supabase SQL tables
- API: Same endpoints, different backend
- User Experience: No visible changes (seamless migration)

**What Stays the Same:**
- Default values (3 hints, 5 free plays)
- Reward logic (every 10 games)
- Purchase costs (0.10 $APE)
- UI/UX behavior

**Benefits:**
- ✅ Server-side persistence
- ✅ Cross-device sync
- ✅ Data integrity (atomic operations)
- ✅ Easier administration
- ✅ Consistent with other game data

**Risks:**
- Migration complexity (handled with one-time import)
- Database dependency (mitigated with error handling)
- Performance (SQL is fast, indexed queries)

This migration makes the system more robust and maintainable while preserving all existing functionality.

