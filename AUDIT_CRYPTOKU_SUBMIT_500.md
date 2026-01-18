# Cryptoku Submit Result 500 Error - Investigation Report

**Date:** 2025-01-17  
**Issue:** POST `/api/cryptoku/submit-result` (DEGEN mode) returns 500 with `{"error":"Failed to save leaderboard entry"}`  
**Status:** Investigation Complete - Root Cause Identified

---

## Summary

**UPDATED:** The `cryptoku_leaderboard` table and `add_cryptoku_leaderboard_entry` RPC function **DO EXIST in production**, but the RPC call is still failing with 500 "Failed to save leaderboard entry".

Possible causes:
- Function signature mismatch (parameter names/types don't match)
- Missing SECURITY DEFINER or incorrect search_path
- Constraint violation in function body
- Permission/RLS issue despite SECURITY DEFINER
- Function body error (SQL logic error)

Additionally, there's a **client-side bug** where points are awarded even when the API call fails (500 error) - **FIXED** in `components/game-modal.tsx`.

---

## 1. Exact Failing Location

### Route Handler: `app/api/cryptoku/submit-result/route.ts`

**Line 220-230:** The error is returned here:

```typescript
if (!leaderboardResult) {
  console.error("[CryptokuSubmit] Failed to add leaderboard entry", {
    runId,
    address: normalizedAddress.substring(0, 10) + "...",
    mode,
    score,
  })
  return NextResponse.json(
    { error: "Failed to save leaderboard entry" },  // <-- THIS IS THE 500 RESPONSE
    { status: 500 }
  )
}
```

**Line 207:** The `leaderboardService.addEntry()` call that precedes the failure:

```typescript
const leaderboardResult = await leaderboardService.addEntry({
  runId,
  address: normalizedAddress,
  mode,
  score,
  timeSeconds,
  hintsUsed,
  errors,
  timestamp: Date.now(),
  completed: true,
  forfeited: false,
})
```

### Service Layer: `lib/supabase/services/cryptoku-leaderboard.service.ts`

**Line 73:** The service calls RPC `add_cryptoku_leaderboard_entry`:

```typescript
const { data, error } = await this.supabase.rpc("add_cryptoku_leaderboard_entry", {
  p_run_id: entry.runId,
  p_user_id: userId,
  p_mode: entry.mode,
  p_score: entry.score,
  p_time_seconds: entry.timeSeconds,
  p_hints_used: entry.hintsUsed,
  p_errors: entry.errors,
  p_completed: entry.completed,
  p_forfeited: entry.forfeited,
})
```

**Line 85-97:** If the RPC returns an error, it logs and returns `false`, which triggers the 500 response:

```typescript
if (error) {
  console.error("[CryptokuLeaderboardService] Error adding leaderboard entry:", {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
    // ...
  })
  return false  // <-- This causes leaderboardResult to be falsy
}
```

---

## 2. Expected RPC and Table Schema

### RPC Function: `add_cryptoku_leaderboard_entry`

**Location in codebase:** `supabase/migrations/20260116094000_create_cryptoku_leaderboard_table.sql` (lines 63-167)

**Signature:**
```sql
CREATE OR REPLACE FUNCTION add_cryptoku_leaderboard_entry(
  p_run_id TEXT,
  p_user_id UUID,
  p_mode TEXT,
  p_score INTEGER,
  p_time_seconds INTEGER,
  p_hints_used INTEGER,
  p_errors INTEGER,
  p_completed BOOLEAN DEFAULT TRUE,
  p_forfeited BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
```

**What it does:**
1. Inserts into `cryptoku_leaderboard` table (or updates on conflict with `run_id`)
2. Updates `leaderboard.cryptoku_high_score` for ranked runs (DEGEN/APE)
3. Returns UUID of the inserted/updated entry

### Table: `cryptoku_leaderboard`

**Location in codebase:** `supabase/migrations/20260116094000_create_cryptoku_leaderboard_table.sql` (lines 12-40)

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS cryptoku_leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('NOOB', 'DEGEN', 'APE')),
  score INTEGER NOT NULL CHECK (score >= 0),
  time_seconds INTEGER NOT NULL CHECK (time_seconds >= 0),
  hints_used INTEGER NOT NULL CHECK (hints_used >= 0),
  errors INTEGER NOT NULL CHECK (errors >= 0),
  completed BOOLEAN DEFAULT TRUE NOT NULL,
  forfeited BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Constraints...
);
```

**Indexes:**
- `idx_cryptoku_leaderboard_mode_score` on `(mode, score DESC, time_seconds ASC)`
- `idx_cryptoku_leaderboard_user` on `(user_id, created_at DESC)`
- `idx_cryptoku_leaderboard_run_id` on `(run_id)`
- `idx_cryptoku_leaderboard_created` on `(created_at DESC)`

---

## 3. Production Supabase Status

### Confirmed in Production

**✅ VERIFIED:** 
- `public.cryptoku_leaderboard` table EXISTS
- `public.get_cryptoku_leaderboard` function EXISTS  
- `public.add_cryptoku_leaderboard_entry` function EXISTS

**But the RPC is still failing** - must be one of:
1. Function signature mismatch (parameter names/types)
2. Missing/invalid SECURITY DEFINER or search_path
3. Constraint violation in function body
4. SQL error in function execution

### Production Function Verification Needed

**Run in Supabase SQL Editor:**

```sql
-- Get full function definition
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='add_cryptoku_leaderboard_entry';

-- Check parameters
SELECT pg_get_function_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='add_cryptoku_leaderboard_entry';

-- Verify SECURITY DEFINER
SELECT 
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type,
  p.proconfig as search_path
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='add_cryptoku_leaderboard_entry';

-- Manual test call
SELECT add_cryptoku_leaderboard_entry(
  'run_test_123',
  '389424f2-a6f2-4d11-bd33-70bda05c56de'::uuid,
  'DEGEN',
  486,
  318,
  0,
  0,
  true,
  false
);
```

**Expected Vercel Log Output (after enhanced logging):**

```
[CryptokuLeaderboardService] CALLING RPC: add_cryptoku_leaderboard_entry WITH PARAMS: { ... }
[CryptokuLeaderboardService] RPC ERROR - Full error object: { ... }
[CryptokuLeaderboardService] RPC ERROR - Error code: <code>
[CryptokuLeaderboardService] RPC ERROR - Error message: <message>
[CryptokuLeaderboardService] RPC ERROR - Error details: <details>
[CryptokuLeaderboardService] RPC ERROR - Error hint: <hint>
```

**See `VERIFY_CRYPTOKU_RPC_FUNCTION.sql` for complete verification script.**

---

## 4. Recommended Fix Plan

### Option A: Fix Function Signature/Permissions (CURRENT FOCUS)

**Steps:**
1. **Run verification SQL** (see `VERIFY_CRYPTOKU_RPC_FUNCTION.sql`):
   - Check function definition matches expected signature
   - Verify SECURITY DEFINER is set
   - Verify search_path includes 'public'
   - Test manual call with real user_id

2. **If function signature doesn't match:**
   - Recreate function using exact SQL from migration file
   - Ensure parameter names match: `p_run_id`, `p_user_id`, `p_mode`, etc.

3. **If SECURITY DEFINER missing:**
   ```sql
   ALTER FUNCTION add_cryptoku_leaderboard_entry(TEXT, UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN) 
   SECURITY DEFINER;
   
   ALTER FUNCTION add_cryptoku_leaderboard_entry(TEXT, UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN)
   SET search_path = 'pg_catalog, public';
   ```

4. **If manual test call fails:**
   - Check error message for constraint violations
   - Verify user_id exists in profiles table
   - Check for RLS policy conflicts

### Option B: Apply Migration to Production (IF FUNCTION NEEDS RECREATION)

**Steps:**
1. **Apply the migration to prod Supabase:**
   - Open `supabase/migrations/20260116094000_create_cryptoku_leaderboard_table.sql`
   - Copy the entire SQL
   - Run it in Supabase Dashboard → SQL Editor
   - OR use Supabase CLI: `supabase db push` (if migrations are synced)

2. **Verify creation:**
   ```sql
   -- Check table exists
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'cryptoku_leaderboard';
   
   -- Check function exists
   SELECT proname FROM pg_proc p
   JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'public' 
   AND proname = 'add_cryptoku_leaderboard_entry';
   
   -- Test the function (use a test user_id)
   SELECT add_cryptoku_leaderboard_entry(
     'test-run-123',
     '00000000-0000-0000-0000-000000000000'::uuid,  -- Replace with test user_id
     'DEGEN',
     100,
     60,
     0,
     0,
     true,
     false
   );
   ```

3. **Remove temporary logs** after verification (optional cleanup)

**Pros:**
- Keeps existing architecture intact
- Leaderboard data is separate and queryable
- Matches current code expectations

**Cons:**
- Requires manual SQL execution in prod (if migration system isn't working)
- Need to verify migration was applied

---

### Option B: Use `game_sessions` Instead (ALTERNATIVE)

**If migration system is broken or we want to simplify:**

1. **Remove dependency on `cryptoku_leaderboard`:**
   - Modify `lib/supabase/services/cryptoku-leaderboard.service.ts` to write to `game_sessions` via `record_game_session` RPC instead
   - Or create a new RPC that writes to `game_sessions` with `game_type = 'cryptoku'`

2. **Update leaderboard queries:**
   - Change `get_cryptoku_leaderboard` to query `game_sessions` filtered by `game_type = 'cryptoku'`
   - Update leaderboard views/components to read from `game_sessions`

3. **Schema requirements:**
   - Verify `game_sessions` has columns: `game_type`, `score`, `time_seconds`, `metadata` (JSONB) for `hints_used`, `errors`, `mode`

**Pros:**
- Uses existing `game_sessions` table (already in prod)
- Unified game session storage
- No new tables needed

**Cons:**
- Requires code changes to service layer
- May require migration of leaderboard query logic
- `game_sessions` schema may need updates to store all Cryptoku-specific fields

---

## 5. Client-Side Bug: Phantom Points

### Location: `components/game-modal.tsx`

**Line 46-58:** `handleCryptokuGameEnd` callback:

```typescript
const handleCryptokuGameEnd = useCallback((result: {
  score: number
  metadata?: any
}) => {
  console.log("🎮 Cryptoku game ended:", result)
  // Add points when game ends (only for ranked modes with points > 0)
  if (result.metadata?.points !== undefined && result.metadata.points > 0) {
    console.log("💰 Adding points from Cryptoku:", result.metadata.points)  // <-- THIS RUNS EVEN IF API FAILED
    addPoints(result.metadata.points)
  } else {
    console.log("ℹ️ No points to add (unranked mode or 0 points):", result.metadata)
  }
}, [addPoints])
```

### Root Cause: `features/games/cryptoku/cryptokugame.tsx`

**Line 1391-1433:** When API submission fails, it still calls `onGameEnd` with points:

```typescript
} else {
  console.error("Failed to submit result to API")
  // Calculate points locally if API submission failed (only for ranked modes)
  let earned = 0
  if (currentDifficulty === "degen" || currentDifficulty === "ape") {
    // ... calculate earned ...
  }
  
  // Still show victory modal even if submission failed
  // ...
  
  onGameEnd?.({
    score: 0,
    metadata: {
      // ...
      submissionFailed: true,  // <-- Flag exists but not checked by handler!
      points: earned,  // <-- Points still included even though API failed
    },
  })
}
```

**The Problem:**
- `handleCryptokuGameEnd` only checks `result.metadata?.points > 0`, not whether `submissionFailed` is true
- Points are calculated client-side as a "fallback" and still awarded even when the server rejected the submission

### ✅ FIXED: Guard Implemented

**Option 1: Check `submissionFailed` flag (IMPLEMENTED)**

```typescript
const handleCryptokuGameEnd = useCallback((result: {
  score: number
  metadata?: any
}) => {
  console.log("🎮 Cryptoku game ended:", result)
  
  // Don't award points if submission failed - wait for successful server response
  if (result.metadata?.submissionFailed) {
    console.warn("⚠️ Submission failed - not awarding points client-side", result.metadata)
    return
  }
  
  // Add points when game ends (only for ranked modes with points > 0)
  if (result.metadata?.points !== undefined && result.metadata.points > 0) {
    console.log("💰 Adding points from Cryptoku:", result.metadata.points)
    addPoints(result.metadata.points)
  } else {
    console.log("ℹ️ No points to add (unranked mode or 0 points):", result.metadata)
  }
}, [addPoints])
```

**Option 2: Only award points on successful API response**

In `cryptokugame.tsx`, remove the `points` from `onGameEnd` when submission fails:

```typescript
} else {
  console.error("Failed to submit result to API")
  // ... calculate earned locally ...
  
  onGameEnd?.({
    score: 0,
    metadata: {
      // ...
      submissionFailed: true,
      points: 0,  // <-- Set to 0 instead of earned
    },
  })
}
```

**Recommended:** Option 1 (check `submissionFailed` flag) is clearer and allows the game to still show victory modal while preventing phantom points.

---

## 6. Enhanced Logging Added

### Route Handler Logs (`app/api/cryptoku/submit-result/route.ts`)

**Lines 206-233:** Detailed logging around `leaderboardService.addEntry()`:

- Before call: Logs RPC name and parameters
- After call: Logs return value
- On exception: Logs full error (message, stack, name)
- On failure: Logs when `leaderboardResult` is falsy

### Service Layer Logs (`lib/supabase/services/cryptoku-leaderboard.service.ts`)

**Lines 73-122:** Enhanced logging with `console.error` for Vercel visibility:

- **Before RPC:** Explicitly logs RPC name and JSON-stringified params
- **On RPC error:** Multiple `console.error` lines for:
  - Full error object (JSON stringified)
  - Error code (e.g., '42P01', '42883', '23505')
  - Error message
  - Error details
  - Error hint
- **On RPC success:** Logs returned data with type checking

**Expected Vercel Log Output:**

```
[CryptokuLeaderboardService] CALLING RPC: add_cryptoku_leaderboard_entry WITH PARAMS: {
  "p_run_id": "...",
  "p_user_id": "...",
  "p_mode": "DEGEN",
  "p_score": 486,
  ...
}
[CryptokuLeaderboardService] RPC ERROR - Full error object: { ... }
[CryptokuLeaderboardService] RPC ERROR - Error code: <code>
[CryptokuLeaderboardService] RPC ERROR - Error message: <message>
[CryptokuLeaderboardService] RPC ERROR - Error details: <details>
[CryptokuLeaderboardService] RPC ERROR - Error hint: <hint>
```

**Common Error Codes:**
- `42883`: function does not exist (signature mismatch)
- `42P01`: relation/table does not exist
- `23505`: unique constraint violation (run_id already exists)
- `23503`: foreign key violation (user_id doesn't exist)
- `42501`: permission denied (SECURITY DEFINER issue)

---

## 7. Action Items

### Immediate (Investigation Complete)

- ✅ Enhanced logging in route handler and service layer (using console.error for Vercel)
- ✅ Identified exact failing location (line 220-230 in route.ts)
- ✅ Confirmed table/RPC exist in production (but RPC is failing)
- ✅ **FIXED** client-side phantom points bug in `components/game-modal.tsx`

### Next Steps (Fix Phase)

1. **Run verification SQL in Supabase:**
   - Use `VERIFY_CRYPTOKU_RPC_FUNCTION.sql` to check function definition
   - Verify parameter signature matches code expectations
   - Verify SECURITY DEFINER and search_path are correct
   - Test manual RPC call with real user_id

2. **Fix function if needed:**
   - If signature mismatch: Recreate function from migration SQL
   - If SECURITY DEFINER missing: Run `ALTER FUNCTION ... SECURITY DEFINER`
   - If search_path wrong: Run `ALTER FUNCTION ... SET search_path = 'pg_catalog, public'`
   - If constraint violation: Check error details from manual test call

3. **Verify fix:**
   - Test DEGEN mode completion
   - Check Vercel logs for successful RPC call (should see "RPC SUCCESS")
   - Confirm points are only awarded after successful API response (200 OK) - already fixed

4. **Keep logging:**
   - Enhanced logging remains for production debugging

---

## 8. Related Files

- `app/api/cryptoku/submit-result/route.ts` - API route handler (line 220-230)
- `lib/supabase/services/cryptoku-leaderboard.service.ts` - Service calling RPC (line 73)
- `components/game-modal.tsx` - Client handler awarding phantom points (line 46-58)
- `features/games/cryptoku/cryptokugame.tsx` - Game component calling `onGameEnd` on failure (line 1420-1433)
- `supabase/migrations/20260116094000_create_cryptoku_leaderboard_table.sql` - Migration to apply (missing in prod)

---

## 9. Expected Error Messages

### If Table Missing:
```
relation "cryptoku_leaderboard" does not exist
```

### If Function Missing:
```
function add_cryptoku_leaderboard_entry(text, uuid, text, integer, integer, integer, integer, boolean, boolean) does not exist
```

### If Schema Issue:
```
permission denied for schema public
```
(Should not occur with SECURITY DEFINER, but possible if function wasn't created with proper permissions)

---

## Conclusion

**Root Cause (UPDATED):** The `cryptoku_leaderboard` table and `add_cryptoku_leaderboard_entry` RPC function **DO EXIST in production**, but the RPC call is failing. Possible causes:
- Function signature mismatch (parameter names/types)
- Missing or incorrect SECURITY DEFINER/search_path
- Constraint violation or SQL error in function body
- Permission/RLS issue

**Enhanced Logging:** Added comprehensive `console.error` logging to capture full RPC error details in Vercel logs.

**Client-Side Bug:** **FIXED** - `handleCryptokuGameEnd` now checks `submissionFailed` flag and prevents phantom points.

**Next Steps:** 
1. Run `VERIFY_CRYPTOKU_RPC_FUNCTION.sql` in Supabase to diagnose function issues
2. Fix function signature/permissions based on verification results
3. Test manual RPC call to isolate the error
4. Apply fix (recreate function or alter permissions) and verify

**Status:** Investigation complete. Enhanced logging deployed. Client-side bug fixed. Ready for production RPC verification.
