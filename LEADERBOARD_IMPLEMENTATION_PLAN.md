# LEADERBOARD & POINTS IMPLEMENTATION PLAN

**Status:** PLANNING - AWAITING CONFIRMATION  
**Date:** Generated for review  
**Scope:** Supabase-backed leaderboards, points system, and UI integration

---

## EXECUTIVE SUMMARY

This plan outlines a minimal, step-by-step implementation to:
1. Wire existing Overall Points leaderboard to real data
2. Wire Cryptoku leaderboard to existing API
3. Implement Ape In score submission and storage
4. Wire Ape In leaderboards
5. Implement points aggregation across all ranked modes
6. Update homepage High Scores widget
7. Fix schema mismatches safely

**Key Principle:** SCORE (game-specific) vs POINTS (cross-game currency) must remain separate concepts.

---

## 1. TARGET DATA MODEL

### 1.1 Per-Run Scores Storage

**Cryptoku (already exists):**
- **Table:** `cryptoku_leaderboard`
- **Columns:** `run_id`, `user_id`, `mode`, `score`, `time_seconds`, `hints_used`, `errors`, `completed`, `forfeited`
- **Status:** ✅ Already implemented and working

**Ape In (to be implemented):**
- **Table:** `game_sessions` (reuse existing table)
- **Columns:** `user_id`, `game_type='ape_in'`, `game_mode` ('aida', 'lana', 'nifty', 'enj1n', 'pvp', 'multiplayer'), `score`, `duration`, `result`
- **Storage approach:** Store all runs in `game_sessions`, but leaderboards show BEST SCORE PER USER per mode (not individual runs)
- **Decision:** Use `game_sessions` table + RPC function to aggregate best scores per user

### 1.2 Per-User High Scores (Fast Lookups)

**Cryptoku:**
- **Storage:** `leaderboard.cryptoku_high_score`
- **Updated by:** `add_cryptoku_leaderboard_entry()` RPC
- **Status:** ✅ Already implemented

**Ape In:**
- **Storage:** `leaderboard.ape_in_high_score`
- **To be updated by:** New logic in Ape In submit-result API
- **Status:** ❌ Column exists but never written to

### 1.3 Overall Points Totals (Cumulative)

**Storage:**
- `profiles.points` - User's total points balance
- `leaderboard.total_points` - Mirror for leaderboard queries (updated via `update_user_balance()` RPC)

**Source of Truth:** `profiles.points` (single source of truth)

**Aggregation Strategy:**
- Points are awarded per-ranked-game completion
- Each ranked mode awards points based on score (see section 5)
- Points accumulate in `profiles.points` via `update_user_balance()` RPC
- `leaderboard.total_points` is automatically synced by `update_user_balance()` RPC

**Ranked Modes Contributing to Points:**
1. Cryptoku: DEGEN mode (ranked) ✅
2. Cryptoku: APE mode (ranked) ✅
3. Ape In: Aida (ranked single-player) ✅
4. Ape In: Lana (ranked single-player) ✅
5. Ape In: Nifty (ranked single-player) ✅
6. Ape In: En-J1n (ranked single-player) ✅
7. Ape In: PvP (ranked) ✅
8. Ape In: Multiplayer (ranked) ✅

**Unranked Modes (DO NOT award points):**
- Cryptoku: NOOB mode ❌
- Any unranked/casual modes ❌

---

## 2. API ROUTES TO ADD/UPDATE

### 2.1 New API Route: `/api/ape-in/submit-result`

**Method:** POST  
**Path:** `app/api/ape-in/submit-result/route.ts`

**Request Body:**
```typescript
{
  playerAddress: string        // Wallet address (normalized lowercase)
  gameId?: string              // Optional: game session ID if created earlier
  mode: 'aida' | 'lana' | 'nifty' | 'enj1n' | 'pvp' | 'multiplayer'
  score: number                // Game-specific score
  durationSeconds: number      // Time taken in seconds
  result: 'won' | 'lost' | 'draw' | 'completed'  // For single-player: 'completed', PvP: 'won'/'lost'
  opponentAddress?: string     // For PvP/Multiplayer
  opponentScore?: number       // For PvP/Multiplayer
  metadata?: Record<string, any>  // Optional game-specific data
}
```

**Response:**
```typescript
{
  success: boolean
  sessionId?: string
  pointsEarned?: number
  highScoreUpdated?: boolean
  error?: string
}
```

**Logic:**
1. Validate required fields
2. Normalize wallet address
3. Get/create profile
4. Calculate points (see section 5)
5. Create/update `game_sessions` entry
6. Update `leaderboard.ape_in_high_score` if new high score
7. Award points via `update_user_balance()` RPC (only for ranked modes)
8. Return response

**Files to create:**
- `app/api/ape-in/submit-result/route.ts`

### 2.2 API Route Updates (if needed)

**Existing routes (no changes needed):**
- `/api/cryptoku/submit-result` - ✅ Already works (but doesn't award points yet - see Step 5)

---

## 3. SUPABASE/RPC CHANGES

### 3.1 Schema Mismatch Fixes

**Issue 1: `game_sessions.duration` vs `duration_seconds`**

**Current State:**
- Schema (SQL): `duration INTEGER`
- Code: Uses `duration_seconds` (in `game.service.ts` lines 21, 53)

**Decision: Option 1 - Change code to match DB (SAFEST)**
- Update `lib/supabase/services/game.service.ts` to use `duration` instead of `duration_seconds`
- This is safer because:
  - SQL schema is the source of truth
  - No migration needed
  - Only affects code that's not currently working (Ape In doesn't use it yet)

**Files to update:**
- `lib/supabase/services/game.service.ts` (lines 21, 53)
- Any other code that references `duration_seconds` in game_sessions context

**Issue 2: `pvp_matches` missing columns**

**Current State:**
- Schema: No `player1_health`, `player2_health`, `turn_count`
- Code: `lib/supabase/services/pvp.service.ts` references these columns

**Decision: Defer (not in scope for MVP)**
- These columns are for Card Battle PvP, not Ape In
- Ape In PvP uses different structure (game_state JSONB)
- Will handle separately if needed

### 3.2 New RPC Functions

**Required:** Create `get_ape_in_leaderboard(p_mode TEXT, p_limit INTEGER)` RPC function.

**Purpose:** Get BEST SCORE PER USER per mode (not individual runs).

**Function Signature:**
```sql
CREATE OR REPLACE FUNCTION get_ape_in_leaderboard(
  p_mode TEXT,  -- 'aida', 'lana', 'nifty', 'enj1n', 'pvp', 'multiplayer', or 'all'
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  wallet_address TEXT,
  username TEXT,
  mode TEXT,
  best_score INTEGER,
  games_played INTEGER,
  last_played TIMESTAMP WITH TIME ZONE
)
```

**Logic:**
- Query `game_sessions` WHERE `game_type='ape_in'` AND `game_mode=p_mode` (or all modes if p_mode='all')
- Group by `user_id`, get MAX(`score`) as `best_score`
- Join with `profiles` for wallet_address and username
- Order by `best_score DESC`
- Return top N users with rank

**Rationale:**
- Ensures leaderboards show best-per-user (no duplicate users)
- Homepage High Scores widget also uses this (best-per-user requirement)
- Consistent with requirement: "must show BEST SCORE PER USER per mode (not top runs)"

### 3.3 Migration Script (if needed)

**No new migrations needed for MVP:**
- All required tables/columns already exist
- Schema mismatch fix is code-only (no DB changes)

---

## 4. UI COMPONENTS TO CHANGE

### 4.1 Leaderboard Page: `/features/leaderboard/leaderboard-view.tsx`

**Current State:** All tabs use `GLOBAL_LEADERBOARD` placeholder data

**Changes:**

**Tab 1: Overall Points**
- Replace placeholder with `LeaderboardService.getTopByPoints(limit)`
- Display `total_points` from RPC result
- Show user's rank and points in "Your Rank" card

**Tab 2: Cryptoku**
- Replace placeholder with `CryptokuLeaderboardService.getLeaderboard('DEGEN', limit)` or `getLeaderboard('ALL', limit)`
- Display score, time, hints, errors
- Map RPC result to `LeaderboardEntry` format

**Tab 3: Ape In (Single-Player)**
- Call `get_ape_in_leaderboard('all', limit)` or aggregate single-player modes
- Display BEST SCORE PER USER (not individual runs)
- Show: rank, username/wallet, best_score, games_played

**Tab 4: Ape In PvP**
- Call `get_ape_in_leaderboard('pvp', limit)`
- Display BEST SCORE PER USER for PvP mode
- Show: rank, username/wallet, best_score

**Tab 5: Ape In Multiplayer**
- Call `get_ape_in_leaderboard('multiplayer', limit)`
- Display BEST SCORE PER USER for Multiplayer mode
- Show: rank, username/wallet, best_score

**Files to update:**
- `features/leaderboard/leaderboard-view.tsx`

**New service methods (if needed):**
- Add to `LeaderboardService` or create `ApeInLeaderboardService`:
  - `getApeInLeaderboard(mode, limit)` - Get leaderboard for specific mode
  - `getApeInTopScores(limit)` - Get top scores across all single-player modes

### 4.2 Homepage High Scores Widget: `/features/arcade/arcade-hub.tsx`

**Current State:** Uses `LeaderboardService.getTopScores(10)` which gets best scores from `game_sessions` (mixed games)

**Required Changes:**
- Show TOP 3-5 scores for:
  - Cryptoku DEGEN (top 3-5)
  - Ape In ranked (top 3-5, aggregated or per-mode)
- Optional: Small "Overall Points top 3-5" widget if space allows
- Must be driven by Supabase data (no placeholder)

**Implementation:**
- Fetch Cryptoku DEGEN top 3-5: `CryptokuLeaderboardService.getLeaderboard('DEGEN', 5)` (already shows best-per-user via RPC)
- Fetch Ape In top 3-5: Call `get_ape_in_leaderboard('all', 5)` to get BEST SCORE PER USER (not individual runs)
- Display in separate sections or tabs within the widget
- Update `ScoreEntry` component to handle different data structures
- **Critical:** Must show BEST SCORE PER USER (no duplicate users in the list)

**Files to update:**
- `features/arcade/arcade-hub.tsx`

### 4.3 In-Game Leaderboard Buttons

**Cryptoku:** Already has leaderboard button (verify it works)

**Ape In:** Add leaderboard buttons that deep-link to `/leaderboard?tab=ape-in&mode={mode}`

**Implementation:**
- Use Next.js `useRouter` to navigate
- Update leaderboard page to read query params and set active tab/mode
- Files: Ape In game component + `leaderboard-view.tsx` (read query params)

---

## 5. POINTS AWARDING RULES

### 5.1 V1 Simple Formula

**Proposal:** `points_earned = score` (1:1 mapping)

**Rationale:**
- Simplest possible implementation
- Cryptoku scores range: ~20-800+ (DEGEN: 20-500+, APE: 20-800+)
- Ape In scores: TBD (need to check game logic, but assume similar range)
- 1:1 mapping keeps it straightforward and predictable

**Alternative considered:** Fixed scale (e.g., `points_earned = score / 10`)
- Rejected for MVP: Unnecessary complexity
- Can adjust later if scores become too high/low

### 5.2 Points Application Rules

**Only award points for RANKED modes:**
- ✅ Cryptoku: DEGEN (ranked)
- ✅ Cryptoku: APE (ranked)
- ✅ Ape In: Aida (ranked single-player)
- ✅ Ape In: Lana (ranked single-player)
- ✅ Ape In: Nifty (ranked single-player)
- ✅ Ape In: En-J1n (ranked single-player)
- ✅ Ape In: PvP (ranked)
- ✅ Ape In: Multiplayer (ranked)
- ❌ Cryptoku: NOOB (not ranked - DO NOT award points)
- ❌ Any unranked/casual modes (DO NOT award points)

**Implementation:**
- In API routes, only call `update_user_balance()` with `p_points_change > 0` for ranked modes
- For Cryptoku: Update `/api/cryptoku/submit-result` to award points (currently doesn't)
- For Ape In: Only award points in submit-result API for ranked modes

**Points Storage:**
- Points awarded via `update_user_balance(user_id, 0, 0, points_earned, 'game_reward', 'Reward from {game_type}')`
- This automatically:
  - Updates `profiles.points`
  - Updates `leaderboard.total_points`
  - Creates transaction record

---

## 6. SCHEMA MISMATCH STRATEGY

### 6.1 `game_sessions.duration` vs `duration_seconds`

**Strategy: Option 1 - Change code to match DB (LEAST RISKY)**

**Reasoning:**
- SQL schema is source of truth (uses `duration` column)
- No database migration needed
- Only affects code that references the field
- `GameService` currently uses `duration_seconds` but Ape In doesn't use it yet (no breaking change)

**IMPORTANT - Type Definition Handling:**
- **Check first:** Verify if `lib/supabase/database.types.ts` is auto-generated or manually maintained
- **If auto-generated:** Do NOT manually edit it. Type mismatch will exist but code will work (runtime column name takes precedence)
- **If manually maintained:** Update `GameSession` type to use `duration` instead of `duration_seconds`
- **Current observation:** No generation scripts found in package.json, types appear manually written but may be out of sync with schema

**Changes:**
1. Update `lib/supabase/services/game.service.ts`:
   - Line 21: Change `duration_seconds: 0` to `duration: 0`
   - Line 53: Change `duration_seconds: durationSeconds` to `duration: durationSeconds`
2. **Conditional:** Update `lib/supabase/database.types.ts` ONLY if confirmed manually maintained:
   - Change `duration_seconds: number` to `duration: number` in `GameSession` type
   - If auto-generated, skip this step
3. Search codebase for other references to `duration_seconds` in `game_sessions` context
4. Update Ape In submit-result API to use `duration` (not `duration_seconds`)

**Files to update:**
- `lib/supabase/services/game.service.ts` (REQUIRED)
- `lib/supabase/database.types.ts` (CONDITIONAL - only if manually maintained)
- New `app/api/ape-in/submit-result/route.ts` (use `duration`)

**Testing:**
- Verify `GameService.createGameSession()` and `completeGameSession()` work with `duration`
- Check if any existing code breaks (shouldn't - Ape In not using it yet)
- TypeScript may show type error if types not updated, but runtime will work (Supabase uses column names, not TypeScript types)

### 6.2 `pvp_matches` Missing Columns

**Strategy: Defer (out of scope)**

- These columns are for Card Battle PvP, not Ape In
- Ape In PvP uses `game_state` JSONB field
- Will handle separately if Card Battle PvP needs them

---

## 7. STEP-BY-STEP EXECUTION PLAN

### STEP 1: Wire Overall Points Leaderboard Tab to Real RPC Data (LOWEST RISK)

**Goal:** Connect existing Overall Points tab to `get_leaderboard()` RPC

**IMPORTANT:** When you implement Step 1, do not touch any other tabs, services, or endpoints. Step 1 only.

**Changes:**
1. Update `features/leaderboard/leaderboard-view.tsx`:
   - Add state for Overall Points leaderboard data
   - Add `useEffect` to fetch data on mount
   - Call `LeaderboardService.getTopByPoints(100)`
   - Map RPC result to `LeaderboardEntry` format
   - Replace placeholder `GLOBAL_LEADERBOARD` with real data
   - Add loading/error states
   - Update "Your Rank" card to show user's actual rank/points

**Files touched:**
- `features/leaderboard/leaderboard-view.tsx`

**Tests to run:**
1. Visit `/leaderboard` page
2. Click "Overall" tab
3. Verify real data displays (not placeholder)
4. Verify user's rank/points show correctly in "Your Rank" card
5. Verify loading state works
6. Verify error handling (if Supabase not configured)

**Estimated time:** 30-60 minutes

---

### STEP 2: Wire Cryptoku Leaderboard Tab to Existing API

**Goal:** Connect Cryptoku tab to `CryptokuLeaderboardService.getLeaderboard()`

**Changes:**
1. Update `features/leaderboard/leaderboard-view.tsx`:
   - Add state for Cryptoku leaderboard data
   - Add `useEffect` to fetch data when Cryptoku tab is active
   - Call `CryptokuLeaderboardService.getLeaderboard('DEGEN', 100)` or `getLeaderboard('ALL', 100)`
   - Map RPC result to display format (score, time, hints, errors)
   - Replace placeholder with real data
   - Add loading/error states

**Files touched:**
- `features/leaderboard/leaderboard-view.tsx`

**Tests to run:**
1. Visit `/leaderboard` page
2. Click "Cryptoku" tab
3. Verify real Cryptoku leaderboard data displays
4. Verify scores, times, hints, errors show correctly
5. Verify loading state works

**Estimated time:** 30-60 minutes

---

### STEP 3: Implement Ape In Submit-Result API + Storage

**Goal:** Create API endpoint to submit Ape In game results and store in Supabase

**Changes:**
1. Create SQL migration script for new RPC function:
   - Create `scripts/10-create-ape-in-leaderboard-rpc.sql` (or add to existing functions file)
   - Implement `get_ape_in_leaderboard(p_mode TEXT, p_limit INTEGER)` RPC
   - Function returns BEST SCORE PER USER per mode (aggregated from game_sessions)

2. Create `app/api/ape-in/submit-result/route.ts`:
   - POST handler
   - Validate request body
   - Normalize wallet address
   - Get/create profile via `ProfileService`
   - Calculate points (score = points for MVP)
   - Insert into `game_sessions` (use `duration` not `duration_seconds`)
   - Update `leaderboard.ape_in_high_score` if new high score (compare with current max)
   - Award points via `update_user_balance()` RPC (ONLY for ranked modes: aida, lana, nifty, enj1n, pvp, multiplayer)
   - Return response

3. Fix schema mismatch in `lib/supabase/services/game.service.ts`:
   - Change `duration_seconds` to `duration` (lines 21, 53)

4. Conditionally update `lib/supabase/database.types.ts`:
   - Check if file is auto-generated or manually maintained
   - If manually maintained: Change `duration_seconds` to `duration` in `GameSession` type
   - If auto-generated: Skip (runtime will work, TypeScript may show type error but code executes correctly)

**Files touched:**
- `scripts/10-create-ape-in-leaderboard-rpc.sql` (NEW - or add to existing functions file)
- `app/api/ape-in/submit-result/route.ts` (NEW)
- `lib/supabase/services/game.service.ts`
- `lib/supabase/database.types.ts` (CONDITIONAL - only if manually maintained)

**Tests to run:**
1. Call API with valid Ape In single-player result
2. Verify `game_sessions` entry created
3. Verify `leaderboard.ape_in_high_score` updated
4. Verify points awarded to `profiles.points` and `leaderboard.total_points`
5. Verify transaction record created
6. Test with PvP/Multiplayer modes
7. Test error cases (invalid data, missing fields)

**Estimated time:** 2-3 hours

---

### STEP 4: Wire Ape In Tabs + Homepage High Score Widget

**Goal:** Connect Ape In leaderboard tabs and homepage widget to real data

**Changes:**

**4a. Leaderboard Page - Ape In Tabs:**
1. Update `lib/supabase/services/leaderboard.service.ts` (or create `ApeInLeaderboardService`):
   - Add method `getApeInLeaderboard(mode, limit)` that calls `get_ape_in_leaderboard()` RPC
   - Returns BEST SCORE PER USER per mode (not individual runs)

2. Update `features/leaderboard/leaderboard-view.tsx`:
   - Add state for Ape In leaderboard data
   - Call `get_ape_in_leaderboard()` RPC for each tab (single-player, pvp, multiplayer)
   - Display BEST SCORE PER USER (no duplicates)
   - Replace placeholders in "Ape In", "Ape In PvP", "Ape In Multiplayer" tabs
   - Add loading/error states

**4b. Homepage High Scores Widget:**
1. Update `features/arcade/arcade-hub.tsx`:
   - Fetch Cryptoku DEGEN top 3-5: `CryptokuLeaderboardService.getLeaderboard('DEGEN', 5)` (already best-per-user)
   - Fetch Ape In top 3-5: Call `get_ape_in_leaderboard('all', 5)` RPC to get BEST SCORE PER USER
   - Update widget to show both (separate sections or tabs)
   - Update `ScoreEntry` component if needed
   - **Critical:** Ensure no duplicate users in the list (best-per-user requirement)

**Files touched:**
- `features/leaderboard/leaderboard-view.tsx`
- `features/arcade/arcade-hub.tsx`
- `lib/supabase/services/leaderboard.service.ts` (add Ape In methods)

**Tests to run:**
1. Visit `/leaderboard`, test all Ape In tabs
2. Visit homepage, verify High Scores widget shows real data
3. Verify Cryptoku and Ape In scores display correctly
4. Verify loading/error states

**Estimated time:** 2-3 hours

---

### STEP 5: Points Aggregation Across Ranked Modes (Cryptoku + Ape In)

**Goal:** Award points for Cryptoku ranked games and ensure all ranked modes contribute to Overall Points

**Changes:**
1. Update `app/api/cryptoku/submit-result/route.ts`:
   - After score calculation, calculate points (points = score for MVP)
   - Call `ProfileService.updateBalance()` or `update_user_balance()` RPC to award points
   - Only for ranked modes (DEGEN, APE)
   - Update response to include `pointsEarned`

2. Verify Ape In submit-result API awards points ONLY for ranked modes (already done in Step 3)
   - Verify points NOT awarded for unranked modes
   - Verify points awarded for: aida, lana, nifty, enj1n, pvp, multiplayer
3. Verify Cryptoku submit-result API awards points ONLY for ranked modes (DEGEN, APE)
   - Verify points NOT awarded for NOOB mode

3. Test Overall Points leaderboard reflects points from both games

**Files touched:**
- `app/api/cryptoku/submit-result/route.ts`

**Tests to run:**
1. Complete Cryptoku DEGEN game
2. Verify points awarded to `profiles.points`
3. Verify `leaderboard.total_points` updated
4. Verify Overall Points leaderboard shows updated rank
5. Test with Ape In game, verify points accumulate
6. Verify transaction records created for both

**Estimated time:** 1-2 hours

---

## 8. TESTING CHECKLIST

### Step 1 Tests
- [ ] Overall Points tab shows real data
- [ ] User's rank/points display correctly
- [ ] Loading state works
- [ ] Error handling works

### Step 2 Tests
- [ ] Cryptoku tab shows real leaderboard
- [ ] Scores, times, hints, errors display
- [ ] Loading state works

### Step 3 Tests
- [ ] `get_ape_in_leaderboard()` RPC function created and works
- [ ] RPC returns BEST SCORE PER USER (no duplicates)
- [ ] Ape In submit-result API creates game_sessions entry
- [ ] High score updated in leaderboard table
- [ ] Points awarded for ranked modes (aida, lana, nifty, enj1n, pvp, multiplayer)
- [ ] Points NOT awarded for unranked modes
- [ ] Schema mismatch fix works (duration field)
- [ ] database.types.ts handling verified (manual vs generated)

### Step 4 Tests
- [ ] All Ape In tabs show real data (BEST SCORE PER USER)
- [ ] No duplicate users in leaderboard lists
- [ ] Homepage High Scores widget shows Cryptoku + Ape In
- [ ] Widget displays top 3-5 for each game (BEST SCORE PER USER)
- [ ] No duplicate users in homepage widget

### Step 5 Tests
- [ ] Cryptoku DEGEN awards points
- [ ] Cryptoku APE awards points
- [ ] Cryptoku NOOB does NOT award points
- [ ] Overall Points leaderboard reflects points from Cryptoku (DEGEN+APE) + Ape In (all ranked modes)
- [ ] Points accumulate correctly across games

---

## 9. RISKS & MITIGATION

**Risk 1: Schema mismatch breaks existing code**
- **Mitigation:** Check if `GameService` is used elsewhere before changing `duration_seconds` to `duration`
- **Fallback:** If needed, create migration to add `duration_seconds` column (but Option 1 is safer)

**Risk 2: RLS policies block API routes**
- **Mitigation:** Verify RLS policies allow service role or anon key operations
- **Fallback:** Temporarily disable RLS on affected tables for MVP (not ideal but works)

**Risk 3: Points calculation causes score inflation**
- **Mitigation:** Start with 1:1 mapping (score = points), monitor, adjust if needed
- **Fallback:** Can adjust formula later (points are stored, can recalculate if needed)

**Risk 4: Ape In scoring logic unknown**
- **Mitigation:** Check Ape In game code for score calculation
- **Fallback:** Use placeholder formula for MVP, refine later

---

## 10. OPEN QUESTIONS

1. **Ape In Score Calculation:** What is the actual scoring formula for Ape In games? Need to check game code.
2. **Homepage Widget Layout:** Should Cryptoku and Ape In scores be in separate sections, tabs, or combined?
3. **Leaderboard Pagination:** Should we add pagination to leaderboard pages (future enhancement)?
4. **Points Formula:** Confirm 1:1 mapping (score = points) is acceptable for MVP, or need scaling?

---

## SUMMARY

**Total Steps:** 5  
**Total Files to Create:** 2 (`scripts/10-create-ape-in-leaderboard-rpc.sql`, `app/api/ape-in/submit-result/route.ts`)  
**Total Files to Update:** ~5-6 (leaderboard-view.tsx, arcade-hub.tsx, cryptoku submit-result, game.service.ts, database.types.ts conditional, leaderboard.service.ts)  
**Estimated Total Time:** 8-12 hours (includes RPC function creation and best-per-user aggregation logic)  
**Risk Level:** Low-Medium (minimal changes, reusing existing patterns, but need to verify type generation)

**Key Constraints Added:**
1. ✅ Points ONLY for ranked modes (Cryptoku: DEGEN+APE, Ape In: all ranked modes)
2. ✅ Ape In leaderboards show BEST SCORE PER USER (via RPC function)
3. ✅ Homepage High Scores widget shows BEST SCORE PER USER
4. ✅ Duration mismatch: Fix code to match DB, verify database.types.ts handling first

**Next Action:** Await user confirmation before proceeding with Step 1.

