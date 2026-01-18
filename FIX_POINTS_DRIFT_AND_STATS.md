# Fix Points Drift and Stats Not Updating

## Problem Summary

1. **Points Drift**: Header/Profile show 1971, Leaderboard shows 1970 (1 point discrepancy)
2. **Stats at Zero**: Profile stats (games played, wins, playtime) not updating after Cryptoku runs
3. **Potential Refresh Timing**: Profile refresh may fire before database transaction commits

## Root Causes

### 1. Leaderboard Drift (1 point)
- `update_user_balance` function uses `UPDATE leaderboard ... WHERE user_id`
- If leaderboard row doesn't exist, the UPDATE silently does nothing
- Result: `profiles.points` increments, but `leaderboard.total_points` doesn't

### 2. Stats Not Updating
- `record_game_session` DOES update stats (verified in `scripts/03-functions.sql` lines 150-158)
- But stats might not be updating if:
  - `record_game_session` isn't being called
  - There's an error in `record_game_session` that's being silently swallowed
  - Profile refresh happens before the transaction commits

### 3. Refresh Timing
- `ARCADE_REFRESH_PROFILE` is dispatched immediately after `onGameEnd` callback
- `onGameEnd` is called after API returns 200 OK, but database transaction may not be committed yet
- Result: Profile refresh fetches stale data

## Fixes Required

### ✅ Fix 1: UPSERT Leaderboard in `update_user_balance`

**File**: `scripts/03-functions.sql` OR run migration `FIX_UPDATE_USER_BALANCE_UPSERT.sql`

**Change**: Replace the `UPDATE leaderboard` block with an UPSERT:

```sql
-- OLD (lines 110-113):
UPDATE leaderboard
SET total_points = total_points + p_points_change
WHERE user_id = p_user_id;

-- NEW:
INSERT INTO leaderboard (user_id, total_points, updated_at)
VALUES (p_user_id, GREATEST(p_points_change, 0), NOW())
ON CONFLICT (user_id) DO UPDATE
SET
  total_points = leaderboard.total_points + p_points_change,
  updated_at = NOW();
```

**After applying**: Run the one-time correction SQL in `FIX_UPDATE_USER_BALANCE_UPSERT.sql` to re-sync existing drift.

---

### ✅ Fix 2: Add Delayed Refresh to Prevent Race Condition

**File**: `components/game-modal.tsx`

**Change**: Add a delayed second refresh to ensure database transaction has committed:

```typescript
// In handleCryptokuGameEnd and handleApeInGameEnd:
if (typeof window !== "undefined") {
  window.dispatchEvent(new CustomEvent("ARCADE_REFRESH_PROFILE"))
  // Delayed refresh to ensure DB transaction has committed
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent("ARCADE_REFRESH_PROFILE"))
  }, 1200)
}
```

**Alternative (Better)**: Dispatch refresh from the game component AFTER receiving 200 OK response (not just from `onGameEnd` callback). This ensures refresh happens after server confirms success.

---

### ✅ Fix 3: Verify `record_game_session` is Actually Called

**File**: `app/api/cryptoku/submit-result/route.ts`

**Check**: 
- Line 276-285: `record_game_session` is called for completed, non-forfeited, non-duplicate runs
- Line 301-314: `run_id` is set after session creation
- Logs show "Game session recorded successfully" in Vercel logs

**If stats still don't update**, verify:
1. The `record_game_session` RPC actually executes (check Vercel logs for errors)
2. The function updates stats correctly (run `VERIFY_STATS_COLUMNS.sql` to confirm columns exist)
3. Profile refresh is loading from database, not cache

---

### ✅ Fix 4: Force Dynamic Leaderboard Fetch (If Caching Issue)

**File**: `features/leaderboard/leaderboard-view.tsx` or API route

**If SQL parity check shows `diff = 0` but UI still shows stale data:**

Add to Next.js API route (if using one):
```typescript
export const dynamic = "force-dynamic"
export const revalidate = 0
```

Or ensure Supabase client fetch uses:
```typescript
const { data } = await supabase.rpc("get_leaderboard", {...})
// No caching headers needed for Supabase RPCs, but verify the RPC is called fresh
```

Add "refresh on focus" to leaderboard page:
```typescript
useEffect(() => {
  const handleFocus = () => {
    fetchOverallLeaderboard()
  }
  window.addEventListener('focus', handleFocus)
  return () => window.removeEventListener('focus', handleFocus)
}, [address])
```

---

## Verification Steps

### Step 1: Check DB Parity
Run `VERIFY_POINTS_PARITY.sql` in Supabase SQL Editor:
```sql
SELECT
  p.wallet_address,
  p.points as profile_points,
  COALESCE(l.total_points, 0) as leaderboard_points,
  p.points - COALESCE(l.total_points, 0) as diff
FROM profiles p
LEFT JOIN leaderboard l ON l.user_id = p.id
WHERE p.wallet_address = '<YOUR_WALLET>';
```

**Interpretation**:
- `diff = 1` → **DB drift is real**. Apply Fix 1 (UPSERT).
- `diff = 0` → **DB is fine**. Issue is UI caching. Apply Fix 4.

### Step 2: Verify Stats Columns Exist
Run `VERIFY_STATS_COLUMNS.sql` to confirm:
- `total_games_played`
- `total_wins`
- `total_losses`
- `win_streak`
- `best_win_streak`
- `total_playtime`

All should exist in `profiles` table.

### Step 3: Verify Game Session Recording
Run `VERIFY_CRYPTOKU_STATS.sql` after playing a Cryptoku game:
- Should show new `game_sessions` row for your run
- Should show `profiles` stats incremented

### Step 4: Test End-to-End
1. Play a Cryptoku DEGEN game (completes successfully)
2. Check Vercel logs for "Game session recorded successfully"
3. Wait 2 seconds
4. Check header/profile/leaderboard all show same points
5. Check profile stats incremented (games played, wins, playtime)

---

## Files Changed

1. ✅ `FIX_UPDATE_USER_BALANCE_UPSERT.sql` - Migration to fix leaderboard UPSERT
2. ✅ `VERIFY_POINTS_PARITY.sql` - SQL to check drift
3. ✅ `VERIFY_STATS_COLUMNS.sql` - SQL to verify columns exist
4. ✅ `VERIFY_CRYPTOKU_STATS.sql` - Fixed timestamp column references
5. 🔄 `components/game-modal.tsx` - Add delayed refresh (TODO)
6. 🔄 `features/leaderboard/leaderboard-view.tsx` - Add refresh on focus (TODO)

---

## Priority Order

1. **Fastest Win**: Run parity check SQL → If drift: apply UPSERT fix → Re-sync totals
2. **If drift fixed but still showing stale**: Force dynamic leaderboard fetch + refresh on focus
3. **Stats still 0**: Verify `record_game_session` is called + stats columns exist
4. **Refresh timing**: Add delayed refresh to `game-modal.tsx`

---

## Expected Outcome

After fixes:
- ✅ `profiles.points` = `leaderboard.total_points` (no drift)
- ✅ Header/Profile/Leaderboard all show same points
- ✅ Profile stats increment after each completed Cryptoku run
- ✅ UI refreshes after DB transaction commits (no stale data)
