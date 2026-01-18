# Audit: Points, Stats, Sessions, and Cryptoku Data Flow

**Date:** 2025-01-XX  
**Status:** AUDIT ONLY - NO CODE CHANGES  
**Confirmed Facts:**
- `transactions` sum (points) = 473 (472 game_reward + 1 test)
- `profiles.points` = 1516
- `leaderboard.total_points` = 472
- **Discrepancy: 1044 points with NO transaction trail**
- `game_sessions` has ZERO rows for this user
- `cryptoku_leaderboard` has no rows for this wallet

---

## A) Read Paths for UI Points Display

### A.1 Header Points Pill

**File:** `components/topbar.tsx`  
**Lines:** 10, 47

**Code:**
```typescript
const { tickets, points } = useArcade()  // Line 10
<span className="text-xs md:text-sm font-bold text-cyan-100 text-glow">{points}</span>  // Line 47
```

**Data Flow:**
```
topbar.tsx:10 → useArcade().points (React Context)
  ↓
components/providers.tsx:80 → const [points, setPoints] = useState(0)
  ↓
components/providers.tsx:353-355 → setPoints(dbPoints) where dbPoints = (existingProfile as any).points
  ↓
ProfileService.getProfileByWallet() → SELECT profiles.points WHERE wallet_address = ?
  ↓
Database: profiles.points column
```

**Source:** `profiles.points`

---

### A.2 Profile Page Points Box

**File:** `features/profile/profile-view.tsx`  
**Lines:** 37, 584

**Code:**
```typescript
const { profile, updateProfile, tickets, points, isConnected, address } = useArcade()  // Line 37
<div className="text-3xl font-bold text-cyan-400">{points}</div>  // Line 584
```

**Data Flow:**
```
Same as header → useArcade().points → React Context → profiles.points
```

**Source:** `profiles.points` (same React Context state as header)

---

### A.3 Leaderboard "Your Points"

**File:** `features/leaderboard/leaderboard-view.tsx`  
**Lines:** 45, 49, 76-117, 105, 270

**Code:**
```typescript
const [userPoints, setUserPoints] = useState<number>(points || 0)  // Line 49

// In fetchOverallLeaderboard (Line 76-117):
const scores = await leaderboardService.getTopByPoints(100)  // Line 81
const userEntry = scores.find(...)  // Line 100-102
setUserPoints(userEntry.score)  // Line 105 where score = entry.total_points

// Display:
<div className="text-3xl font-bold font-display text-purple-400">{userPoints.toLocaleString()}</div>  // Line 270
```

**Data Flow:**
```
leaderboard-view.tsx:81 → LeaderboardService.getTopByPoints(100)
  ↓
lib/supabase/services/leaderboard.service.ts:186 → this.supabase.rpc("get_leaderboard", { p_limit: 100 })
  ↓
scripts/03-functions.sql:285-298 → SELECT ... FROM leaderboard l JOIN profiles p ... ORDER BY l.total_points DESC
  ↓
Database: leaderboard.total_points column
```

**Source:** `leaderboard.total_points`

---

### A.4 Leaderboard Rows Points

**File:** `features/leaderboard/leaderboard-view.tsx`  
**Lines:** 84-93, 582

**Code:**
```typescript
const entries: LeaderboardEntry[] = scores.map((entry) => ({
  points: entry.score, // entry.score contains total_points from RPC  // Line 89
}))
<div className="text-3xl font-bold font-display text-pink-400">{entry.points.toLocaleString()}</div>  // Line 582
```

**Data Flow:**
```
Same as "Your Points" → getTopByPoints() → get_leaderboard RPC → leaderboard.total_points
```

**Source:** `leaderboard.total_points`

---

### A.5 Cryptoku Tab Leaderboard

**File:** `features/leaderboard/leaderboard-view.tsx`  
**Lines:** 132-163, 302-340

**Code:**
```typescript
const response = await fetch(`/api/cryptoku/leaderboard?mode=${mode}&limit=100`)  // Line 137
const entries: CryptokuLeaderboardEntry[] = data.entries.map((entry: any) => ({
  score: entry.score,  // Line 147
}))
```

**Data Flow:**
```
leaderboard-view.tsx:137 → GET /api/cryptoku/leaderboard?mode={mode}&limit=100
  ↓
app/api/cryptoku/leaderboard/route.ts:14 → CryptokuLeaderboardService.getLeaderboard(mode, limit)
  ↓
lib/supabase/services/cryptoku-leaderboard.service.ts:125 → this.supabase.rpc("get_cryptoku_leaderboard", { p_mode: mode, p_limit: limit })
  ↓
supabase/migrations/20260116094000_create_cryptoku_leaderboard_table.sql:169-247 → get_cryptoku_leaderboard RPC
  ↓
Database: cryptoku_leaderboard table (SELECT ... FROM cryptoku_leaderboard WHERE mode = ? ...)
```

**Source:** `cryptoku_leaderboard` table

---

## B) Write Paths for All Data Sources

### B.1 profiles.points Writes

**Primary Writer:** `update_user_balance` RPC

**File:** `scripts/03-functions.sql`  
**Lines:** 73-116

**Code:**
```sql
UPDATE profiles
SET 
  points = GREATEST(0, points + p_points_change)  -- Line 92
WHERE id = p_user_id;
```

**Callers:**
1. **Cryptoku Submit API:** `app/api/cryptoku/submit-result/route.ts:250`
   ```typescript
   await adminClient.rpc('update_user_balance', {
     p_user_id: profile.id,
     p_points_change: pointsEarned,
     ...
   })
   ```

2. **ProfileService.addPoints() (Client-Side):** `components/providers.tsx:553`
   ```typescript
   await profileService.updateBalance(profile.id, 0, 0, amount)
   ```
   → `lib/supabase/services/profile.service.ts:174` → Anon client RPC

3. **record_game_session RPC (Internal):** `scripts/03-functions.sql:161`
   ```sql
   PERFORM update_user_balance(...)
   ```

**No Direct Writes Found:** No `UPDATE profiles SET points = ?` found outside RPC.

---

### B.2 leaderboard.total_points Writes

**Primary Writer:** `update_user_balance` RPC

**File:** `scripts/03-functions.sql`  
**Lines:** 111-113

**Code:**
```sql
IF p_points_change != 0 THEN
  ...
  UPDATE leaderboard
  SET total_points = total_points + p_points_change  -- Line 112
  WHERE user_id = p_user_id;  -- CRITICAL: No INSERT if row missing!
END IF;
```

**Critical Issue:** Uses `UPDATE` only - if `leaderboard` row doesn't exist, this does nothing (no INSERT). This explains why `leaderboard.total_points = 472` but `profiles.points = 1516`.

**Callers:** Same as `profiles.points` (all go through `update_user_balance` RPC).

---

### B.3 transactions Table Inserts

**Primary Writer:** `update_user_balance` RPC

**File:** `scripts/03-functions.sql`  
**Lines:** 107-108

**Code:**
```sql
IF p_points_change != 0 THEN
  INSERT INTO transactions (user_id, transaction_type, amount, currency, description)  -- Line 107
  VALUES (p_user_id, p_transaction_type, p_points_change, 'points', p_description);
  ...
END IF;
```

**Callers:** Same as `profiles.points` (all via `update_user_balance` RPC).

**Note:** The 1044 phantom points have NO corresponding transaction rows, meaning they were NOT added via `update_user_balance` RPC.

---

### B.4 game_sessions Table Inserts

**Primary Writer:** `record_game_session` RPC

**File:** `scripts/03-functions.sql`  
**Lines:** 139-147

**Code:**
```sql
INSERT INTO game_sessions (
  user_id, game_type, game_mode, duration, result,
  ape_earned, tickets_earned, points_earned, ended_at
)
VALUES (
  p_user_id, p_game_type, p_game_mode, p_duration, p_result,
  p_ape_earned, p_tickets_earned, p_points_earned, NOW()
)
```

**Callers:**
- **Ape In Submit:** `app/api/ape-in/submit-result/route.ts` - Likely calls this (not verified)
- **NOT called by Cryptoku Submit** - `app/api/cryptoku/submit-result/route.ts` does NOT call `record_game_session`

**Alternative Writers:** `GameService.createGameSession()` + `completeGameSession()` exist but are not used by Cryptoku.

---

### B.5 cryptoku_leaderboard Table Inserts

**Primary Writer:** `add_cryptoku_leaderboard_entry` RPC

**File:** `supabase/migrations/20260116094000_create_cryptoku_leaderboard_table.sql`  
**Lines:** 63-167

**Code:**
```sql
CREATE OR REPLACE FUNCTION add_cryptoku_leaderboard_entry(...)
  INSERT INTO cryptoku_leaderboard (...)
  VALUES (...)
```

**Caller:**
- **Cryptoku Submit:** `app/api/cryptoku/submit-result/route.ts:207`
  ```typescript
  const leaderboardService = new CryptokuLeaderboardService(adminClient)
  await leaderboardService.addEntry({ ... })
  ```

**Note:** This is called BEFORE `update_user_balance` (line 207 vs line 250). If `addEntry()` fails or profile not found earlier, leaderboard entry might not be created.

---

## C) How 1044 Phantom Points Could Have Been Added (Ranked by Likelihood)

### C.1 Most Likely: Client-Side Optimistic Updates That Failed Server Sync

**Evidence:**
- `components/game-modal.tsx:54` - Cryptoku game end calls `addPoints(result.metadata.points)`
- `components/providers.tsx:537-585` - `addPoints()` does **optimistic update first** (line 537-539), then tries server sync (line 544-577)
- If server sync fails (profile not found, not authenticated, RLS blocks), **local state keeps points but DB doesn't get transaction**

**Scenario:**
1. User plays Cryptoku → Game calls `addPoints(score)` (e.g., 500 points)
2. `addPoints()` updates `points` state: `setPoints((prev) => prev + amount)` (line 537-539)
3. Server sync attempts: `profileService.updateBalance(...)` (line 553)
4. **Sync fails silently** (no error shown to user, just logger.warn):
   - Profile not found (line 572)
   - Not authenticated (line 581)
   - RLS blocks anon client RPC (line 569)
5. **User continues playing** → Points accumulate in local state
6. **Later, when profile syncs** → `syncProfileWithWallet()` loads `profiles.points` from DB (line 353-355), but if points were added to DB via API route, and ALSO added locally via `addPoints()`, we get double-counting OR mismatch

**Code Evidence:**
- `components/providers.tsx:537` - `setPoints((prev) => prev + amount)` happens BEFORE server sync
- `components/providers.tsx:569` - `logger.warn("⚠️ Failed to sync points to Supabase")` - Silent failure
- `components/game-modal.tsx:54` - Cryptoku calls `addPoints()` even though API route also awards points

**Likelihood:** **HIGH** - This explains phantom points with no transactions if:
- API route awarded points successfully (added transaction)
- Client-side `addPoints()` also added points optimistically (no transaction)
- Points accumulated before profile was properly synced

---

### C.2 Historical Direct SQL/Migration

**Evidence:**
- `scripts/04-seed-data.sql:24-29` - Example seed script with `INSERT INTO profiles ... points` (commented out, but shows pattern)
- No active migrations found that directly set `profiles.points`

**Scenario:**
- Manual SQL update: `UPDATE profiles SET points = points + 1044 WHERE wallet_address = '...'`
- Or migration script that set points directly (bypassed `update_user_balance`)

**Likelihood:** **MEDIUM** - Possible during development/testing, but no evidence in current migrations.

---

### C.3 Double-Award: API Route + Client addPoints()

**Evidence:**
- `app/api/cryptoku/submit-result/route.ts:250` - Awards points via `update_user_balance` RPC (adds transaction)
- `components/game-modal.tsx:54` - ALSO calls `addPoints()` from game end callback
- `components/providers.tsx:553` - `addPoints()` calls `update_user_balance` again (could add another transaction OR fail)

**Scenario:**
1. API route awards 500 points → `update_user_balance` → `profiles.points += 500`, transaction inserted
2. Game end callback calls `addPoints(500)` → Client optimistic update → Tries server sync
3. **If server sync succeeds:** Double-award (2x points, 2 transactions) OR idempotency prevents it
4. **If server sync fails:** Points in local state but not in DB → Later sync loads from DB but local state has extra

**Code Evidence:**
- `cryptokugame.tsx:1388` - Game end metadata includes `points: earned`
- `game-modal.tsx:54` - Calls `addPoints(result.metadata.points)` when Cryptoku ends
- This happens AFTER API route already awarded points

**Likelihood:** **MEDIUM-HIGH** - This would cause double-counting if both succeed, OR mismatch if API succeeds but client sync fails.

---

### C.4 update_user_balance RPC Failure (Partial Success)

**Evidence:**
- `scripts/03-functions.sql:88-93` - Updates `profiles.points` FIRST
- `scripts/03-functions.sql:107-113` - Inserts transaction AND updates leaderboard AFTER

**Scenario:**
- If `update_user_balance` RPC fails AFTER updating `profiles.points` but BEFORE inserting transaction (unlikely due to atomic transaction, but possible on database error)
- OR: RLS policy blocks transaction INSERT but allows `profiles.points` UPDATE

**Likelihood:** **LOW** - RPC is atomic (single transaction), but RLS could theoretically allow partial writes.

---

### C.5 getStoredPointUpdates() Accumulated Points

**Evidence:**
- `components/providers.tsx:164-188` - Loads `getStoredPointUpdates()` on mount
- `lib/game-session.ts:80-97` - `syncGamePoints()` stores updates in localStorage
- `components/providers.tsx:192` - `setPoints((prev) => prev + update.points)` - Adds from stored updates

**Scenario:**
- Historical points stored in localStorage via `syncGamePoints()`
- `getStoredPointUpdates()` loaded and applied to local state
- These updates never synced to server (no server write happened)

**Code Evidence:**
- `components/providers.tsx:167` - `const updates = getStoredPointUpdates()`
- `components/providers.tsx:171-174` - Applies ticket updates but comment says "Don't add points from localStorage"
- **BUT:** Line 192 - `setPoints((prev) => prev + update.points)` still adds points from `gamePointsUpdated` event

**Likelihood:** **MEDIUM** - Code tries to avoid loading points from localStorage, but `gamePointsUpdated` event handler (line 192) still adds points.

---

## D) Why game_sessions Has Zero Rows (Ranked)

### D.1 Most Likely: Cryptoku Never Calls record_game_session

**Evidence:**
- `app/api/cryptoku/submit-result/route.ts` - Does NOT call `record_game_session` RPC
- Only calls `update_user_balance` (line 250) and `add_cryptoku_leaderboard_entry` (line 207)
- `record_game_session` RPC (`scripts/03-functions.sql:139-147`) is the ONLY writer for `game_sessions` table

**Code Evidence:**
- Search for `record_game_session` in `submit-result/route.ts` - **NOT FOUND**
- Only Ape In likely calls it (not verified)

**Likelihood:** **CONFIRMED** - Cryptoku submit route does not insert into `game_sessions`.

---

### D.2 Alternative: record_game_session RPC Fails Silently

**Evidence:**
- If RPC was called but failed, no error handling visible
- RLS policies might block INSERT

**Likelihood:** **LOW** - RPC is not called at all (see D.1).

---

## E) Why cryptoku_leaderboard Has No Rows (Ranked)

### E.1 Most Likely: Submit Route Fails Before Leaderboard Insert

**Evidence:**
- `app/api/cryptoku/submit-result/route.ts:136-156` - Profile lookup with retry
- **If profile not found after retries → Returns 425 Too Early** (line 154)
- Leaderboard insert happens at line 207, AFTER profile lookup (line 136)
- **If profile lookup fails, route returns early** → Leaderboard entry never created

**Code Flow:**
```
Line 136: profile = await profileService.getProfileByWallet(normalizedAddress)
Line 140-145: Retry up to 3 times if profile not found
Line 147-156: If still not found → return 425 error (EXITS BEFORE line 207)
Line 207: leaderboardService.addEntry() ← Never reached if profile missing
```

**Likelihood:** **HIGH** - If profile sync happens after game completion, submit route fails early.

---

### E.2 Submit Route Returns Success but addEntry() Fails

**Evidence:**
- `app/api/cryptoku/submit-result/route.ts:220-231` - If `addEntry()` returns false, route returns 500 error
- But if RPC fails silently or returns null/false, entry not created

**Code:**
```typescript
const leaderboardResult = await leaderboardService.addEntry({ ... })
if (!leaderboardResult) {
  return NextResponse.json({ error: "Failed to save leaderboard entry" }, { status: 500 })  // Line 227
}
```

**Likelihood:** **MEDIUM** - Route would return error, but if error is not shown to user, game might think it succeeded.

---

### E.3 Game Never Calls Submit Route

**Evidence:**
- `features/games/cryptoku/cryptokugame.tsx:1337` - Game calls `fetch("/api/cryptoku/submit-result", ...)`
- Only called for ranked modes (DEGEN/APE) - Line 1335: `if (isRanked)`
- If mode is NOOB or not ranked, no API call

**Code:**
```typescript
const isRanked = mode !== "NOOB"  // Line 1333
if (isRanked) {
  const response = await fetch("/api/cryptoku/submit-result", ...)  // Line 1337
}
```

**Likelihood:** **MEDIUM** - If user played NOOB mode only, no submissions happen.

---

### E.4 RLS Policies Block Insert

**Evidence:**
- `supabase/migrations/20260116094000_create_cryptoku_leaderboard_table.sql:264-266` - INSERT policy allows authenticated users
- `add_cryptoku_leaderboard_entry` uses SECURITY DEFINER (line 76), should bypass RLS
- But if policy conflicts exist, INSERT might fail

**Likelihood:** **LOW** - SECURITY DEFINER should bypass RLS, and policy allows INSERT.

---

### E.5 Wallet Address Normalization Mismatch

**Evidence:**
- `app/api/cryptoku/submit-result/route.ts:71` - Normalizes address: `playerAddress.toLowerCase()`
- `app/api/cryptoku/submit-result/route.ts:209` - Passes normalized address to `addEntry()`
- `lib/supabase/services/cryptoku-leaderboard.service.ts:51` - Uses normalized address to find profile
- If address doesn't match profile, `addEntry()` fails

**Likelihood:** **LOW** - Address is normalized consistently.

---

## F) Complete Write Paths Summary

| Data Target | Writer | Caller | Location | Creates Transaction? |
|------------|--------|--------|----------|---------------------|
| `profiles.points` | `update_user_balance` RPC | Cryptoku Submit API | `submit-result/route.ts:250` | ✅ Yes (if p_points_change != 0) |
| `profiles.points` | `update_user_balance` RPC | Client addPoints() | `providers.tsx:553` | ✅ Yes (if sync succeeds) |
| `profiles.points` | `update_user_balance` RPC | record_game_session (internal) | `03-functions.sql:161` | ✅ Yes |
| `leaderboard.total_points` | `update_user_balance` RPC | Same as profiles.points | `03-functions.sql:112` | ✅ Yes (if row exists) |
| `transactions` (points) | `update_user_balance` RPC | All callers above | `03-functions.sql:107` | N/A (creates itself) |
| `game_sessions` | `record_game_session` RPC | ❌ NOT called by Cryptoku | `03-functions.sql:139` | N/A |
| `cryptoku_leaderboard` | `add_cryptoku_leaderboard_entry` RPC | Cryptoku Submit API | `submit-result/route.ts:207` | ❌ No (separate table) |

---

## G) Likely Causes for Phantom 1044 Points (Final Ranking)

### Rank 1: Client-Side Optimistic Updates + Failed Server Sync

**Scenario:**
- User plays Cryptoku → `game-modal.tsx:54` calls `addPoints(score)`
- `addPoints()` updates local state: `points += score` (optimistic)
- Server sync fails (profile not found, not authenticated, RLS blocks)
- Local state has points, but no transaction created
- User plays more games → Points accumulate in local state
- When profile syncs → `profiles.points` loaded from DB (which has API-awarded points)
- BUT if points were added optimistically multiple times without server sync, discrepancy grows

**Evidence:**
- `providers.tsx:537-585` - Optimistic update before server sync
- `providers.tsx:569` - Silent failure on sync (logger.warn only)
- `game-modal.tsx:54` - Cryptoku calls `addPoints()` even though API already awards points

**Fix Needed:** Remove `addPoints()` call from Cryptoku game end, or ensure it doesn't run if API already awarded points.

---

### Rank 2: Double-Award (API Route + Client addPoints)

**Scenario:**
1. Cryptoku completes → API route awards 500 points (adds transaction)
2. Game end callback → `addPoints(500)` called (client-side)
3. Client tries to sync → `update_user_balance` called again
4. If sync succeeds: Double-award (1000 points total, 2 transactions) - but only 473 transactions exist, so this is unlikely
5. If sync fails: Local state has 500 extra points, DB has 500 from API → Discrepancy

**Evidence:**
- `cryptokugame.tsx:1388` - Game end metadata includes `points`
- `game-modal.tsx:54` - Calls `addPoints(result.metadata.points)`
- This happens AFTER API route already awarded points

**Fix Needed:** Remove `addPoints()` call OR check if API already awarded points before calling.

---

### Rank 3: Historical getStoredPointUpdates() Accumulation

**Scenario:**
- Points stored in localStorage via `syncGamePoints()`
- `gamePointsUpdated` event (line 192) adds points to local state
- These never synced to server (no server write)
- Points accumulated over time

**Evidence:**
- `providers.tsx:192` - `setPoints((prev) => prev + update.points)` from event
- `lib/game-session.ts:80-97` - `syncGamePoints()` stores in localStorage

**Likelihood:** **MEDIUM** - Code tries to avoid loading from localStorage, but event handler still adds points.

---

### Rank 4: Direct SQL Update (Historical)

**Scenario:**
- Manual SQL or migration directly updated `profiles.points`
- Bypassed `update_user_balance` RPC (no transaction created)

**Evidence:**
- No active migrations found that do this
- Possible during development/testing

**Likelihood:** **LOW** - No evidence, but possible.

---

## H) Why game_sessions Is Empty (Final Ranking)

### Rank 1: Cryptoku Submit Route Never Calls record_game_session

**Confirmed:** `app/api/cryptoku/submit-result/route.ts` does NOT call `record_game_session` RPC.

**Fix Needed:** Add `record_game_session` call after points are awarded (line 281).

---

### Rank 2: record_game_session RPC Fails (If Called)

**Unlikely** - RPC is not called at all.

---

## I) Why cryptoku_leaderboard Is Empty (Final Ranking)

### Rank 1: Profile Not Found → Route Returns 425 Before Leaderboard Insert

**Scenario:**
- User plays Cryptoku → Submit route called
- Profile lookup fails (line 136) → Retry up to 3 times (line 140-145)
- Still not found → Return 425 Too Early (line 154)
- Leaderboard insert (line 207) never reached

**Evidence:**
- `submit-result/route.ts:147-156` - Early return if profile not found
- `submit-result/route.ts:207` - Leaderboard insert happens after profile lookup

**Fix Needed:** Ensure profile exists before game completion, or create profile in submit route if missing.

---

### Rank 2: addEntry() Returns False (Silent Failure)

**Scenario:**
- `CryptokuLeaderboardService.addEntry()` called (line 207)
- Returns `false` (profile not found, RPC fails, etc.)
- Route returns 500 error (line 227)
- But if error not shown, game thinks it succeeded

**Evidence:**
- `submit-result/route.ts:220-231` - Checks `leaderboardResult`, returns 500 if false

---

### Rank 3: User Only Played NOOB Mode

**Scenario:**
- NOOB mode games don't call submit route (`cryptokugame.tsx:1335` - `if (isRanked)`)
- No leaderboard entries created for NOOB mode

**Evidence:**
- `cryptokugame.tsx:1333-1335` - Only ranked modes call API

---

## J) Test Checklist

### J.1 Network Tab Checks

1. **Cryptoku Game Completion:**
   - Open DevTools → Network tab
   - Play Cryptoku (DEGEN or APE mode)
   - Check for `POST /api/cryptoku/submit-result` request
   - Verify:
     - Request status: 200 (success) or 425/500 (failure)
     - Response body: `{ success: true, pointsEarned: ... }`
     - Request payload: Contains `playerAddress`, `mode`, `runId`, etc.

2. **Leaderboard Fetch:**
   - Navigate to Leaderboard page → Cryptoku tab
   - Check for `GET /api/cryptoku/leaderboard?mode=DEGEN&limit=100`
   - Verify:
     - Request status: 200
     - Response body: `{ entries: [...], total: N }`

3. **Profile Sync:**
   - Check for profile lookup calls (if any)
   - Verify wallet address normalization (lowercase)

---

### J.2 Supabase Query Checks

**Run in Supabase SQL Editor:**

```sql
-- 1. Check profiles.points vs transactions sum
SELECT 
  p.wallet_address,
  p.points as profile_points,
  (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = p.id AND currency = 'points') as transactions_sum,
  (p.points - (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = p.id AND currency = 'points')) as discrepancy
FROM profiles p
WHERE LOWER(p.wallet_address) = LOWER('YOUR_WALLET_ADDRESS_HERE');

-- 2. Check leaderboard row existence
SELECT 
  p.wallet_address,
  p.points as profile_points,
  COALESCE(l.total_points, 0) as leaderboard_points,
  CASE WHEN l.user_id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as leaderboard_row_status
FROM profiles p
LEFT JOIN leaderboard l ON p.id = l.user_id
WHERE LOWER(p.wallet_address) = LOWER('YOUR_WALLET_ADDRESS_HERE');

-- 3. Check game_sessions rows
SELECT 
  game_type,
  game_mode,
  score,
  points_earned,
  duration,
  result,
  started_at,
  created_at
FROM game_sessions
WHERE user_id = (SELECT id FROM profiles WHERE LOWER(wallet_address) = LOWER('YOUR_WALLET_ADDRESS_HERE'))
ORDER BY COALESCE(started_at, created_at) DESC
LIMIT 10;

-- 4. Check cryptoku_leaderboard rows
SELECT 
  run_id,
  mode,
  score,
  time_seconds,
  hints_used,
  errors,
  completed,
  forfeited,
  created_at
FROM cryptoku_leaderboard
WHERE user_id = (SELECT id FROM profiles WHERE LOWER(wallet_address) = LOWER('YOUR_WALLET_ADDRESS_HERE'))
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check transactions (points only)
SELECT 
  transaction_type,
  amount,
  currency,
  description,
  created_at
FROM transactions
WHERE user_id = (SELECT id FROM profiles WHERE LOWER(wallet_address) = LOWER('YOUR_WALLET_ADDRESS_HERE'))
AND currency = 'points'
ORDER BY created_at DESC;

-- 6. Check if profile exists and when created
SELECT 
  id,
  wallet_address,
  points,
  created_at,
  updated_at
FROM profiles
WHERE LOWER(wallet_address) = LOWER('YOUR_WALLET_ADDRESS_HERE');
```

---

### J.3 Expected Rows After Game Completion

**After playing ONE Cryptoku game (DEGEN or APE mode):**

**Expected:**
- `transactions` table: **1 new row** with `currency = 'points'`, `amount = score`
- `profiles.points`: **Incremented by score**
- `leaderboard.total_points`: **Incremented by score** (if row exists)
- `cryptoku_leaderboard`: **1 new row** with `mode = 'DEGEN'` or `'APE'`
- `game_sessions`: **0 rows** (Cryptoku doesn't call `record_game_session`)

**Actual (from user's report):**
- `transactions` sum = 473 ✅
- `profiles.points` = 1516 ❌ (should be 473 if only transactions)
- `leaderboard.total_points` = 472 ✅ (matches transactions)
- `cryptoku_leaderboard` = 0 rows ❌
- `game_sessions` = 0 rows ✅ (expected, but wrong - should have rows)

---

## K) Data Flow Diagrams

### K.1 Read Paths

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER POINTS                                                │
└─────────────────────────────────────────────────────────────┘
topbar.tsx:47
  ↓
useArcade().points (React Context)
  ↓
providers.tsx:353-355 → setPoints(dbPoints)
  ↓
ProfileService.getProfileByWallet()
  ↓
SELECT profiles.points WHERE wallet_address = ?
  ↓
[profiles.points = 1516] ← SOURCE OF TRUTH

┌─────────────────────────────────────────────────────────────┐
│ PROFILE PAGE POINTS                                          │
└─────────────────────────────────────────────────────────────┘
profile-view.tsx:584
  ↓
useArcade().points (React Context) ← SAME AS HEADER
  ↓
[profiles.points = 1516] ← SAME SOURCE

┌─────────────────────────────────────────────────────────────┐
│ LEADERBOARD "YOUR POINTS"                                    │
└─────────────────────────────────────────────────────────────┘
leaderboard-view.tsx:270
  ↓
userPoints state (from getTopByPoints())
  ↓
LeaderboardService.getTopByPoints(100)
  ↓
RPC: get_leaderboard(p_limit: 100)
  ↓
SELECT ... FROM leaderboard l JOIN profiles p ... ORDER BY l.total_points DESC
  ↓
[leaderboard.total_points = 472] ← DIFFERENT SOURCE!

┌─────────────────────────────────────────────────────────────┐
│ CRYPTOKU TAB LEADERBOARD                                     │
└─────────────────────────────────────────────────────────────┘
leaderboard-view.tsx:337
  ↓
GET /api/cryptoku/leaderboard?mode={mode}&limit=100
  ↓
CryptokuLeaderboardService.getLeaderboard(mode, limit)
  ↓
RPC: get_cryptoku_leaderboard(p_mode, p_limit)
  ↓
SELECT ... FROM cryptoku_leaderboard WHERE mode = ? ...
  ↓
[cryptoku_leaderboard table] ← EMPTY (0 rows)
```

---

### K.2 Write Paths

```
┌─────────────────────────────────────────────────────────────┐
│ CRYPTOKU GAME COMPLETION                                     │
└─────────────────────────────────────────────────────────────┘
cryptokugame.tsx:1337
  ↓
POST /api/cryptoku/submit-result
  ↓
app/api/cryptoku/submit-result/route.ts:48

Path A: Profile Lookup (Line 136-156)
  ↓
ProfileService.getProfileByWallet(normalizedAddress)
  ↓
[If profile NOT found → Retry 3x → Still not found → Return 425] ← EXIT POINT

Path B: Leaderboard Entry (Line 207-218)
  ↓
CryptokuLeaderboardService.addEntry()
  ↓
RPC: add_cryptoku_leaderboard_entry(...)
  ↓
INSERT INTO cryptoku_leaderboard ... ← CREATES ENTRY

Path C: Points Award (Line 250-281)
  ↓
adminClient.rpc('update_user_balance', { p_points_change: pointsEarned })
  ↓
UPDATE profiles SET points = points + p_points_change ← UPDATES profiles.points
  ↓
INSERT INTO transactions ... ← CREATES TRANSACTION
  ↓
UPDATE leaderboard SET total_points = ... ← UPDATES leaderboard.total_points (IF ROW EXISTS)

Path D: ❌ MISSING - record_game_session
  ↓
[NOT CALLED] ← game_sessions NOT INSERTED, stats NOT UPDATED

┌─────────────────────────────────────────────────────────────┐
│ CLIENT-SIDE addPoints() (FROM GAME END CALLBACK)            │
└─────────────────────────────────────────────────────────────┘
game-modal.tsx:54
  ↓
addPoints(result.metadata.points)
  ↓
providers.tsx:530-585

Step 1: Optimistic Update (Line 537-539)
  ↓
setPoints((prev) => prev + amount) ← LOCAL STATE ONLY

Step 2: Server Sync Attempt (Line 544-577)
  ↓
ProfileService.updateBalance(profile.id, 0, 0, amount)
  ↓
Anon client RPC: update_user_balance(...)
  ↓
[If sync succeeds → UPDATE profiles.points + INSERT transaction]
[If sync fails → logger.warn() but local state already updated] ← PHANTOM POINTS SOURCE

┌─────────────────────────────────────────────────────────────┐
│ WHAT SHOULD HAPPEN (RECORD_GAME_SESSION)                    │
└─────────────────────────────────────────────────────────────┘
❌ NOT CALLED BY CRYPTOKU

If called:
  ↓
RPC: record_game_session(...)
  ↓
INSERT INTO game_sessions ... ← CREATES game_sessions ROW
  ↓
UPDATE profiles SET total_games_played += 1, total_wins += 1, ... ← UPDATES STATS
  ↓
PERFORM update_user_balance(...) ← AWARDS POINTS (internal call)
```

---

## L) Summary: Root Causes Identified

### L.1 Phantom 1044 Points

**Primary Cause:** **Client-side optimistic updates via `addPoints()` that fail server sync**

**Mechanism:**
1. Cryptoku game end → `game-modal.tsx:54` calls `addPoints(score)`
2. `addPoints()` updates local React state FIRST (optimistic)
3. Server sync attempted but fails silently (profile not found, not authenticated, RLS blocks)
4. Points accumulate in local state without server write
5. Later, `profiles.points` loaded from DB (which has API-awarded points)
6. Discrepancy: Local state points (from failed `addPoints()`) vs DB points (from API route)

**Additional Factors:**
- Double-award risk: API route awards points, THEN `addPoints()` also called
- Historical `gamePointsUpdated` events adding points without server sync

---

### L.2 Zero Stats (game_sessions Empty)

**Primary Cause:** **Cryptoku submit route never calls `record_game_session` RPC**

**Mechanism:**
- `app/api/cryptoku/submit-result/route.ts` only calls:
  - `update_user_balance` (awards points)
  - `add_cryptoku_leaderboard_entry` (creates leaderboard entry)
- `record_game_session` RPC is the ONLY writer for:
  - `game_sessions` table (Recent Activity)
  - `profiles.total_games_played`, `total_wins`, `win_streak`, etc. (Stats)

---

### L.3 Empty cryptoku_leaderboard

**Primary Cause:** **Profile lookup fails → Route returns 425 before leaderboard insert**

**Mechanism:**
- `submit-result/route.ts:136` - Profile lookup
- If profile not found after 3 retries (line 140-145) → Return 425 Too Early (line 154)
- Leaderboard insert (line 207) happens AFTER profile lookup
- If route exits early, leaderboard insert never reached

---

## M) File + Line Number Reference

### Read Paths

| UI Element | File | Line(s) | Reads From |
|-----------|------|---------|------------|
| Header points | `components/topbar.tsx` | 10, 47 | `useArcade().points` → `profiles.points` |
| Profile points | `features/profile/profile-view.tsx` | 37, 584 | `useArcade().points` → `profiles.points` |
| Leaderboard "Your Points" | `features/leaderboard/leaderboard-view.tsx` | 45, 49, 81, 105, 270 | `getTopByPoints()` → `leaderboard.total_points` |
| Leaderboard rows | `features/leaderboard/leaderboard-view.tsx` | 84-93, 582 | `getTopByPoints()` → `leaderboard.total_points` |
| Cryptoku tab | `features/leaderboard/leaderboard-view.tsx` | 137, 144-152 | `/api/cryptoku/leaderboard` → `cryptoku_leaderboard` table |
| Profile stats | `features/profile/profile-view.tsx` | 70, 91, 427-434 | `ProfileService.getProfileByWallet()` → `profiles.*_games_played` etc. |
| Recent activity | `features/profile/profile-view.tsx` | 72, 650-666 | `GameService.getRecentGames()` → `game_sessions` table |

### Write Paths

| Data Target | File | Line(s) | Writer | Creates Transaction? |
|------------|------|---------|--------|---------------------|
| `profiles.points` | `scripts/03-functions.sql` | 92 | `update_user_balance` RPC | ✅ Yes |
| `leaderboard.total_points` | `scripts/03-functions.sql` | 112 | `update_user_balance` RPC | ✅ Yes (if row exists) |
| `transactions` (points) | `scripts/03-functions.sql` | 107 | `update_user_balance` RPC | N/A |
| `game_sessions` | `scripts/03-functions.sql` | 139 | `record_game_session` RPC | ❌ Not called by Cryptoku |
| `cryptoku_leaderboard` | `supabase/migrations/20260116094000_create_cryptoku_leaderboard_table.sql` | 115 | `add_cryptoku_leaderboard_entry` RPC | ❌ No (separate table) |

### Call Sites

| Caller | File | Line(s) | Calls | Notes |
|--------|------|---------|-------|-------|
| Cryptoku Submit API | `app/api/cryptoku/submit-result/route.ts` | 250 | `update_user_balance` RPC | Admin client |
| Cryptoku Submit API | `app/api/cryptoku/submit-result/route.ts` | 207 | `add_cryptoku_leaderboard_entry` RPC | Admin client |
| Cryptoku Game End | `components/game-modal.tsx` | 54 | `addPoints()` | Client-side optimistic |
| Client addPoints | `components/providers.tsx` | 553 | `update_user_balance` RPC | Anon client (may fail) |

---

## N) Test Checklist (Network + Supabase)

### N.1 Network Tab (DevTools)

**When playing Cryptoku:**

1. ✅ `POST /api/cryptoku/submit-result` request exists
2. ✅ Request status = 200 (success) or error code
3. ✅ Response body contains `{ success: true, pointsEarned: N }` OR error message
4. ✅ Request payload contains: `playerAddress`, `mode` (DEGEN/APE), `runId`

**When viewing Cryptoku leaderboard:**

5. ✅ `GET /api/cryptoku/leaderboard?mode=DEGEN&limit=100` request exists
6. ✅ Request status = 200
7. ✅ Response body contains `{ entries: [...], total: N }`

---

### N.2 Supabase Queries

**Run these in Supabase SQL Editor (replace YOUR_WALLET_ADDRESS_HERE):**

```sql
-- Test 1: Points discrepancy
SELECT 
  p.wallet_address,
  p.points as profile_points,
  (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = p.id AND currency = 'points') as transactions_sum,
  (p.points - (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = p.id AND currency = 'points')) as phantom_points
FROM profiles p
WHERE LOWER(p.wallet_address) = LOWER('YOUR_WALLET_ADDRESS_HERE');

-- Expected: phantom_points = 1044

-- Test 2: Leaderboard row status
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM leaderboard WHERE user_id = (
      SELECT id FROM profiles WHERE LOWER(wallet_address) = LOWER('YOUR_WALLET_ADDRESS_HERE')
    )
  ) THEN 'EXISTS' ELSE 'MISSING' END as leaderboard_row_status;

-- Test 3: game_sessions count
SELECT COUNT(*) as game_sessions_count
FROM game_sessions
WHERE user_id = (SELECT id FROM profiles WHERE LOWER(wallet_address) = LOWER('YOUR_WALLET_ADDRESS_HERE'));

-- Expected: 0

-- Test 4: cryptoku_leaderboard count
SELECT COUNT(*) as cryptoku_leaderboard_count
FROM cryptoku_leaderboard
WHERE user_id = (SELECT id FROM profiles WHERE LOWER(wallet_address) = LOWER('YOUR_WALLET_ADDRESS_HERE'));

-- Expected: 0 (but should be > 0 if games played)

-- Test 5: All transactions
SELECT 
  transaction_type,
  amount,
  currency,
  description,
  created_at
FROM transactions
WHERE user_id = (SELECT id FROM profiles WHERE LOWER(wallet_address) = LOWER('YOUR_WALLET_ADDRESS_HERE'))
ORDER BY created_at DESC;

-- Expected: 473 points total (472 game_reward + 1 test)
```

---

**END OF AUDIT**
