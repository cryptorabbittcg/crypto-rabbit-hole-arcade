# Audit: Points, Stats, and Leaderboard Sources of Truth

**Date:** 2025-01-XX  
**Status:** AUDIT ONLY - NO CODE CHANGES  
**Goal:** Identify exact read/write paths and sources of truth for all metrics displayed in UI.

---

## 1. Sources of Truth Table

| Metric | UI Location | Read Source | Database Table/Column | Write Path |
|--------|------------|-------------|----------------------|------------|
| **Points (Header)** | `topbar.tsx:47` | `useArcade().points` (React Context) | `profiles.points` | `update_user_balance` RPC → `profiles.points` |
| **Points (Profile)** | `profile-view.tsx:584` | `useArcade().points` (React Context) | `profiles.points` | `update_user_balance` RPC → `profiles.points` |
| **Points (Leaderboard "Your Points")** | `leaderboard-view.tsx:270` | `userPoints` state from `getTopByPoints()` | `leaderboard.total_points` | `update_user_balance` RPC → `leaderboard.total_points` (only if row exists) |
| **Points (Leaderboard Rows)** | `leaderboard-view.tsx:582` | `entry.points` from `getTopByPoints()` | `leaderboard.total_points` | `update_user_balance` RPC → `leaderboard.total_points` (only if row exists) |
| **Games Played** | `profile-view.tsx:639` | `supabaseProfile.total_games_played` | `profiles.total_games_played` | `record_game_session` RPC → `profiles.total_games_played += 1` |
| **Wins** | `profile-view.tsx:640` | `supabaseProfile.total_wins` | `profiles.total_wins` | `record_game_session` RPC → `profiles.total_wins += 1` (if won) |
| **Losses** | `profile-view.tsx:641` | `supabaseProfile.total_losses` | `profiles.total_losses` | `record_game_session` RPC → `profiles.total_losses += 1` (if lost) |
| **Win Streak** | `profile-view.tsx:642` | `supabaseProfile.win_streak` | `profiles.win_streak` | `record_game_session` RPC → updates streak logic |
| **Best Win Streak** | `profile-view.tsx:643` | `supabaseProfile.best_win_streak` or `highest_win_streak` | `profiles.best_win_streak` | `record_game_session` RPC → `GREATEST()` logic |
| **Total Playtime** | `profile-view.tsx:644` | `supabaseProfile.total_playtime` | `profiles.total_playtime` | `record_game_session` RPC → `profiles.total_playtime += p_duration` |
| **Recent Activity** | `profile-view.tsx:650-666` | `recentGames` from `GameService.getRecentGames()` | `game_sessions` table | `record_game_session` RPC → INSERT INTO `game_sessions` |
| **Cryptoku Tab Scores** | `leaderboard-view.tsx:337` | `cryptokuLeaderboard` from `/api/cryptoku/leaderboard` | `cryptoku_leaderboard` table | `CryptokuLeaderboardService.addEntry()` → RPC `add_cryptoku_leaderboard_entry` |

---

## 2. Detailed Read Paths

### 2.1 Header Points Pill

**File:** `components/topbar.tsx`  
**Lines:** 10, 47

```typescript
// Line 10
const { tickets, points } = useArcade()

// Line 47
<span className="text-xs md:text-sm font-bold text-cyan-100 text-glow">{points}</span>
```

**Data Flow:**
1. `useArcade()` hook → React Context (`components/providers.tsx`)
2. Context state `points` → Loaded from `profiles.points` via `syncProfileWithWallet()`
3. `ProfileService.getProfileByWallet()` → `SELECT profiles.points WHERE wallet_address = ?`
4. **Source:** `profiles.points` column

---

### 2.2 Profile Page Points

**File:** `features/profile/profile-view.tsx`  
**Lines:** 37, 584

```typescript
// Line 37
const { profile, updateProfile, tickets, points, isConnected, address } = useArcade()

// Line 584
<div className="text-3xl font-bold text-cyan-400">{points}</div>
```

**Data Flow:**
1. Same as header - `useArcade().points` → React Context
2. **Source:** `profiles.points` column (same as header)

**Note:** Profile page also loads `supabaseProfile` (line 91), but displayed points come from React Context `points`, not `supabaseProfile.points`.

---

### 2.3 Leaderboard "Your Points"

**File:** `features/leaderboard/leaderboard-view.tsx`  
**Lines:** 45, 49, 105, 270

```typescript
// Line 45, 49
const { points, address, profile } = useArcade()
const [userPoints, setUserPoints] = useState<number>(points || 0)

// Line 105 (in fetchOverallLeaderboard)
setUserPoints(userEntry.score) // where score = entry.total_points from RPC

// Line 270
<div className="text-3xl font-bold font-display text-purple-400">{userPoints.toLocaleString()}</div>
```

**Data Flow:**
1. `LeaderboardService.getTopByPoints(100)` → `lib/supabase/services/leaderboard.service.ts:186`
2. RPC call: `this.supabase.rpc("get_leaderboard", { p_limit: 100 })`
3. SQL: `scripts/03-functions.sql:285-298` → `SELECT ... FROM leaderboard l JOIN profiles p ... ORDER BY l.total_points DESC`
4. User's entry found by `address` match → `setUserPoints(userEntry.score)` where `score = entry.total_points`
5. **Source:** `leaderboard.total_points` column

---

### 2.4 Leaderboard Rows Points

**File:** `features/leaderboard/leaderboard-view.tsx`  
**Lines:** 81, 84-93, 582

```typescript
// Line 84-93 (mapping RPC response)
const entries: LeaderboardEntry[] = scores.map((entry) => ({
  rank: entry.rank,
  address: entry.wallet_address,
  points: entry.score, // entry.score contains total_points from RPC
  wins: entry.total_wins || 0,
  streak: entry.win_streak || 0,
}))

// Line 582 (display)
<div className="text-3xl font-bold font-display text-pink-400">{entry.points.toLocaleString()}</div>
```

**Data Flow:**
1. Same RPC as "Your Points" → `get_leaderboard` RPC
2. **Source:** `leaderboard.total_points` column

---

### 2.5 Profile Stats (Games Played, Wins, Losses, Streaks, Playtime)

**File:** `features/profile/profile-view.tsx`  
**Lines:** 70, 91, 427-434, 639-644

```typescript
// Line 70
const profileService = new ProfileService()

// Line 91
const [profileData, games, linkedWalletsResponse] = await Promise.all([
  profileService.getProfileByWallet(profileAddress),
  // ...
])

// Line 427-434 (computed from supabaseProfile)
const stats = {
  gamesPlayed: supabaseProfile?.total_games_played ?? 0,
  wins: supabaseProfile?.total_wins ?? 0,
  losses: supabaseProfile?.total_losses ?? 0,
  winStreak: supabaseProfile?.win_streak ?? 0,
  bestWinStreak: (supabaseProfile as any)?.best_win_streak ?? (supabaseProfile as any)?.highest_win_streak ?? 0,
  totalPlaytime: (supabaseProfile as any)?.total_playtime ?? 0,
}

// Lines 639-644 (display)
<StatCard icon={Gamepad2} label="Games Played" value={stats.gamesPlayed} color="pink" />
<StatCard icon={Trophy} label="Wins" value={stats.wins} color="purple" />
// ... etc
```

**Data Flow:**
1. `ProfileService.getProfileByWallet()` → `lib/supabase/services/profile.service.ts:51`
2. SQL: `SELECT * FROM profiles WHERE wallet_address = ?`
3. **Source:** `profiles.total_games_played`, `total_wins`, `total_losses`, `win_streak`, `best_win_streak`, `total_playtime` columns

---

### 2.6 Recent Activity

**File:** `features/profile/profile-view.tsx`  
**Lines:** 45, 72, 650-666

```typescript
// Line 45
const [recentGames, setRecentGames] = useState<NormalizedGameSession[]>([])

// Line 72
GameService.getRecentGames(profileAddress, 10),

// Line 650-666 (display)
{recentGames.map((game) => (
  <ActivityItem
    gameType={formatGameType(game.gameType)}
    gameMode={game.gameMode || ""}
    score={game.score}
    pointsEarned={game.pointsEarned}
    // ...
  />
))}
```

**Data Flow:**
1. `GameService.getRecentGames(walletAddress, 10)` → `lib/supabase/services/game.service.ts:151`
2. Static method → `getRecentGamesNormalized(userId, limit)` → `lib/supabase/services/game.service.ts:101`
3. SQL: `SELECT * FROM game_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?`
4. **Source:** `game_sessions` table

---

### 2.7 Cryptoku Leaderboard Tab

**File:** `features/leaderboard/leaderboard-view.tsx`  
**Lines:** 132-163, 302-340

```typescript
// Line 137
const response = await fetch(`/api/cryptoku/leaderboard?mode=${mode}&limit=100`)

// Line 144-152 (map response)
const entries: CryptokuLeaderboardEntry[] = data.entries.map((entry: any) => ({
  rank: entry.rank,
  address: entry.address || "0x0000...0000",
  score: entry.score,
  // ...
}))

// Line 337 (display)
{cryptokuLeaderboard.map((entry) => (
  <CryptokuLeaderboardCard key={entry.rank} entry={entry} />
))}
```

**Data Flow:**
1. API route: `GET /api/cryptoku/leaderboard` → `app/api/cryptoku/leaderboard/route.ts:4`
2. Service: `CryptokuLeaderboardService.getLeaderboard(mode, limit)` → `lib/supabase/services/cryptoku-leaderboard.service.ts:116`
3. RPC: `this.supabase.rpc("get_cryptoku_leaderboard", { p_mode: mode, p_limit: limit })`
4. **Source:** `cryptoku_leaderboard` table (via RPC function)

---

## 3. Detailed Write Paths

### 3.1 Points Updates (profiles.points + leaderboard.total_points)

**Primary Writer:** `update_user_balance` RPC (`scripts/03-functions.sql:73-116`)

**What It Updates:**
- `profiles.points = profiles.points + p_points_change` (line 92)
- `leaderboard.total_points = leaderboard.total_points + p_points_change` (line 112) - **ONLY if row exists**
- `transactions` table (line 107-108)

**Critical Issue:** Line 111-113 does `UPDATE leaderboard WHERE user_id = p_user_id`. If the row doesn't exist, this does nothing (no INSERT). This explains why `profiles.points = 1516` but `leaderboard.total_points = 472` (or missing).

**Callers:**
1. **Cryptoku Submit:** `app/api/cryptoku/submit-result/route.ts:250` - Direct RPC call via admin client
2. **ProfileService.addPoints():** `components/providers.tsx:553` - Via `ProfileService.updateBalance()` → `profile.service.ts:174` - Anon client RPC
3. **record_game_session RPC:** `scripts/03-functions.sql:161` - Internal call (PERFORM update_user_balance)

**No Direct Writes Found:**
- No direct `UPDATE profiles SET points = ?` found in codebase (all go through RPC)
- No direct `UPDATE leaderboard SET total_points = ?` found (all via RPC)

---

### 3.2 Stats Updates (total_games_played, wins, losses, streaks, playtime)

**Primary Writer:** `record_game_session` RPC (`scripts/03-functions.sql:121-179`)

**What It Updates:**
- INSERT INTO `game_sessions` (line 139-147)
- `profiles.total_games_played += 1` (line 152)
- `profiles.total_wins += 1` if won (line 153)
- `profiles.total_losses += 1` if lost (line 154)
- `profiles.win_streak` logic (line 155)
- `profiles.best_win_streak` logic (line 156)
- `profiles.total_playtime += p_duration` (line 157)
- **ALSO calls `update_user_balance` internally** (line 161) - awards points

**Callers:**
- **Ape In Submit:** `app/api/ape-in/submit-result/route.ts` - Likely calls this (not verified in this audit)
- **NOT called by Cryptoku Submit** - This is the root cause of zero stats

**Note:** `record_game_session` calls `update_user_balance` internally, so calling both would double-award points.

---

### 3.3 game_sessions Table Inserts

**Primary Writer:** `record_game_session` RPC (`scripts/03-functions.sql:139-147`)

**What It Inserts:**
- Row into `game_sessions` with: `user_id`, `game_type`, `game_mode`, `duration`, `result`, `points_earned`, `ape_earned`, `tickets_earned`, `ended_at`

**Callers:**
- Same as stats updates - `record_game_session` RPC
- **NOT called by Cryptoku Submit** - This is why "Recent Activity" is empty

**Alternative Writers:**
- `GameService.createGameSession()` + `completeGameSession()` - `lib/supabase/services/game.service.ts:21,50` - But these are not used by Cryptoku

---

### 3.4 cryptoku_leaderboard Table Inserts

**Primary Writer:** `add_cryptoku_leaderboard_entry` RPC (called via `CryptokuLeaderboardService.addEntry()`)

**What It Inserts:**
- Row into `cryptoku_leaderboard` with: `run_id`, `user_id`, `mode`, `score`, `time_seconds`, `hints_used`, `errors`, etc.

**Caller:**
- **Cryptoku Submit:** `app/api/cryptoku/submit-result/route.ts:207` - `leaderboardService.addEntry()`

**Note:** This is the ONLY table populated for Cryptoku completions (not `game_sessions`).

---

## 4. Parity Gaps Identified

### Gap 1: Points Discrepancy (1516 vs 472)

**Problem:**
- Header/Profile show `profiles.points = 1516`
- Leaderboard shows `leaderboard.total_points = 472` (or missing)

**Root Cause:**
- `update_user_balance` RPC updates `leaderboard.total_points` ONLY if row exists (line 111-113 is UPDATE, not UPSERT)
- If `leaderboard` row missing: `profiles.points` gets updated, but `leaderboard.total_points` stays 0/stale
- Historical points may have been added before `leaderboard` sync was implemented

**Missing Write:**
- No automatic INSERT/upsert of `leaderboard` row when `update_user_balance` runs

---

### Gap 2: Zero Stats (games played, wins, losses, streaks, playtime)

**Problem:**
- All profile stats show 0

**Root Cause:**
- Cryptoku submit route (`app/api/cryptoku/submit-result/route.ts`) calls `update_user_balance` (line 250) but **NEVER calls `record_game_session`**
- `record_game_session` RPC (line 149-158) is the ONLY writer for `profiles.total_games_played`, `total_wins`, etc.
- Cryptoku completions bypass stats updates entirely

**Missing Write:**
- No call to `record_game_session` RPC in Cryptoku submit route

---

### Gap 3: Empty Recent Activity

**Problem:**
- "Recent Activity" shows "No recent activity"

**Root Cause:**
- Cryptoku submit route does NOT insert into `game_sessions` table
- `GameService.getRecentGames()` queries `game_sessions` (line 102-105)
- Cryptoku only creates `cryptoku_leaderboard` entries, not `game_sessions` rows

**Missing Write:**
- No INSERT into `game_sessions` table for Cryptoku completions

**Note:** `record_game_session` RPC inserts into `game_sessions` (line 139-147), so calling it would fix this too.

---

### Gap 4: Cryptoku Tab "No Scores Yet"

**Problem:**
- Cryptoku leaderboard tab shows "No Cryptoku scores yet"

**Possible Causes:**
1. `cryptoku_leaderboard` table has no entries (submit failed or not called)
2. RPC `get_cryptoku_leaderboard` filters by mode, but entries have wrong mode value
3. RLS policies block reads
4. Wallet address normalization mismatch (submit lowercases, query might not)

**Investigation Needed:**
- Check if `cryptoku_leaderboard` has rows for the user
- Verify mode values match (submit uses uppercase "DEGEN"/"APE")
- Check RLS policies

---

## 5. Fix Options

### Option A: Cryptoku Submit Calls `record_game_session` (Single Writer)

**Approach:** Make `record_game_session` the single writer for points + stats + sessions

**Changes:**
1. **Modify `app/api/cryptoku/submit-result/route.ts`:**
   - Remove direct `update_user_balance` call (line 250)
   - Add `record_game_session` RPC call after leaderboard entry (after line 233)
   ```typescript
   // Replace lines 250-281 with:
   if (pointsEarned > 0 && profile) {
     const { data: sessionData, error: sessionError } = await adminClient.rpc('record_game_session', {
       p_user_id: profile.id,
       p_game_type: 'cryptoku',
       p_game_mode: mode.toLowerCase(), // 'degen' or 'ape'
       p_duration: timeSeconds,
       p_result: 'won', // Cryptoku completion is always a win
       p_ape_earned: 0,
       p_tickets_earned: 0,
       p_points_earned: pointsEarned,
     })
     
     if (sessionError) {
       console.error("[CryptokuSubmit] Error recording game session:", sessionError)
       // Log but don't fail - points were already awarded via cryptoku_leaderboard entry
     }
   }
   ```

**Pros:**
- Single source of truth (`record_game_session` handles everything)
- Stats automatically update
- `game_sessions` automatically populated
- No double-award risk (remove `update_user_balance` call)

**Cons:**
- `record_game_session` calls `update_user_balance` internally, so we lose direct control over transaction description
- Requires testing to ensure `record_game_session` works correctly for Cryptoku

**What It Fixes:**
- ✅ Stats updates (games played, wins, streaks, playtime)
- ✅ Recent Activity (game_sessions populated)
- ⚠️ Points discrepancy (only if `leaderboard` row exists - still need UPSERT fix)

---

### Option B: Cryptoku Submit Keeps `update_user_balance` + Adds Stats-Only Writer

**Approach:** Keep `update_user_balance` for points, add separate stats/session writer that doesn't award points

**Changes:**
1. **Create new RPC `record_game_session_stats_only`** (no balance updates):
   ```sql
   CREATE OR REPLACE FUNCTION record_game_session_stats_only(
     p_user_id UUID,
     p_game_type TEXT,
     p_game_mode TEXT,
     p_duration INTEGER,
     p_result TEXT
   )
   RETURNS UUID AS $$
   DECLARE
     v_session_id UUID;
     v_is_win BOOLEAN;
   BEGIN
     v_is_win := (p_result = 'won');
     
     -- Insert game session (no points/ape/tickets)
     INSERT INTO game_sessions (
       user_id, game_type, game_mode, duration, result,
       ape_earned, tickets_earned, points_earned, ended_at
     )
     VALUES (
       p_user_id, p_game_type, p_game_mode, p_duration, p_result,
       0, 0, 0, NOW() -- Points handled separately
     )
     RETURNING id INTO v_session_id;
     
     -- Update profile stats only (no balance updates)
     UPDATE profiles
     SET 
       total_games_played = total_games_played + 1,
       total_wins = total_wins + CASE WHEN v_is_win THEN 1 ELSE 0 END,
       total_losses = total_losses + CASE WHEN p_result = 'lost' THEN 1 ELSE 0 END,
       win_streak = CASE WHEN v_is_win THEN win_streak + 1 ELSE 0 END,
       best_win_streak = GREATEST(best_win_streak, CASE WHEN v_is_win THEN win_streak + 1 ELSE 0 END),
       total_playtime = total_playtime + p_duration
     WHERE id = p_user_id;
     
     RETURN v_session_id;
   END;
   $$ LANGUAGE plpgsql;
   ```

2. **Modify `app/api/cryptoku/submit-result/route.ts`:**
   - Keep `update_user_balance` call (line 250) - awards points
   - Add `record_game_session_stats_only` call after points awarded:
   ```typescript
   // After line 281 (after points awarded successfully)
   const { data: sessionData, error: sessionError } = await adminClient.rpc('record_game_session_stats_only', {
     p_user_id: profile.id,
     p_game_type: 'cryptoku',
     p_game_mode: mode.toLowerCase(),
     p_duration: timeSeconds,
     p_result: 'won',
   })
   
   if (sessionError) {
     console.error("[CryptokuSubmit] Error recording stats:", sessionError)
   }
   ```

**Pros:**
- Separation of concerns (points vs stats)
- No changes to existing `record_game_session` RPC
- Explicit control over transaction descriptions for points

**Cons:**
- Two separate RPC calls (slight performance overhead)
- Need to create new RPC function
- More code to maintain

**What It Fixes:**
- ✅ Stats updates (via new RPC)
- ✅ Recent Activity (via new RPC)
- ⚠️ Points discrepancy (still need UPSERT fix for `leaderboard`)

---

### Option C: Fix `update_user_balance` UPSERT + Use Option A or B

**Additional Fix Needed for Both Options:** Ensure `leaderboard` row exists when `update_user_balance` runs

**Change `scripts/03-functions.sql:73-116` `update_user_balance` RPC:**
```sql
-- Line 106-114: Change from UPDATE-only to UPSERT
IF p_points_change != 0 THEN
  INSERT INTO transactions (user_id, transaction_type, amount, currency, description)
  VALUES (p_user_id, p_transaction_type, p_points_change, 'points', p_description);
  
  -- UPSERT leaderboard row (ensures it exists)
  INSERT INTO leaderboard (user_id, total_points)
  VALUES (p_user_id, p_points_change)
  ON CONFLICT (user_id) 
  DO UPDATE SET total_points = leaderboard.total_points + p_points_change;
END IF;
```

**What It Fixes:**
- ✅ Points discrepancy (1516 vs 472) - `leaderboard` row always exists/updates

---

## 6. Recommended Fix Plan

**Phase 1: Immediate Data Sync (SQL Migration)**
```sql
-- Ensure leaderboard row exists for all users with points
INSERT INTO leaderboard (user_id, total_points)
SELECT id, points
FROM profiles
WHERE points > 0
ON CONFLICT (user_id) DO UPDATE 
SET total_points = EXCLUDED.total_points;

-- Sync existing leaderboard to match profiles
UPDATE leaderboard l
SET total_points = p.points
FROM profiles p
WHERE l.user_id = p.id
AND l.total_points != p.points;
```

**Phase 2: Fix Points UPSERT (Prevent Future Desync)**
- Modify `update_user_balance` RPC to use INSERT ... ON CONFLICT (see Option C above)

**Phase 3: Fix Stats + Activity (Choose Option A or B)**
- **Recommend Option A** (simpler, single writer) - Call `record_game_session` instead of `update_user_balance`
- OR Option B (separation) - Keep `update_user_balance` + add `record_game_session_stats_only`

**Phase 4: Backfill Historical Data (One-Time)**
```sql
-- Backfill game_sessions from cryptoku_leaderboard (if Option A/B implemented)
-- Then recalculate stats from game_sessions
```

---

## 7. Test Plan

### 7.1 Test Points Sync

1. **Create test user** with fresh profile
2. **Play Cryptoku game** (DEGEN or APE mode)
3. **Verify:**
   - Header shows correct points
   - Profile page shows same points
   - Leaderboard "Your Points" matches header/profile
   - Leaderboard row shows correct points
   - `profiles.points` = `leaderboard.total_points` in DB

### 7.2 Test Stats Updates

1. **Reset test user stats** (set to 0)
2. **Play Cryptoku game**
3. **Verify:**
   - `profiles.total_games_played` incremented by 1
   - `profiles.total_wins` incremented by 1 (Cryptoku completion = win)
   - `profiles.win_streak` updated
   - `profiles.total_playtime` updated

### 7.3 Test Recent Activity

1. **Play Cryptoku game**
2. **Check Profile page "Recent Activity" tab**
3. **Verify:**
   - New `game_sessions` row exists with `game_type = 'cryptoku'`
   - Activity shows Cryptoku game with correct score/duration
   - Order is correct (newest first)

### 7.4 Test Cryptoku Leaderboard Tab

1. **Play Cryptoku game** (DEGEN mode)
2. **Switch to Leaderboard → Cryptoku tab → DEGEN mode**
3. **Verify:**
   - Entry appears in list
   - Score matches submitted score
   - Mode is correct

### 7.5 Test No Double-Award

1. **Record current `profiles.points`**
2. **Play Cryptoku game**
3. **Verify:**
   - Points increased by exactly `score` (not 2x)
   - Only one transaction row in `transactions` table for this game

---

## 8. Rollback Plan

### If Option A (record_game_session) Causes Issues:

**Rollback Steps:**
1. **Revert `app/api/cryptoku/submit-result/route.ts`:**
   - Remove `record_game_session` call
   - Restore `update_user_balance` call (line 250)

2. **No database changes needed** (RPC still exists, just not called)

3. **Verify:**
   - Cryptoku games still award points correctly
   - Stats remain at 0 (expected - no stats writer)

### If Option B (stats-only RPC) Causes Issues:

**Rollback Steps:**
1. **Revert `app/api/cryptoku/submit-result/route.ts`:**
   - Remove `record_game_session_stats_only` call

2. **Optionally drop RPC:**
   ```sql
   DROP FUNCTION IF EXISTS record_game_session_stats_only(UUID, TEXT, TEXT, INTEGER, TEXT);
   ```

3. **Verify:**
   - Cryptoku games still award points (via `update_user_balance`)
   - Stats remain at 0 (expected - stats writer removed)

### If UPSERT Fix Causes Issues:

**Rollback Steps:**
1. **Revert `scripts/03-functions.sql:106-114`** to original UPDATE-only logic
2. **Run data sync SQL** (Phase 1) to fix existing discrepancies
3. **Verify:** Points still award correctly (just won't auto-create `leaderboard` rows)

---

## 9. Summary of Missing Writes

| Metric | Current Writer | Cryptoku Calls? | Missing For Cryptoku |
|--------|---------------|-----------------|---------------------|
| `profiles.points` | `update_user_balance` RPC | ✅ Yes (line 250) | None - working |
| `leaderboard.total_points` | `update_user_balance` RPC | ⚠️ Yes, but fails if row missing | UPSERT logic |
| `profiles.total_games_played` | `record_game_session` RPC | ❌ No | Call `record_game_session` |
| `profiles.total_wins` | `record_game_session` RPC | ❌ No | Call `record_game_session` |
| `profiles.total_losses` | `record_game_session` RPC | ❌ No | Call `record_game_session` |
| `profiles.win_streak` | `record_game_session` RPC | ❌ No | Call `record_game_session` |
| `profiles.best_win_streak` | `record_game_session` RPC | ❌ No | Call `record_game_session` |
| `profiles.total_playtime` | `record_game_session` RPC | ❌ No | Call `record_game_session` |
| `game_sessions` row | `record_game_session` RPC | ❌ No | Call `record_game_session` |
| `cryptoku_leaderboard` row | `add_cryptoku_leaderboard_entry` RPC | ✅ Yes (line 207) | None - working |

---

**END OF AUDIT**
