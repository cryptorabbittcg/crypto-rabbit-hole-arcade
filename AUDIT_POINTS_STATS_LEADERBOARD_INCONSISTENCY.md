# Audit Report: Points, Stats, and Leaderboard Data Inconsistency

**Date:** 2025-01-XX  
**Status:** AUDIT ONLY - NO CODE CHANGES  
**Issue:** Multiple sources of truth causing data parity issues between header/profile (1516 points) and leaderboard (472 points), plus zero stats on profile page.

---

## Executive Summary

The application has **three separate data sources** for points:
1. **`profiles.points`** - Updated via `update_user_balance` RPC → Used by header/profile (shows 1516)
2. **`leaderboard.total_points`** - Updated via `update_user_balance` RPC → Used by leaderboard page (shows 472)
3. **`cryptoku_leaderboard`** table - Used by Cryptoku tab (shows "No scores yet")

**Root Causes:**
- `update_user_balance` RPC updates both `profiles.points` and `leaderboard.total_points`, but these may be out of sync if:
  - `leaderboard` row doesn't exist for the user
  - Direct updates to `profiles.points` bypass `leaderboard` sync
  - Historical data exists before leaderboard sync was implemented

- **Stats are zero** because `record_game_session` RPC is **NOT being called** for Cryptoku completions. Cryptoku uses a custom submit route that only calls `update_user_balance`, missing the stats counters.

- **Recent activity is empty** because `game_sessions` table is **NOT being populated** for Cryptoku games (only `cryptoku_leaderboard` entries are created).

- **Cryptoku tab shows "No scores"** because the API route exists but may not have entries, or there's a query/mode mismatch.

---

## A) What Drives Header Points

**Component:** `components/topbar.tsx`  
**Line:** 10, 47

**Data Flow:**
```
topbar.tsx:10 → useArcade().points (React Context)
  ↓
components/providers.tsx:353-355 → profiles.points (from Supabase)
  ↓
ProfileService.getProfileByWallet() → SELECT profiles.points WHERE wallet_address = ?
  ↓
Supabase Table: profiles.points
```

**Key Code References:**
- **Read:** `components/topbar.tsx:10,47` - `const { points } = useArcade()` → `{points}`
- **Load:** `components/providers.tsx:353-355` - `const dbPoints = (existingProfile as any).points || 0` → `setPoints(dbPoints)`
- **Source:** `profiles.points` column in Supabase (updated via `update_user_balance` RPC)

---

## B) What Drives Profile Page Points

**Component:** `features/profile/profile-view.tsx`  
**Line:** 37, 584

**Data Flow:**
```
profile-view.tsx:37 → useArcade().points (React Context)
  ↓
components/providers.tsx:353-355 → profiles.points (from Supabase)
  ↓
ProfileService.getProfileByWallet() → SELECT profiles.points WHERE wallet_address = ?
  ↓
Supabase Table: profiles.points
```

**Key Code References:**
- **Read:** `features/profile/profile-view.tsx:37` - `const { points } = useArcade()`
- **Display:** `features/profile/profile-view.tsx:584` - `<div className="text-3xl font-bold text-cyan-400">{points}</div>`
- **Source:** Same as header - `profiles.points` via React Context (`useArcade()`)

**Note:** Profile page also loads `supabaseProfile` (`profile-view.tsx:91`), but the displayed points value comes from the React Context `points` state, not from `supabaseProfile.points`.

---

## C) What Drives Leaderboard Points (Overall + Per-Mode)

### Overall Leaderboard

**Component:** `features/leaderboard/leaderboard-view.tsx`  
**Line:** 76-117

**Data Flow:**
```
leaderboard-view.tsx:81 → LeaderboardService.getTopByPoints(100)
  ↓
lib/supabase/services/leaderboard.service.ts:186 → RPC get_leaderboard(p_limit)
  ↓
scripts/03-functions.sql:285-298 → SELECT FROM leaderboard JOIN profiles
  ↓
Supabase Table: leaderboard.total_points
```

**Key Code References:**
- **Fetch:** `features/leaderboard/leaderboard-view.tsx:81` - `await leaderboardService.getTopByPoints(100)`
- **RPC Call:** `lib/supabase/services/leaderboard.service.ts:186` - `this.supabase.rpc("get_leaderboard", { p_limit: limit })`
- **SQL Query:** `scripts/03-functions.sql:285-298` - `SELECT ... FROM leaderboard l JOIN profiles p ... ORDER BY l.total_points DESC`
- **Source:** `leaderboard.total_points` column (updated via `update_user_balance` RPC when `p_points_change != 0`)

**User's Own Points on Leaderboard:**
- `leaderboard-view.tsx:105` - `setUserPoints(userEntry.score)` where `score = entry.total_points` from RPC response
- This comes from the same `leaderboard.total_points` as the list

### Cryptoku Leaderboard Tab

**Component:** `features/leaderboard/leaderboard-view.tsx`  
**Line:** 132-163

**Data Flow:**
```
leaderboard-view.tsx:137 → GET /api/cryptoku/leaderboard?mode={mode}&limit=100
  ↓
app/api/cryptoku/leaderboard/route.ts:14 → CryptokuLeaderboardService.getLeaderboard(mode, limit)
  ↓
lib/supabase/services/cryptoku-leaderboard.service.ts (not shown, but likely queries cryptoku_leaderboard table)
  ↓
Supabase Table: cryptoku_leaderboard
```

**Key Code References:**
- **Fetch:** `features/leaderboard/leaderboard-view.tsx:137` - `fetch(\`/api/cryptoku/leaderboard?mode=${mode}&limit=100\`)`
- **API Route:** `app/api/cryptoku/leaderboard/route.ts:14` - `leaderboardService.getLeaderboard(validatedMode, limit)`
- **Source:** `cryptoku_leaderboard` table (inserted via `CryptokuLeaderboardService.addEntry()` in submit-result route)

---

## D) Why 1516 vs 472 is Happening

**Problem:** `profiles.points = 1516`, but `leaderboard.total_points = 472` (or missing entry)

**Root Cause:** The `update_user_balance` RPC updates both tables, but they can get out of sync:

1. **Missing `leaderboard` Row:**
   - `update_user_balance` RPC (scripts/03-functions.sql:111-113) does `UPDATE leaderboard SET total_points = total_points + p_points_change WHERE user_id = p_user_id`
   - **If the `leaderboard` row doesn't exist, this UPDATE does nothing** (no INSERT happens)
   - The `profiles.points` still gets updated, but `leaderboard.total_points` remains 0 or stale

2. **Direct `profiles.points` Updates:**
   - If points were added directly to `profiles.points` (bypassing `update_user_balance`), `leaderboard.total_points` wouldn't sync
   - Code at `components/providers.tsx:530-586` (addPoints) calls `update_user_balance`, but historical data may predate this

3. **Historical Artifact (1044 points):**
   - 1516 - 472 = 1044 points
   - This suggests `profiles.points` accumulated 1044 points that were never synced to `leaderboard.total_points`
   - Possible reasons:
     - Points added before `leaderboard` table/row existed
     - Direct SQL updates to `profiles.points`
     - Race conditions where `leaderboard` row wasn't created yet

**Code Evidence:**
- `scripts/03-functions.sql:86-115` - `update_user_balance` updates `profiles.points` (line 92) AND `leaderboard.total_points` (line 112), but only if `p_points_change != 0` and `leaderboard` row exists
- No INSERT or UPSERT logic for `leaderboard` table - relies on row existing

**Where 1516 Comes From:**
- `profiles.points` column (direct queries or accumulated via `update_user_balance`)

**Where 472 Comes From:**
- `leaderboard.total_points` column (only updated when `leaderboard` row exists)

---

## E) Why Profile Stats and Recent Activity Are Zeros

### Profile Stats (games played, wins, losses, win streak, playtime)

**Component:** `features/profile/profile-view.tsx`  
**Line:** 427-434

**Data Source:**
```
profile-view.tsx:427-434 → supabaseProfile.total_games_played, total_wins, total_losses, win_streak, best_win_streak, total_playtime
  ↓
ProfileService.getProfileByWallet() → SELECT profiles.* WHERE wallet_address = ?
  ↓
Supabase Table: profiles.total_games_played, total_wins, total_losses, win_streak, best_win_streak, total_playtime
```

**Problem:** These fields are **updated by `record_game_session` RPC** (`scripts/03-functions.sql:149-158`), but **Cryptoku submit route does NOT call it**.

**Code Evidence:**
- `app/api/cryptoku/submit-result/route.ts:250` - Only calls `update_user_balance` RPC for points
- `record_game_session` RPC updates:
  - `total_games_played += 1` (line 152)
  - `total_wins += 1` if won (line 153)
  - `total_losses += 1` if lost (line 154)
  - `win_streak` (line 155)
  - `best_win_streak` (line 156)
  - `total_playtime += p_duration` (line 157)

**Missing Call:**
- Cryptoku submit should call `record_game_session` after awarding points, but it doesn't (route.ts:250 only calls `update_user_balance`)

---

### Recent Activity

**Component:** `features/profile/profile-view.tsx`  
**Line:** 45, 72, 650-666

**Data Source:**
```
profile-view.tsx:72 → GameService.getRecentGames(profileAddress, 10)
  ↓
lib/supabase/services/game.service.ts:151-161 → getRecentGamesNormalized(userId, limit)
  ↓
lib/supabase/services/game.service.ts:102-105 → SELECT FROM game_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?
  ↓
Supabase Table: game_sessions
```

**Problem:** `game_sessions` table is **NOT populated for Cryptoku games**. Cryptoku only creates entries in `cryptoku_leaderboard`, not `game_sessions`.

**Code Evidence:**
- `app/api/cryptoku/submit-result/route.ts:207-218` - Creates `cryptoku_leaderboard` entry via `CryptokuLeaderboardService.addEntry()`
- **No `game_sessions` INSERT** happens in Cryptoku submit route
- `record_game_session` RPC (which inserts into `game_sessions`) is never called (see above)

---

## F) Why Cryptoku Tab Says "No Scores Yet"

**Component:** `features/leaderboard/leaderboard-view.tsx`  
**Line:** 332-334

**Problem:** The API route fetches from `cryptoku_leaderboard` table, but either:
1. No entries exist for the user/mode
2. Query filters exclude the entries (mode mismatch, wallet address normalization)
3. RLS policies block the query

**Code Evidence:**
- `features/leaderboard/leaderboard-view.tsx:137` - Fetches `/api/cryptoku/leaderboard?mode=${mode}&limit=100`
- `app/api/cryptoku/leaderboard/route.ts:14` - Calls `CryptokuLeaderboardService.getLeaderboard(mode, limit)`
- `app/api/cryptoku/submit-result/route.ts:207-218` - Inserts into `cryptoku_leaderboard` with `mode`, `address` (normalized), `score`

**Possible Causes:**
- `cryptoku_leaderboard` entries exist but mode filter doesn't match
- Wallet address case mismatch (submit normalizes to lowercase, query might not)
- RLS policies on `cryptoku_leaderboard` table preventing reads

---

## G) DB Queries to Validate

Run these in Supabase SQL Editor to confirm actual database state:

```sql
-- 1. Check profiles.points (header/profile source)
SELECT 
  wallet_address,
  points,
  total_games_played,
  total_wins,
  total_losses,
  win_streak,
  best_win_streak,
  total_playtime
FROM profiles
WHERE LOWER(wallet_address) = LOWER('YOUR_WALLET_ADDRESS_HERE');

-- 2. Check leaderboard.total_points (leaderboard source)
SELECT 
  l.user_id,
  l.total_points,
  p.wallet_address,
  p.points as profile_points
FROM leaderboard l
JOIN profiles p ON l.user_id = p.id
WHERE LOWER(p.wallet_address) = LOWER('YOUR_WALLET_ADDRESS_HERE');

-- 3. Check if leaderboard row exists (if missing, explains 472 vs 1516)
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM leaderboard WHERE user_id = (
      SELECT id FROM profiles WHERE LOWER(wallet_address) = LOWER('YOUR_WALLET_ADDRESS_HERE')
    )
  ) THEN 'EXISTS' ELSE 'MISSING' END as leaderboard_row_status;

-- 4. Check cryptoku_leaderboard entries
SELECT 
  address,
  mode,
  score,
  time_seconds,
  hints_used,
  errors,
  created_at
FROM cryptoku_leaderboard
WHERE LOWER(address) = LOWER('YOUR_WALLET_ADDRESS_HERE')
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check game_sessions (recent activity source)
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
WHERE user_id = (
  SELECT id FROM profiles WHERE LOWER(wallet_address) = LOWER('YOUR_WALLET_ADDRESS_HERE')
)
ORDER BY COALESCE(started_at, created_at) DESC
LIMIT 10;

-- 6. Calculate points discrepancy
SELECT 
  p.points as profile_points,
  COALESCE(l.total_points, 0) as leaderboard_points,
  (p.points - COALESCE(l.total_points, 0)) as discrepancy
FROM profiles p
LEFT JOIN leaderboard l ON p.id = l.user_id
WHERE LOWER(p.wallet_address) = LOWER('YOUR_WALLET_ADDRESS_HERE');

-- 7. Check transactions for points history (to see where 1516 came from)
SELECT 
  transaction_type,
  amount,
  currency,
  description,
  created_at
FROM transactions
WHERE user_id = (
  SELECT id FROM profiles WHERE LOWER(wallet_address) = LOWER('YOUR_WALLET_ADDRESS_HERE')
)
AND currency = 'points'
ORDER BY created_at DESC
LIMIT 20;
```

---

## H) Fix Plan (NO CODE CHANGES YET)

### Phase 1: Immediate Data Sync

**Issue:** `profiles.points` = 1516, `leaderboard.total_points` = 472 (or missing)

**Fix:**
1. **Ensure `leaderboard` row exists for all users with `profiles.points > 0`:**
   ```sql
   INSERT INTO leaderboard (user_id, total_points)
   SELECT id, points
   FROM profiles
   WHERE points > 0
   AND id NOT IN (SELECT user_id FROM leaderboard WHERE user_id IS NOT NULL)
   ON CONFLICT (user_id) DO UPDATE SET total_points = profiles.points;
   ```

2. **Sync existing points:**
   ```sql
   UPDATE leaderboard l
   SET total_points = p.points
   FROM profiles p
   WHERE l.user_id = p.id
   AND l.total_points != p.points;
   ```

3. **Update `update_user_balance` RPC to ensure `leaderboard` row exists:**
   - Modify `scripts/03-functions.sql:86-115` to INSERT or UPDATE `leaderboard` row if missing
   - Add: `INSERT INTO leaderboard (user_id, total_points) VALUES (p_user_id, p_points_change) ON CONFLICT (user_id) DO UPDATE SET total_points = leaderboard.total_points + p_points_change;`
   - Move this BEFORE the UPDATE to ensure row exists

---

### Phase 2: Fix Stats Updates

**Issue:** `total_games_played`, `total_wins`, `win_streak`, etc. are zero because `record_game_session` isn't called for Cryptoku

**Fix:**
1. **Call `record_game_session` RPC in Cryptoku submit route:**
   - Modify `app/api/cryptoku/submit-result/route.ts`
   - After awarding points (line 250), call:
     ```typescript
     await adminClient.rpc('record_game_session', {
       p_user_id: profile.id,
       p_game_type: 'cryptoku',
       p_game_mode: mode,
       p_duration: timeSeconds,
       p_result: 'won', // Cryptoku completion is always a win
       p_ape_earned: 0,
       p_tickets_earned: 0,
       p_points_earned: pointsEarned,
     })
     ```
   - This will:
     - Insert `game_sessions` row (fixes "Recent Activity" empty)
     - Update `profiles.total_games_played`, `total_wins`, `win_streak`, `total_playtime` (fixes zero stats)

**Note:** `record_game_session` RPC already calls `update_user_balance` internally (line 161), so we might be double-awarding points. Check if we should remove the direct `update_user_balance` call or if `record_game_session` should skip balance updates for Cryptoku.

**Alternative:** If `record_game_session` already awards points, remove the direct `update_user_balance` call in submit-result route (line 250).

---

### Phase 3: Fix Cryptoku Leaderboard Display

**Issue:** "No Cryptoku scores yet" despite games played

**Fix:**
1. **Verify entries exist:**
   - Run Query #4 from Section G above
   - Confirm `cryptoku_leaderboard` has entries with correct `mode` and normalized `address`

2. **Check API route:**
   - Verify `CryptokuLeaderboardService.getLeaderboard()` queries with `LOWER(address) = LOWER(?)` for normalization
   - Check RLS policies on `cryptoku_leaderboard` table allow reads

3. **Debug mode filter:**
   - Ensure mode values match exactly: "DEGEN" or "APE" (uppercase)
   - Check submit route stores mode as uppercase (`route.ts:210`)

---

### Phase 4: Prevent Future Desync

**Issue:** `profiles.points` and `leaderboard.total_points` can diverge

**Fix:**
1. **Make `update_user_balance` RPC idempotent:**
   - Always ensure `leaderboard` row exists (INSERT if missing)
   - Use `INSERT ... ON CONFLICT DO UPDATE` pattern

2. **Add database trigger (optional):**
   - Trigger on `profiles.points` UPDATE to sync `leaderboard.total_points`
   - OR: Remove direct `profiles.points` updates, only allow via `update_user_balance` RPC

3. **Audit all points update paths:**
   - Search codebase for direct `profiles.points` updates
   - Ensure all paths use `update_user_balance` RPC or update both tables atomically

---

### Phase 5: Data Migration (One-Time)

**Issue:** Historical game sessions missing (stats are zero)

**Fix:**
1. **Backfill `game_sessions` from `cryptoku_leaderboard`:**
   ```sql
   INSERT INTO game_sessions (
     user_id,
     game_type,
     game_mode,
     duration,
     result,
     points_earned,
     score,
     started_at,
     created_at
   )
   SELECT 
     p.id,
     'cryptoku',
     cl.mode,
     cl.time_seconds,
     'won',
     cl.score, -- Assuming score = points_earned
     cl.score,
     TO_TIMESTAMP(cl.timestamp / 1000),
     TO_TIMESTAMP(cl.timestamp / 1000)
   FROM cryptoku_leaderboard cl
   JOIN profiles p ON LOWER(p.wallet_address) = LOWER(cl.address)
   WHERE NOT EXISTS (
     SELECT 1 FROM game_sessions gs 
     WHERE gs.user_id = p.id 
     AND gs.game_type = 'cryptoku'
     AND gs.score = cl.score
     AND ABS(EXTRACT(EPOCH FROM (gs.started_at - TO_TIMESTAMP(cl.timestamp / 1000)))) < 60
   );
   ```

2. **Recalculate stats from `game_sessions`:**
   - After backfilling, stats should auto-update, OR run a migration to recalculate:
   ```sql
   UPDATE profiles p
   SET 
     total_games_played = (SELECT COUNT(*) FROM game_sessions WHERE user_id = p.id),
     total_wins = (SELECT COUNT(*) FROM game_sessions WHERE user_id = p.id AND result = 'won'),
     total_losses = (SELECT COUNT(*) FROM game_sessions WHERE user_id = p.id AND result = 'lost'),
     total_playtime = (SELECT COALESCE(SUM(duration), 0) FROM game_sessions WHERE user_id = p.id)
   WHERE EXISTS (SELECT 1 FROM game_sessions WHERE user_id = p.id);
   ```

---

## Summary of Root Causes

1. **1516 vs 472 Points:**
   - `leaderboard` row missing or stale → `update_user_balance` RPC updates `profiles.points` but not `leaderboard.total_points`
   - Historical points added before `leaderboard` sync existed

2. **Zero Stats:**
   - `record_game_session` RPC not called for Cryptoku → `profiles.total_games_played`, `total_wins`, etc. never updated
   - Cryptoku submit route only calls `update_user_balance` for points, skips stats

3. **Empty Recent Activity:**
   - `game_sessions` table not populated for Cryptoku → `GameService.getRecentGames()` returns empty
   - Cryptoku only creates `cryptoku_leaderboard` entries, not `game_sessions`

4. **Cryptoku Tab "No Scores":**
   - Query/RLS/mode filter issues → Entries exist but not returned
   - OR: Entries truly missing due to submission failures

---

## File Path Reference

- **Header Points:** `components/topbar.tsx:10,47`
- **Profile Points/Stats:** `features/profile/profile-view.tsx:37,427-434,584`
- **Leaderboard Overall:** `features/leaderboard/leaderboard-view.tsx:76-117`, `lib/supabase/services/leaderboard.service.ts:184-220`, `scripts/03-functions.sql:269-300`
- **Cryptoku Leaderboard:** `features/leaderboard/leaderboard-view.tsx:132-163`, `app/api/cryptoku/leaderboard/route.ts:1-35`
- **Cryptoku Submit:** `app/api/cryptoku/submit-result/route.ts:48-320`
- **Points Update RPC:** `scripts/03-functions.sql:73-116`
- **Stats Update RPC:** `scripts/03-functions.sql:121-179`
- **Game Sessions Query:** `lib/supabase/services/game.service.ts:101-161`
- **Context Provider:** `components/providers.tsx:242-402`

---

**END OF AUDIT REPORT**
