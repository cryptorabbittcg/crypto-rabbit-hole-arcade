# Submit Result & Leaderboard Sanity Check

## 🔍 Complete Function & Parameter Verification

### 1. Cryptoku Submit Result Flow

#### API Route: `app/api/cryptoku/submit-result/route.ts`

**Functions Called:**
1. ✅ `update_user_balance` - Called with:
   - `p_user_id` ✅
   - `p_ape_change` ✅
   - `p_tickets_change` ✅
   - `p_points_change` ✅
   - `p_transaction_type` ✅
   - `p_description` ✅

2. ✅ `add_cryptoku_leaderboard_entry` - Called via CryptokuLeaderboardService with:
   - `p_run_id` ✅
   - `p_user_id` ✅
   - `p_mode` ✅
   - `p_score` ✅
   - `p_time_seconds` ✅
   - `p_hints_used` ✅
   - `p_errors` ✅
   - `p_completed` ✅
   - `p_forfeited` ✅

3. ✅ `reward_cryptoku_hint` - Called via CryptokuHintsService with:
   - `p_user_id` ✅

**Service:** `lib/supabase/services/cryptoku-leaderboard.service.ts`
- ✅ Calls `add_cryptoku_leaderboard_entry` with correct parameters
- ✅ Calls `get_cryptoku_leaderboard` with `p_mode` and `p_limit`

### 2. Ape In Submit Result Flow

#### API Route: `app/api/ape-in/submit-result/route.ts`

**Functions Called:**
1. ✅ `update_user_balance` - Called with:
   - `p_user_id` ✅
   - `p_ape_change` ✅
   - `p_tickets_change` ✅
   - `p_points_change` ✅
   - `p_transaction_type` ✅
   - `p_description` ✅

**Direct Table Operations:**
- ✅ `game_sessions` table - INSERT with correct columns
- ✅ `leaderboard` table - UPDATE/INSERT for `ape_in_high_score`

### 3. Database Function Definitions

#### ✅ `update_user_balance` Function
**Location:** `scripts/03-functions.sql` (lines 73-116)
**Parameters:**
- `p_user_id UUID` ✅
- `p_ape_change INTEGER DEFAULT 0` ✅
- `p_tickets_change INTEGER DEFAULT 0` ✅
- `p_points_change INTEGER DEFAULT 0` ✅
- `p_transaction_type TEXT DEFAULT 'manual'` ✅
- `p_description TEXT DEFAULT NULL` ✅

**Security:** ✅ SECURITY DEFINER + search_path set

#### ✅ `add_cryptoku_leaderboard_entry` Function
**Location:** `supabase/migrations/20260116094000_create_cryptoku_leaderboard_table.sql` (lines 63-167)
**Parameters:**
- `p_run_id TEXT` ✅
- `p_user_id UUID` ✅
- `p_mode TEXT` ✅
- `p_score INTEGER` ✅
- `p_time_seconds INTEGER` ✅
- `p_hints_used INTEGER` ✅
- `p_errors INTEGER` ✅
- `p_completed BOOLEAN DEFAULT TRUE` ✅
- `p_forfeited BOOLEAN DEFAULT FALSE` ✅

**Security:** ✅ SECURITY DEFINER + search_path set

#### ✅ `get_cryptoku_leaderboard` Function
**Location:** `supabase/migrations/20260116094000_create_cryptoku_leaderboard_table.sql` (lines 170-297)
**Parameters:**
- `p_mode TEXT DEFAULT 'ALL'` ✅
- `p_limit INTEGER DEFAULT 50` ✅

**Security:** ✅ SECURITY DEFINER + search_path set

#### ✅ `reward_cryptoku_hint` Function
**Location:** `supabase/migrations/20260117010000_create_cryptoku_hints_table.sql` (lines 164-214)
**Parameters:**
- `p_user_id UUID` ✅

**Security:** ✅ SECURITY DEFINER + search_path set

### 4. Table Verification

#### ✅ `cryptoku_leaderboard` Table
**Status:** ✅ EXISTS (created in migration `20260116094000`)
**Columns:**
- `id` UUID PRIMARY KEY ✅
- `run_id` TEXT UNIQUE ✅
- `user_id` UUID ✅
- `mode` TEXT ✅
- `score` INTEGER ✅
- `time_seconds` INTEGER ✅
- `hints_used` INTEGER ✅
- `errors` INTEGER ✅
- `completed` BOOLEAN ✅
- `forfeited` BOOLEAN ✅
- `created_at` TIMESTAMP ✅

#### ✅ `leaderboard` Table
**Status:** ✅ EXISTS (from `scripts/01-create-tables.sql`)
**Columns:**
- `id` UUID PRIMARY KEY ✅
- `user_id` UUID UNIQUE ✅
- `total_points` INTEGER ✅
- `card_battle_wins` INTEGER ✅
- `ape_in_high_score` INTEGER ✅
- `cryptoku_high_score` INTEGER ✅
- `updated_at` TIMESTAMP ✅

#### ✅ `game_sessions` Table
**Status:** ✅ EXISTS (from `scripts/01-create-tables.sql`)
**Used by:** Ape In submit-result

#### ✅ `profiles` Table
**Status:** ✅ EXISTS
**Used by:** Both submit-result routes

### 5. Potential Issues Found

#### ⚠️ ISSUE #1: Missing `leaderboard` Entry Creation
**Location:** `app/api/cryptoku/submit-result/route.ts`
**Problem:** The code relies on `add_cryptoku_leaderboard_entry` to create/update the `leaderboard` entry, but if the user doesn't have a `leaderboard` entry, it might fail.

**Current Behavior:**
- `add_cryptoku_leaderboard_entry` function DOES handle this (lines 157-163):
  ```sql
  IF NOT FOUND THEN
    INSERT INTO leaderboard (user_id, cryptoku_high_score, updated_at)
    VALUES (p_user_id, p_score, NOW())
    ON CONFLICT (user_id) DO UPDATE SET ...
  END IF;
  ```
- ✅ This is handled correctly in the function

#### ⚠️ ISSUE #2: Ape In Leaderboard Entry Creation
**Location:** `app/api/ape-in/submit-result/route.ts` (lines 187-204)
**Problem:** The code manually checks and creates `leaderboard` entries, but this could fail if there's a race condition.

**Current Behavior:**
- Uses `ON CONFLICT` handling ✅
- But uses separate SELECT then INSERT/UPDATE (not atomic)
- Could be improved with a single UPSERT

#### ⚠️ ISSUE #3: Missing Error Handling for `update_user_balance` Return Value
**Location:** Both submit-result routes
**Problem:** `update_user_balance` returns `VOID`, but code doesn't verify it succeeded beyond checking for errors.

**Current Behavior:**
- Both routes check for `balanceError` ✅
- But `update_user_balance` is `RETURNS VOID`, so no return value to check
- Error checking is sufficient ✅

### 6. Function Name Consistency Check

| Code Calls | Database Function | Status |
|------------|------------------|--------|
| `update_user_balance` | `update_user_balance` | ✅ Match |
| `add_cryptoku_leaderboard_entry` | `add_cryptoku_leaderboard_entry` | ✅ Match |
| `get_cryptoku_leaderboard` | `get_cryptoku_leaderboard` | ✅ Match |
| `reward_cryptoku_hint` | `reward_cryptoku_hint` | ✅ Match |

### 7. Parameter Name Consistency Check

All parameter names match between code calls and function definitions ✅

### 8. RLS Policy Check

#### `cryptoku_leaderboard` Table
- ✅ RLS enabled
- ✅ Functions use SECURITY DEFINER (bypasses RLS)
- ✅ Admin client used in submit-result routes (bypasses RLS)

#### `leaderboard` Table
- ⚠️ Need to verify RLS policies exist
- ✅ Admin client used (bypasses RLS)

#### `profiles` Table
- ✅ RLS enabled
- ✅ Admin client used (bypasses RLS)

### 9. Missing Items Checklist

- [x] `cryptoku_leaderboard` table exists
- [x] `leaderboard` table exists
- [x] `game_sessions` table exists
- [x] `profiles` table exists
- [x] `add_cryptoku_leaderboard_entry` function exists
- [x] `get_cryptoku_leaderboard` function exists
- [x] `update_user_balance` function exists
- [x] `reward_cryptoku_hint` function exists
- [x] All functions have SECURITY DEFINER
- [x] All functions have search_path set
- [x] Parameter names match between code and functions

## 🎯 Recommendations

### 1. Verify `leaderboard` Table RLS Policies
Check if `leaderboard` table has proper RLS policies that allow the functions to work.

### 2. Improve Ape In Leaderboard UPSERT
Consider using a single UPSERT query instead of SELECT then INSERT/UPDATE.

### 3. Add Comprehensive Logging
Add more detailed logging to track exactly where failures occur.

### 4. Test Idempotency
Verify that duplicate `run_id` submissions are handled correctly in both routes.

## 🔧 Next Steps

1. **Check `leaderboard` table RLS policies** - Verify they allow function access
2. **Test actual submission flow** - Run a test submission and check logs
3. **Verify function security settings** - Confirm all functions have SECURITY DEFINER
4. **Check for missing indexes** - Ensure performance is optimal
