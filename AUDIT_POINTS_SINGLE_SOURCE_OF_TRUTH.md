# Points Single Source of Truth - Comprehensive Audit

**Date:** 2025-01-17  
**Purpose:** Audit points management to prevent drift between `profiles.points` and transaction ledger  
**Status:** Audit Complete - Ready for Review

---

## Executive Summary

This audit examines all points reads (UI displays) and writes (award paths) to ensure:
1. Points never drift between `profiles.points` and `SUM(transactions.amount WHERE currency='points')`
2. All UI locations display consistent values
3. Points are server-authoritative (no client-side drift)
4. Phantom points cannot occur (client awards without server confirmation)

**Current State:**
- ✅ Points corrected: `profiles.points = SUM(transactions.amount)` (drift = 0)
- ⚠️ **RISK IDENTIFIED:** Client-side `addPoints()` can cause drift if server sync fails
- ⚠️ **RISK IDENTIFIED:** `addPoints()` called after server already awards points (double-award risk)
- ⚠️ **RISK IDENTIFIED:** Leaderboard row may not exist when `update_user_balance` runs

---

## 1. Points Reads (UI Display Locations)

| Location | File | Line(s) | Data Source | Cache/State | Refresh Logic |
|----------|------|---------|-------------|-------------|---------------|
| **Arcade Header** | `components/topbar.tsx` | 10, 47 | `useArcade().points` (React state) | ✅ Cache/State | Loaded from Supabase on wallet connect (`providers.tsx:355`) |
| **Profile Page** | `features/profile/profile-view.tsx` | 37, 584 | `useArcade().points` (React state) | ✅ Cache/State | Same as Arcade header (shared context) |
| **Leaderboard Overall** | `features/leaderboard/leaderboard-view.tsx` | 45, 49, 105 | `useArcade().points` (line 49) + API `get_leaderboard` RPC (line 81) | ✅ API Fetch | Fetched fresh on mount via `LeaderboardService.getTopByPoints()` (reads `leaderboard.total_points`) |

**Key Findings:**
- **Arcade Header & Profile Page:** Both read from same React state (`useArcade().points`), which is loaded from `profiles.points` on wallet connect
- **Leaderboard:** Reads from `leaderboard.total_points` via RPC `get_leaderboard` (separate source from `profiles.points`)
- **State Source:** `providers.tsx:355` loads points from `(existingProfile as any).points` (Supabase query)

**Data Flow:**
```
Supabase profiles.points 
  → providers.tsx:355 (syncProfileWithWallet) 
  → setPoints(dbPoints) 
  → useArcade() context 
  → topbar.tsx:47 (display)
  → profile-view.tsx:584 (display)
```

---

## 2. Points Writes (Award Paths)

| Location | File | Line(s) | Write Type | Server/Client | Conditional on Success | RPC/Method |
|----------|------|---------|------------|---------------|------------------------|------------|
| **Cryptoku Submit** | `app/api/cryptoku/submit-result/route.ts` | 276-285 | `record_game_session` | ✅ Server (admin client) | ✅ Yes (only if not duplicate) | `record_game_session` RPC |
| **Ape In Submit** | `app/api/ape-in/submit-result/route.ts` | 142-149 | `update_user_balance` | ✅ Server (admin client) | ✅ Yes (only if not duplicate) | `update_user_balance` RPC |
| **Client addPoints()** | `components/providers.tsx` | 530-586 | `update_user_balance` | ❌ Client (anon client) | ⚠️ No (optimistic update first) | `ProfileService.updateBalance()` → `update_user_balance` RPC |
| **Client addPoints() Callers** | `components/game-modal.tsx` | 37, 61 | N/A (calls addPoints) | ❌ Client | ⚠️ Partial (checks `submissionFailed`) | Calls `addPoints()` |
| **Referral Rewards** | `components/providers.tsx` | 613 | `setPoints()` (state only) | ❌ Client (state) | ⚠️ No (local state only) | State update only |

**Critical Findings:**

### 2.1 Server-Side Awards (SAFE)
- ✅ **Cryptoku:** `record_game_session` (line 276) → internally calls `update_user_balance` (line 161 in `scripts/03-functions.sql`)
- ✅ **Ape In:** `update_user_balance` directly (line 142)
- ✅ Both use `createAdminClient()` (bypasses RLS)
- ✅ Both check for duplicate `run_id` before awarding

### 2.2 Client-Side Awards (RISKY)
- ⚠️ **`addPoints()` in `providers.tsx:530-586`:**
  - **Optimistic update FIRST** (line 537): `setPoints((prev) => prev + amount)` 
  - **Server sync LATER** (line 553): Calls `ProfileService.updateBalance()` → `update_user_balance` RPC (anon client)
  - **If server sync fails:** Local state has points, DB doesn't → **DRIFT**
  - **Recovery:** 500ms timeout checks DB and syncs local state if mismatch (line 557-564)

- ⚠️ **`addPoints()` Callers:**
  - `game-modal.tsx:37` (Ape In) - calls `addPoints()` AFTER API returns 200 OK ✅
  - `game-modal.tsx:61` (Cryptoku) - calls `addPoints()` AFTER checking `submissionFailed` flag ✅
  - **BUT:** If API awards points AND client calls `addPoints()`, could double-award if `addPoints()` server sync succeeds

### 2.3 Direct Database Writes
- ✅ **No direct `UPDATE profiles SET points = ?` found** (all via RPC)
- ✅ **No direct `UPDATE leaderboard SET total_points = ?` found** (all via RPC)

---

## 3. Phantom Points Prevention

### 3.1 Current Protections

| Location | Protection | Status |
|----------|------------|--------|
| `components/game-modal.tsx:52-55` | Checks `result.metadata?.submissionFailed` before `addPoints()` | ✅ **FIXED** |
| `components/game-modal.tsx:37` | Only calls `addPoints()` if `result.points > 0` | ✅ Safe (API returns points on success) |
| `app/api/cryptoku/submit-result/route.ts` | Returns `submissionFailed: true` in metadata when API fails | ✅ Returns flag |

### 3.2 Remaining Risks

| Risk | Location | Description | Severity |
|------|----------|-------------|----------|
| **Double-Award** | `game-modal.tsx:61` + `submit-result/route.ts:276` | API awards via `record_game_session`, THEN client `addPoints()` also called | 🔴 **HIGH** |
| **Optimistic Drift** | `providers.tsx:537-577` | `addPoints()` updates local state first; if server sync fails, local > DB | 🔴 **HIGH** |
| **Failed Sync Recovery** | `providers.tsx:557-564` | 500ms timeout check may not catch all failures | 🟡 **MEDIUM** |

**Details:**

1. **Double-Award Risk:**
   - Cryptoku API (`submit-result/route.ts:276`) calls `record_game_session` which awards points via `update_user_balance`
   - Client (`game-modal.tsx:61`) ALSO calls `addPoints(result.metadata.points)` after successful API response
   - `addPoints()` calls `ProfileService.updateBalance()` → `update_user_balance` again
   - **Result:** Points awarded twice (once by API, once by client)

2. **Optimistic Drift:**
   - `addPoints()` does optimistic update: `setPoints((prev) => prev + amount)` (line 537)
   - Then attempts server sync: `profileService.updateBalance()` (line 553)
   - If server sync fails (RLS error, network error, etc.), local state has points but DB doesn't
   - **Result:** `profiles.points < SUM(transactions.amount)` (drift)

3. **Recovery Mechanism:**
   - 500ms timeout reloads profile and syncs local state to DB value (line 557-564)
   - **Limitation:** Only works if reload succeeds; if profile fetch fails, drift persists

---

## 4. Database/RLS Safety

### 4.1 Client Types

| Location | Client Type | RLS Bypass | Usage |
|----------|-------------|------------|-------|
| **API Routes** | `createAdminClient()` | ✅ Yes | Server-side points awards (Cryptoku, Ape In) |
| **Client `addPoints()`** | `createClient()` (anon) | ❌ No | Client-side sync via `ProfileService.updateBalance()` |

### 4.2 Direct Updates Prevention

| Check | Result | Evidence |
|-------|--------|----------|
| **Client can UPDATE profiles.points?** | ❌ No (RLS blocks) | Anon client used in `addPoints()`; RLS policies block direct updates |
| **Client can UPDATE leaderboard.total_points?** | ❌ No (RLS blocks) | No direct client updates found |
| **Only mutation path?** | ⚠️ **Partial** | `update_user_balance` RPC is only path, BUT client can call it via anon client (RLS may block) |

**Critical Issue:**
- `addPoints()` uses anon client → `ProfileService.updateBalance()` → `update_user_balance` RPC
- If RLS blocks `update_user_balance` for anon users, `addPoints()` server sync fails silently
- Local state updated optimistically, DB not updated → **DRIFT**

### 4.3 RPC Security

| RPC | Security | Schema | Updates Both Tables? |
|-----|----------|--------|----------------------|
| `update_user_balance` | `SECURITY DEFINER` | `SET search_path = 'pg_catalog, public'` | ✅ Updates `profiles.points` + `leaderboard.total_points` |
| `record_game_session` | (Not `SECURITY DEFINER` in codebase) | Default | ⚠️ Calls `update_user_balance` internally |

**Finding:**
- `update_user_balance` is `SECURITY DEFINER`, so anon client can call it (RLS bypass)
- BUT: `record_game_session` may not be `SECURITY DEFINER` (needs verification in prod)

---

## 5. Leaderboard Parity

### 5.1 `update_user_balance` Logic

**File:** `scripts/03-functions.sql:106-114`

```sql
IF p_points_change != 0 THEN
  INSERT INTO transactions (...);
  
  -- Update leaderboard
  UPDATE leaderboard
  SET total_points = total_points + p_points_change
  WHERE user_id = p_user_id;
END IF;
```

**Critical Issue:**
- `UPDATE leaderboard WHERE user_id = p_user_id` - **If row doesn't exist, nothing happens**
- `profiles.points` updates successfully, but `leaderboard.total_points` doesn't (row missing)
- **Result:** `profiles.points ≠ leaderboard.total_points`

### 5.2 Leaderboard Row Creation

| Location | Handles Missing Row? | Method |
|----------|----------------------|--------|
| `update_user_balance` RPC | ❌ **NO** | Only `UPDATE` (no `INSERT` or `UPSERT`) |
| `add_cryptoku_leaderboard_entry` RPC | ✅ **YES** | `INSERT ... ON CONFLICT DO UPDATE` (line 157-163 in migration) |
| Ape In submit | ✅ **YES** | Manual `INSERT` if missing (line 188-194) |

**Finding:**
- `update_user_balance` assumes `leaderboard` row exists
- If user has no `leaderboard` row, `total_points` never updates
- `profiles.points` increases, but `leaderboard.total_points` stays 0 → **PARITY BROKEN**

### 5.3 Cryptoku High Score Updates

**File:** `supabase/migrations/20260116094000_create_cryptoku_leaderboard_table.sql:146-163`

```sql
UPDATE leaderboard
SET cryptoku_high_score = GREATEST(...)
WHERE user_id = p_user_id;

IF NOT FOUND THEN
  INSERT INTO leaderboard (user_id, cryptoku_high_score, updated_at)
  VALUES (...)
  ON CONFLICT (user_id) DO UPDATE SET ...;
END IF;
```

**Status:** ✅ Handles missing row correctly (INSERT if NOT FOUND)

---

## 6. Remaining Risk Paths

### 6.1 High Risk Paths

| Risk | Path | Impact | Likelihood |
|------|------|--------|------------|
| **Double-Award** | API awards points → Client `addPoints()` also called → Both sync to DB | `profiles.points > SUM(transactions)` | 🟡 **MEDIUM** (Cryptoku has protection, Ape In may not) |
| **Optimistic Drift** | `addPoints()` optimistic update → Server sync fails → Local > DB | `profiles.points < SUM(transactions)` | 🔴 **HIGH** (anon client may fail RLS) |
| **Missing Leaderboard Row** | `update_user_balance` called → Leaderboard row missing → `total_points` not updated | `profiles.points ≠ leaderboard.total_points` | 🟡 **MEDIUM** (affects new users) |

### 6.2 Medium Risk Paths

| Risk | Path | Impact | Likelihood |
|------|------|--------|------------|
| **Recovery Timeout Failure** | `addPoints()` recovery check fails (profile fetch error) → Drift persists | `profiles.points ≠ local state` | 🟡 **MEDIUM** |
| **Race Condition** | Multiple `addPoints()` calls before recovery check → Double-count | `profiles.points > expected` | 🟡 **LOW** (500ms delay should prevent) |

---

## 7. Recommended Fix Plan

### Phase 1: Eliminate Client-Side Double-Awards (HIGH PRIORITY)

**Fix 1.1:** Remove `addPoints()` call from Cryptoku game end
- **File:** `components/game-modal.tsx:61`
- **Change:** Remove `addPoints()` call entirely (API already awards via `record_game_session`)
- **Rationale:** API awards points; client `addPoints()` causes double-award
- **Risk:** If API fails silently, no points awarded (but API already has error handling)

**Fix 1.2:** Remove `addPoints()` call from Ape In game end (if exists)
- **File:** `components/game-modal.tsx:37`
- **Change:** Verify API awards points; if yes, remove `addPoints()` call
- **Status:** Ape In API already awards points (line 142-149 in `submit-result/route.ts`)

**Fix 1.3:** Make `addPoints()` server-first (no optimistic update)
- **File:** `components/providers.tsx:530-586`
- **Change:** Call server sync FIRST, then update local state only on success
- **Rationale:** Prevents optimistic drift if server sync fails

```typescript
// BEFORE (optimistic):
setPoints((prev) => prev + amount)  // Local first
await profileService.updateBalance(...)  // Server second (may fail)

// AFTER (server-first):
const success = await profileService.updateBalance(...)  // Server first
if (success) {
  setPoints((prev) => prev + amount)  // Local only on success
}
```

### Phase 2: Fix Leaderboard Parity (MEDIUM PRIORITY)

**Fix 2.1:** Make `update_user_balance` ensure leaderboard row exists
- **File:** `scripts/03-functions.sql:106-114`
- **Change:** Add `INSERT ... ON CONFLICT DO UPDATE` after `UPDATE` if `NOT FOUND`

```sql
UPDATE leaderboard
SET total_points = total_points + p_points_change
WHERE user_id = p_user_id;

IF NOT FOUND THEN
  INSERT INTO leaderboard (user_id, total_points, updated_at)
  VALUES (p_user_id, p_points_change, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = leaderboard.total_points + p_points_change,
    updated_at = NOW();
END IF;
```

### Phase 3: Strengthen Recovery (LOW PRIORITY)

**Fix 3.1:** Add periodic profile sync on wallet connect
- **File:** `components/providers.tsx:syncProfileWithWallet`
- **Change:** Always reload points from DB after `addPoints()` calls (not just 500ms timeout)
- **Rationale:** Ensures local state syncs to DB value on every wallet reconnect

**Fix 3.2:** Add error logging for failed `addPoints()` syncs
- **File:** `components/providers.tsx:574`
- **Change:** Log failed syncs to Sentry/monitoring
- **Rationale:** Track drift occurrences

---

## 8. Minimal Regression Test Checklist

### Desktop (Chrome/Firefox)

- [ ] **Points Display Consistency:**
  - [ ] Complete Cryptoku DEGEN game → Verify header points increase
  - [ ] Refresh page → Verify points persist (loaded from DB)
  - [ ] Check Profile page → Verify points match header
  - [ ] Check Leaderboard → Verify user's `total_points` matches profile points

- [ ] **No Phantom Points:**
  - [ ] Complete Cryptoku with network throttling (slow 3G)
  - [ ] Verify points NOT awarded until API returns 200 OK
  - [ ] Check `submissionFailed: true` prevents client `addPoints()`

- [ ] **No Double-Awards:**
  - [ ] Complete Cryptoku game → Check transactions table for ONE entry per game
  - [ ] Verify `profiles.points = SUM(transactions.amount WHERE currency='points')`
  - [ ] Verify `leaderboard.total_points = profiles.points`

- [ ] **Leaderboard Parity:**
  - [ ] New user plays first game → Verify `leaderboard` row created
  - [ ] Verify `leaderboard.total_points` updates correctly

### iOS Chrome

- [ ] **Mobile Points Sync:**
  - [ ] Complete game on mobile → Verify points update
  - [ ] Switch to desktop → Verify points match
  - [ ] Complete game on desktop → Switch to mobile → Verify points match

- [ ] **Mobile Recovery:**
  - [ ] Play game with poor connection → Verify points sync after reconnection
  - [ ] Verify no drift between mobile and desktop views

---

## 9. Verification Queries

### 9.1 Points Drift Check

```sql
-- Check for drift between profiles.points and transaction ledger
SELECT 
  p.id,
  p.wallet_address,
  p.points as profile_points,
  COALESCE(SUM(t.amount) FILTER (WHERE t.currency = 'points'), 0) as transaction_points,
  p.points - COALESCE(SUM(t.amount) FILTER (WHERE t.currency = 'points'), 0) as drift
FROM profiles p
LEFT JOIN transactions t ON t.user_id = p.id
GROUP BY p.id, p.wallet_address, p.points
HAVING p.points != COALESCE(SUM(t.amount) FILTER (WHERE t.currency = 'points'), 0)
ORDER BY ABS(drift) DESC;
```

**Expected:** 0 rows (no drift)

### 9.2 Leaderboard Parity Check

```sql
-- Check for mismatch between profiles.points and leaderboard.total_points
SELECT 
  p.id,
  p.wallet_address,
  p.points as profile_points,
  COALESCE(l.total_points, 0) as leaderboard_points,
  p.points - COALESCE(l.total_points, 0) as parity_diff
FROM profiles p
LEFT JOIN leaderboard l ON l.user_id = p.id
WHERE p.points != COALESCE(l.total_points, 0)
ORDER BY ABS(parity_diff) DESC;
```

**Expected:** 0 rows (perfect parity), OR only rows where `leaderboard` row is missing

### 9.3 Double-Award Check

```sql
-- Check for duplicate transaction entries from same game (same description, same timestamp)
SELECT 
  user_id,
  description,
  amount,
  currency,
  created_at,
  COUNT(*) as duplicate_count
FROM transactions
WHERE currency = 'points'
  AND description LIKE '%cryptoku%'
GROUP BY user_id, description, amount, currency, created_at
HAVING COUNT(*) > 1
ORDER BY created_at DESC;
```

**Expected:** 0 rows (no duplicates)

---

## 10. Summary

### Current State
- ✅ Server-side awards (Cryptoku, Ape In) are safe (admin client, idempotent)
- ⚠️ Client-side `addPoints()` has optimistic drift risk
- ⚠️ Double-award risk if API awards points AND client `addPoints()` called
- ⚠️ Leaderboard parity broken if `leaderboard` row missing

### Highest Priority Fixes
1. **Remove `addPoints()` calls after server awards** (Fix 1.1, 1.2)
2. **Make `addPoints()` server-first** (Fix 1.3)
3. **Fix `update_user_balance` to create leaderboard row** (Fix 2.1)

### Risk Reduction Order
1. **Phase 1** (Fixes 1.1-1.3): Eliminates double-awards and optimistic drift
2. **Phase 2** (Fix 2.1): Fixes leaderboard parity
3. **Phase 3** (Fixes 3.1-3.2): Strengthens recovery (nice-to-have)

---

**Status:** Audit complete. Ready for implementation review.
