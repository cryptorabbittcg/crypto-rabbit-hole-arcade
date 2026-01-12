# SUPABASE CONFIGURATION AND USAGE AUDIT REPORT

**Date:** Generated on audit execution  
**Project:** Crypto Rabbit Hole Arcade (Next.js + Supabase)  
**Scope:** Complete Supabase configuration, database schema, write/read paths, leaderboards, and game integration

---

## A) CURRENT SUPABASE CONFIGURATION

### Environment Variables Used
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public key (client-side safe)

**Note:** No service role key found in codebase (server-side operations use anon key)

### Client Initialization Files

**Browser Client:**
- **File:** `lib/supabase/client.ts`
- **Function:** `createClient()` - Creates singleton browser client using `@supabase/ssr`'s `createBrowserClient`
- **Features:**
  - Singleton pattern with caching
  - Configuration validation via `hasSupabaseConfig()`
  - Graceful fallback if env vars missing (creates dummy client)
- **Imported in:**
  - All service files in `lib/supabase/services/`
  - `hooks/use-supabase-auth.ts`
  - `hooks/use-profile-sync.ts`

**Server Client:**
- **File:** `lib/supabase/server.ts`
- **Function:** `createClient()` - Creates server client using `@supabase/ssr`'s `createServerClient`
- **Features:**
  - Cookie-based session management
  - Uses Next.js `cookies()` API
- **Usage:** Server-side API routes and server components (though most API routes use browser client)

### Auth Usage
- **File:** `hooks/use-supabase-auth.ts`
- **Status:** Supabase Auth is configured but **NOT actively used** for authentication
- **Current Auth Method:** Wallet-based authentication (wallet address = user identity)
- **Auth Functions Available:**
  - `signIn(email, password)`
  - `signUp(email, password, username)`
  - `signOut()`
- **Note:** Profiles table uses `wallet_address` as unique identifier, not Supabase Auth user IDs

---

## B) DATABASE SCHEMA (AS USED BY CODE)

### Core Tables

#### 1. `profiles`
**Columns Accessed:**
- `id` (UUID, PRIMARY KEY)
- `wallet_address` (TEXT, UNIQUE, NOT NULL) - Primary identifier
- `username` (TEXT, UNIQUE)
- `avatar_url` (TEXT)
- `ape_balance` (INTEGER, DEFAULT 1000)
- `tickets` (INTEGER, DEFAULT 5)
- `points` (INTEGER, DEFAULT 0)
- `total_games_played` (INTEGER, DEFAULT 0)
- `total_wins` (INTEGER, DEFAULT 0)
- `total_losses` (INTEGER, DEFAULT 0)
- `win_streak` (INTEGER, DEFAULT 0)
- `best_win_streak` (INTEGER, DEFAULT 0)
- `total_playtime` (INTEGER, DEFAULT 0)
- `referral_code` (TEXT, UNIQUE)
- `referral_count` (INTEGER, DEFAULT 0)
- `referral_earnings` (INTEGER, DEFAULT 0)
- `created_at`, `updated_at`, `last_login` (TIMESTAMPS)

**Operations:**
- **SELECT:** `ProfileService.getProfile()`, `ProfileService.getProfileByWallet()` - Used extensively
- **INSERT:** `ProfileService.createProfile()` - Creates new profile on first wallet connection
- **UPDATE:** `ProfileService.updateProfile()`, `ProfileService.updateBalance()` - Updates stats and balances

**Indexes:**
- `idx_profiles_wallet` on `wallet_address`
- `idx_profiles_username` on `username`

#### 2. `game_sessions`
**Columns Accessed:**
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, FK to profiles)
- `game_type` (TEXT) - 'card_battle', 'ape_in', 'cryptoku', 'social_raid'
- `game_mode` (TEXT) - 'ai', 'pvp', 'solo', etc.
- `duration` (INTEGER) - seconds
- `score` (INTEGER, DEFAULT 0)
- `result` (TEXT) - 'won', 'lost', 'draw', 'abandoned', 'incomplete'
- `ape_earned` (INTEGER, DEFAULT 0)
- `tickets_earned` (INTEGER, DEFAULT 0)
- `points_earned` (INTEGER, DEFAULT 0)
- `started_at`, `ended_at` (TIMESTAMPS)

**Operations:**
- **INSERT:** `GameService.createGameSession()` - Creates session
- **UPDATE:** `GameService.completeGameSession()` - Updates on completion
- **SELECT:** `GameService.getUserGameHistory()` - Fetches user history

**Indexes:**
- `idx_game_sessions_user` on `user_id`
- `idx_game_sessions_type` on `game_type`

**Note:** Schema shows `duration` but code uses `duration_seconds` - potential mismatch

#### 3. `leaderboard`
**Columns Accessed:**
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, FK to profiles, UNIQUE)
- `total_points` (INTEGER, DEFAULT 0)
- `card_battle_wins` (INTEGER, DEFAULT 0)
- `ape_in_high_score` (INTEGER, DEFAULT 0)
- `cryptoku_high_score` (INTEGER, DEFAULT 0)
- `overall_rank` (INTEGER, calculated)
- `updated_at` (TIMESTAMP)

**Operations:**
- **UPDATE:** 
  - `update_user_balance()` RPC function updates `total_points` when points change
  - `add_cryptoku_leaderboard_entry()` RPC updates `cryptoku_high_score`
  - `record_game_session()` RPC updates `card_battle_wins` on wins
- **SELECT:** `LeaderboardService.getTopByPoints()` - Reads via `get_leaderboard()` RPC

**Indexes:**
- `idx_leaderboard_points` on `total_points DESC`

**Note:** `ape_in_high_score` column exists but **NO CODE FOUND** that writes to it

#### 4. `cryptoku_leaderboard`
**Columns Accessed:**
- `id` (UUID, PRIMARY KEY)
- `run_id` (TEXT, UNIQUE, NOT NULL)
- `user_id` (UUID, FK to profiles)
- `mode` (TEXT) - 'NOOB', 'DEGEN', 'APE' (CHECK constraint)
- `score` (INTEGER, NOT NULL, >= 0)
- `time_seconds` (INTEGER, NOT NULL, >= 0)
- `hints_used` (INTEGER, NOT NULL, >= 0)
- `errors` (INTEGER, NOT NULL, >= 0)
- `completed` (BOOLEAN, DEFAULT TRUE)
- `forfeited` (BOOLEAN, DEFAULT FALSE)
- `created_at` (TIMESTAMP)

**Operations:**
- **INSERT:** `CryptokuLeaderboardService.addEntry()` → `add_cryptoku_leaderboard_entry()` RPC
- **SELECT:** `CryptokuLeaderboardService.getLeaderboard()` → `get_cryptoku_leaderboard()` RPC
- **SELECT:** `CryptokuLeaderboardService.getUserBestRun()` - Direct query

**Indexes:**
- `idx_cryptoku_leaderboard_mode_score` on `(mode, score DESC, time_seconds ASC)` WHERE completed=true AND forfeited=false AND mode IN ('DEGEN', 'APE')
- `idx_cryptoku_leaderboard_user` on `(user_id, created_at DESC)`
- `idx_cryptoku_leaderboard_run_id` on `run_id`
- `idx_cryptoku_leaderboard_created` on `created_at DESC`

#### 5. `cryptoku_hints`
**Columns Accessed:**
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, FK to profiles, UNIQUE, NOT NULL)
- `hint_balance` (INTEGER, DEFAULT 3, >= 0)
- `total_ranked_completed` (INTEGER, DEFAULT 0, >= 0)
- `created_at`, `updated_at` (TIMESTAMPS)

**Operations:**
- **SELECT:** `CryptokuHintsService.getHints()` - Reads balance
- **UPDATE:** Via RPC functions:
  - `use_cryptoku_hint()` - Atomic decrement with row locking
  - `reward_cryptoku_hint()` - Atomic increment on completion (every 10 games)
  - `purchase_cryptoku_hints()` - Adds purchased hints

**Indexes:**
- `idx_cryptoku_hints_user` on `user_id`

#### 6. `ape_in_daily_free_plays`
**Columns Accessed:**
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, FK to profiles, NOT NULL)
- `game_mode` (TEXT) - 'aida', 'lana', 'enj1n', 'nifty' (CHECK constraint)
- `date_used` (DATE, DEFAULT CURRENT_DATE)
- `used_at` (TIMESTAMP)

**Operations:**
- **INSERT:** `ApeInFreePlaysService.useFreePlay()` - Records daily free play usage
- **SELECT:** `ApeInFreePlaysService.getFreePlaysRemaining()` - Counts plays for today

**Constraints:**
- UNIQUE(`user_id`, `game_mode`, `date_used`) - One play per user per mode per day

**Indexes:**
- `idx_ape_in_daily_free_plays_user` on `(user_id, date_used)`
- `idx_ape_in_daily_free_plays_date` on `date_used`
- `idx_ape_in_daily_free_plays_mode` on `(game_mode, date_used)`

#### 7. `ape_in_game_states`
**Columns Accessed:**
- `game_id` (TEXT, PRIMARY KEY)
- `game_state` (JSONB, NOT NULL) - Full game state stored as JSON
- `created_at`, `updated_at`, `expires_at` (TIMESTAMPS)

**Operations:**
- **INSERT/UPDATE:** Via `GameService` (uses `game-store.ts` which may use this table)
- **SELECT:** Game retrieval

**Indexes:**
- `idx_ape_in_game_states_expires` on `expires_at`
- `idx_ape_in_game_states_game_state` on `game_state` (GIN index)

**Note:** RLS allows public read/write (anyone can view/update game states)

#### 8. `pvp_matches`
**Columns Accessed:**
- `id` (UUID, PRIMARY KEY)
- `player1_id`, `player2_id` (UUID, FK to profiles)
- `winner_id` (UUID, FK to profiles)
- `match_status` (TEXT) - 'waiting', 'in_progress', 'completed', 'abandoned'
- `game_state` (JSONB)
- `created_at`, `started_at`, `ended_at` (TIMESTAMPS)

**Operations:**
- **INSERT:** `PvPService.findMatch()` - Creates or joins match
- **UPDATE:** `PvPService.updateMatchHealth()`, `PvPService.completeMatch()`
- **SELECT:** `PvPService.getMatch()`

**Note:** Schema shows `player1_health`, `player2_health`, `turn_count` in code but not in SQL schema - potential mismatch

### RPC Functions / Edge Functions

#### 1. `get_or_create_profile(p_wallet_address, p_username)`
- **Returns:** UUID (user_id)
- **Used by:** Not directly called in code (ProfileService uses direct queries)

#### 2. `update_user_balance(p_user_id, p_ape_change, p_tickets_change, p_points_change, p_transaction_type, p_description)`
- **Returns:** VOID
- **Used by:** `ProfileService.updateBalance()`
- **Actions:**
  - Updates `profiles` balances atomically
  - Inserts into `transactions` table
  - Updates `leaderboard.total_points` if points changed

#### 3. `record_game_result(p_user_id, p_won, p_points_earned)`
- **Returns:** VOID
- **Used by:** `ProfileService.recordGameResult()`
- **Note:** Function exists but **NOT FOUND** in `scripts/03-functions.sql` - may be missing or named differently

#### 4. `record_game_session(p_user_id, p_game_type, p_game_mode, p_duration, p_result, p_ape_earned, p_tickets_earned, p_points_earned)`
- **Returns:** UUID (session_id)
- **Used by:** Not directly called in code (GameService uses direct INSERT/UPDATE)
- **Actions:**
  - Inserts into `game_sessions`
  - Updates `profiles` stats (wins, losses, streaks, playtime)
  - Calls `update_user_balance()`
  - Updates `leaderboard.card_battle_wins` if card_battle win

#### 5. `add_cryptoku_leaderboard_entry(p_run_id, p_user_id, p_mode, p_score, p_time_seconds, p_hints_used, p_errors, p_completed, p_forfeited)`
- **Returns:** UUID (entry_id)
- **Used by:** `CryptokuLeaderboardService.addEntryByUserId()`
- **Actions:**
  - Inserts/updates `cryptoku_leaderboard` (ON CONFLICT on run_id)
  - Updates `leaderboard.cryptoku_high_score` if ranked run (DEGEN/APE, completed, not forfeited)
  - Creates leaderboard entry if doesn't exist

#### 6. `get_cryptoku_leaderboard(p_mode, p_limit)`
- **Returns:** TABLE with rank, run_id, user_id, wallet_address, username, mode, score, time_seconds, hints_used, errors, created_at
- **Used by:** `CryptokuLeaderboardService.getLeaderboard()`
- **Logic:**
  - Only returns ranked runs (DEGEN/APE, completed=true, forfeited=false)
  - Ranks by score DESC, time_seconds ASC
  - Supports mode filtering ('ALL', 'DEGEN', 'APE')

#### 7. `use_cryptoku_hint(p_user_id)`
- **Returns:** JSON with success, hintBalance, gamesUntilNextFreeHint, error
- **Used by:** `CryptokuHintsService.useHint()`
- **Actions:**
  - Row-level locking (FOR UPDATE) to prevent race conditions
  - Decrements `hint_balance` atomically
  - Creates record if doesn't exist

#### 8. `reward_cryptoku_hint(p_user_id)`
- **Returns:** JSON with hintsEarned, hintBalance, totalRankedCompleted, gamesUntilNextFreeHint
- **Used by:** `CryptokuHintsService.rewardHint()`
- **Actions:**
  - Increments `total_ranked_completed`
  - Adds 1 hint if completion count % 10 == 0

#### 9. `purchase_cryptoku_hints(p_user_id, p_amount)`
- **Returns:** JSON with success, hintBalance, gamesUntilNextFreeHint, error
- **Used by:** `CryptokuHintsService.purchaseHints()`

#### 10. `get_top_game_scores(p_limit)`
- **Returns:** TABLE with user_id, username, wallet_address, max_score, game_type
- **Used by:** `LeaderboardService.getTopScores()`
- **Logic:**
  - Gets highest score per user from `game_sessions`
  - Returns top N users by max score

#### 11. `get_leaderboard(p_limit)`
- **Returns:** TABLE with rank, user_id, username, avatar_url, total_points, total_wins, card_battle_wins
- **Used by:** `LeaderboardService.getTopByPoints()`
- **Logic:**
  - Ranks by `total_points DESC`
  - Joins with `profiles` for user info

---

## C) WRITE PATHS (WHERE DATA IS WRITTEN)

### Cryptoku: Degen Mode Leaderboard

**Entry Point:**
- Client: `features/games/cryptoku/cryptokugame.tsx` → `handleZkVerifyValidation()` (line ~1337)
- API: `app/api/cryptoku/submit-result/route.ts` → `POST` handler

**Flow:**
1. **Client submits result:**
   - POST to `/api/cryptoku/submit-result`
   - Body: `{ playerAddress, mode, runId, timeSeconds, hintsUsed, errors, completed, forfeited }`

2. **API validation:**
   - Validates required fields
   - Normalizes wallet address
   - Early return if NOOB mode or forfeited (no mutations)

3. **Score calculation (server-side):**
   - Function: `calculateScore()` in `route.ts` (lines 11-45)
   - Formula:
     - Base: DEGEN=500, APE=800, NOOB=0
     - Time decay: -0.2 points/second
     - Penalties: -15 per hint, -20 per error
     - Bonuses: +50 clean run, +10 per clean streak (capped at 100)
     - Minimum: 20 points floor
   - Uses `getCryptokuStats()` for clean streak (localStorage-based)

4. **Stats update:**
   - Updates local stats via `updateCryptokuStats()` (localStorage)
   - Updates clean streak and completion counts

5. **Hint reward:**
   - `CryptokuHintsService.rewardHint()` → `reward_cryptoku_hint()` RPC
   - Atomic operation: increments `total_ranked_completed`, adds hint if %10==0

6. **Leaderboard write:**
   - `CryptokuLeaderboardService.addEntry()` → `add_cryptoku_leaderboard_entry()` RPC
   - RPC actions:
     - Inserts/updates `cryptoku_leaderboard` (ON CONFLICT on run_id)
     - Updates `leaderboard.cryptoku_high_score` if ranked run
     - Creates leaderboard entry if doesn't exist

7. **Response:**
   - Returns: `{ success, score, cleanStreak, hintsEarned, hintBalance, gamesUntilNextFreeHint }`

**Points/Stats Updates:**
- **Points:** NOT directly awarded for Cryptoku (no points_earned in flow)
- **Stats:** Clean streak stored in localStorage (not Supabase)
- **Leaderboard:** Score stored in `cryptoku_leaderboard`, high score in `leaderboard.cryptoku_high_score`

### Ape In: Single Player (Aida, Lana, Nifty, En-J1n)

**Entry Point:**
- Client: `features/games/ape-in/apeingame.tsx` (game completion handler)
- **CRITICAL FINDING:** No score submission endpoint found for Ape In single-player modes

**Flow:**
1. **Game creation:**
   - POST to `/api/ape-in/game/create`
   - Creates game state via `GameService.createGame()`
   - Stores in `ape_in_game_states` table (or Vercel KV via `game-store.ts`)

2. **Game completion:**
   - Game state updated locally
   - **NO API CALL FOUND** to submit final score/results
   - **NO WRITE** to `game_sessions` table
   - **NO WRITE** to `leaderboard.ape_in_high_score`
   - **NO POINTS** awarded

**Points/Stats Updates:**
- **Status:** NOT IMPLEMENTED
- **Missing:** Score submission, session recording, points calculation, leaderboard updates

### Ape In: PvP Mode

**Entry Point:**
- Client: PvP match completion
- **CRITICAL FINDING:** No PvP-specific score submission found

**Flow:**
1. **Match creation:**
   - `PvPService.findMatch()` creates/joins match in `pvp_matches` table
   - Game state stored in `ape_in_game_states`

2. **Match completion:**
   - `PvPService.completeMatch()` updates `pvp_matches` with winner
   - **NO WRITE** to `game_sessions` for Ape In PvP
   - **NO WRITE** to `leaderboard`
   - **NO POINTS** awarded

**Points/Stats Updates:**
- **Status:** NOT IMPLEMENTED
- **Note:** `pvp_matches` table exists but designed for card battle, not Ape In

### Ape In: Multiplayer Mode

**Entry Point:**
- Similar to PvP
- **CRITICAL FINDING:** No multiplayer-specific implementation found

**Flow:**
- Same as PvP (no score submission)

**Points/Stats Updates:**
- **Status:** NOT IMPLEMENTED

---

## D) READ PATHS (WHERE DATA IS READ)

### Leaderboard Reads

#### Cryptoku Leaderboard
**Endpoint:** `GET /api/cryptoku/leaderboard?mode={DEGEN|APE|ALL}&limit={number}`

**Flow:**
1. `app/api/cryptoku/leaderboard/route.ts` → `GET` handler
2. `CryptokuLeaderboardService.getLeaderboard(mode, limit)`
3. Calls `get_cryptoku_leaderboard(p_mode, p_limit)` RPC
4. RPC query:
   - Filters: `completed=true AND forfeited=false AND mode IN ('DEGEN', 'APE')`
   - Joins with `profiles` for wallet_address and username
   - Orders by: score DESC, time_seconds ASC
   - Ranks: Mode-specific or global (if mode='ALL')
   - Limits: p_limit (default 50)

**Sorting:**
- Primary: `score DESC`
- Secondary: `time_seconds ASC` (lower time = better)
- Mode filtering: Supports 'ALL', 'DEGEN', 'APE'

**Pagination:**
- Limit-based only (no offset/cursor)

#### Overall Leaderboard (Points)
**Service:** `LeaderboardService.getTopByPoints(limit)`

**Flow:**
1. Calls `get_leaderboard(p_limit)` RPC
2. RPC query:
   - Joins `leaderboard` with `profiles`
   - Orders by: `total_points DESC`
   - Ranks: ROW_NUMBER() OVER (ORDER BY total_points DESC)
   - Limits: p_limit (default 100)

**Sorting:**
- Single sort: `total_points DESC`

**Pagination:**
- Limit-based only

#### Ape In Leaderboard
**Status:** NOT IMPLEMENTED
- Leaderboard UI shows tabs for Ape In modes but uses placeholder data
- No API endpoint found
- No service method found

### Profile/Stats Reads

**Service:** `ProfileService`

**Methods:**
1. `getProfile(userId)` - Direct query by UUID
2. `getProfileByWallet(walletAddress)` - Query by normalized wallet address
   - Normalizes to lowercase
   - Returns full profile with all stats

**Usage:**
- Called throughout app for user info
- Used by other services to get user_id from wallet address

---

## E) LEADERBOARD UI

**File:** `features/leaderboard/leaderboard-view.tsx`

**Components:**
- Main component: `LeaderboardView`
- Card component: `LeaderboardCard`

**Tabs/Modes:**
1. **Overall** - Shows `GLOBAL_LEADERBOARD` (hardcoded placeholder data)
2. **Cryptoku** - Shows `GLOBAL_LEADERBOARD` (hardcoded placeholder data)
3. **Ape In** - Shows `GLOBAL_LEADERBOARD` (hardcoded placeholder data)
4. **Ape In PvP** - Shows `GLOBAL_LEADERBOARD` (hardcoded placeholder data)
5. **Ape In Multiplayer** - Shows `GLOBAL_LEADERBOARD` (hardcoded placeholder data)

**Current State:**
- **ALL TABS USE PLACEHOLDER DATA** - No actual Supabase queries
- No integration with `LeaderboardService` or `CryptokuLeaderboardService`
- No API calls to fetch real leaderboard data

**Data Structure Expected:**
```typescript
type LeaderboardEntry = {
  rank: number
  address: string
  points: number
  wins: number
  streak: number
  avatar?: string
}
```

---

## F) FINDINGS / RISKS

### Critical Issues

#### 1. Ape In Score Submission Not Implemented
**Location:** `features/games/ape-in/`
**Issue:** No API endpoint or service method to submit Ape In game results
**Impact:**
- Single-player modes (Aida, Lana, Nifty, En-J1n) don't record scores
- No leaderboard entries created
- No points awarded
- `leaderboard.ape_in_high_score` column exists but never written to
- `game_sessions` table never receives Ape In completions

**Files Affected:**
- No score submission endpoint in `app/api/ape-in/`
- No service method in `lib/supabase/services/` for Ape In leaderboard

#### 2. Ape In PvP/Multiplayer Score Submission Not Implemented
**Location:** `features/games/ape-in/`
**Issue:** PvP and multiplayer modes don't record match results
**Impact:**
- No game sessions recorded
- No points awarded
- No leaderboard tracking

#### 3. Leaderboard UI Uses Placeholder Data
**Location:** `features/leaderboard/leaderboard-view.tsx`
**Issue:** All leaderboard tabs show hardcoded placeholder data
**Impact:**
- Users see fake leaderboard entries
- No real data displayed
- Cryptoku leaderboard API exists but not integrated

**Files Affected:**
- `features/leaderboard/leaderboard-view.tsx` (lines 18-29, all tabs)

### High Priority Issues

#### 4. Schema Mismatch: game_sessions duration field
**Location:** `scripts/01-create-tables.sql` vs `lib/supabase/services/game.service.ts`
**Issue:**
- Schema defines: `duration INTEGER`
- Code uses: `duration_seconds` (line 21, 53 in game.service.ts)
**Impact:** Column name mismatch may cause errors

#### 5. Schema Mismatch: pvp_matches missing columns
**Location:** `scripts/01-create-tables.sql` vs `lib/supabase/services/pvp.service.ts`
**Issue:**
- Schema defines: `player1_id`, `player2_id`, `winner_id`, `match_status`, `game_state`
- Code references: `player1_health`, `player2_health`, `turn_count` (lines 46-48, 71-83 in pvp.service.ts)
**Impact:** PvP service may fail when updating health/turn count

#### 6. RLS Policies Use Unset Session Variable
**Location:** `scripts/02-rls-policies.sql`
**Issue:** All RLS policies check `current_setting('app.current_user_id', true)`
**Impact:**
- This session variable is **NEVER SET** in codebase
- RLS policies will fail (return no rows) unless variable is set
- **Current workaround:** `profiles` table has RLS DISABLED (line 11)
- Other tables with RLS enabled may block legitimate queries

#### 7. Client-Side Direct Writes (Potential Security Risk)
**Location:** Multiple service files
**Issue:** Services use browser client (anon key) for all operations
**Impact:**
- No server-side validation for score submissions
- Client can potentially manipulate requests
- Cryptoku uses server-side scoring (good), but Ape In has no server validation

#### 8. Race Condition Risk: Free Plays
**Location:** `lib/supabase/services/ape-in-free-plays.service.ts`
**Issue:** `useFreePlay()` inserts without row locking
**Impact:**
- Multiple simultaneous requests could exceed daily limit
- UNIQUE constraint prevents duplicates but doesn't prevent race conditions
- Should use atomic operation (similar to `use_cryptoku_hint`)

#### 9. Missing Index: game_sessions score queries
**Location:** `scripts/01-create-tables.sql`
**Issue:** No index on `game_sessions(score)` for leaderboard queries
**Impact:**
- `get_top_game_scores()` RPC may be slow on large datasets
- Should add: `CREATE INDEX idx_game_sessions_score ON game_sessions(score DESC)`

#### 10. Points Not Awarded for Cryptoku
**Location:** `app/api/cryptoku/submit-result/route.ts`
**Issue:** Score is calculated but no `points_earned` is written to `game_sessions` or `profiles`
**Impact:**
- Cryptoku scores don't contribute to `leaderboard.total_points`
- Only `cryptoku_high_score` is updated
- Users don't earn points for playing Cryptoku

### Medium Priority Issues

#### 11. No Pagination for Leaderboards
**Location:** All leaderboard queries
**Issue:** Only limit-based, no offset/cursor pagination
**Impact:**
- Can't view pages beyond first N results
- Large leaderboards become inaccessible

#### 12. Leaderboard Rank Calculation
**Location:** `get_cryptoku_leaderboard()` RPC
**Issue:** Rank calculated in RPC using ROW_NUMBER(), but client re-ranks (line 18 in route.ts)
**Impact:**
- Inconsistent ranking between RPC and client
- Client-side re-ranking may be incorrect

#### 13. Cryptoku Stats in localStorage
**Location:** `lib/cryptoku-store.ts`
**Issue:** Clean streak stored in localStorage, not Supabase
**Impact:**
- Stats lost if localStorage cleared
- Not synced across devices
- Should migrate to `profiles` table or separate stats table

#### 14. Missing Validation: Score Submission
**Location:** `app/api/cryptoku/submit-result/route.ts`
**Issue:** No validation for:
- Score bounds (could be negative if calculation bug)
- Time bounds (could be 0 or extremely high)
- Run ID uniqueness (relies on database constraint)
**Impact:**
- Invalid data could be stored
- Duplicate submissions possible (though ON CONFLICT handles this)

#### 15. Ape In Game State Storage Inconsistency
**Location:** `lib/ape-in/game-store.ts`
**Issue:** Unclear if uses Supabase `ape_in_game_states` or Vercel KV
**Impact:**
- Game states may not persist correctly
- Need to verify storage backend

### Low Priority / Observations

#### 16. No Service Role Key Usage
**Observation:** All operations use anon key
**Impact:** Limited if need elevated permissions later

#### 17. Profile Creation Race Condition
**Location:** `lib/supabase/services/profile.service.ts`
**Issue:** `createProfile()` doesn't handle concurrent creation attempts
**Impact:**
- UNIQUE constraint on wallet_address prevents duplicates, but error handling could be better

#### 18. Leaderboard Entry Creation
**Location:** `add_cryptoku_leaderboard_entry()` RPC
**Issue:** Creates leaderboard entry if doesn't exist, but other games don't
**Impact:**
- Inconsistent behavior across games

#### 19. No Transaction Logging for Hints/Free Plays
**Observation:** Hints and free plays don't create `transactions` records
**Impact:**
- No audit trail for hint purchases/usage
- Free plays not tracked in transaction history

---

## G) PROPOSED PLAN (NO CHANGES - SUGGESTIONS ONLY)

### Minimal Changes to Standardize Scoring + Leaderboard Writes

#### 1. Implement Ape In Score Submission
**Priority:** CRITICAL

**Changes Needed:**
- Create `app/api/ape-in/submit-result/route.ts`
  - Accept: `{ walletAddress, gameId, mode, playerScore, opponentScore, winner, duration, rounds }`
  - Calculate points using scoring formula (similar to Cryptoku)
  - Write to `game_sessions` table
  - Update `leaderboard.ape_in_high_score` if new high score
  - Award points to `profiles.points` and `leaderboard.total_points`
  - Handle PvP/multiplayer modes (record for both players)

**Service Layer:**
- Create `lib/supabase/services/ape-in-leaderboard.service.ts`
  - `addEntry()` method
  - `getLeaderboard(mode, limit)` method
  - Similar pattern to `CryptokuLeaderboardService`

**Database:**
- Create RPC function `add_ape_in_leaderboard_entry()` similar to Cryptoku
- Or use direct INSERT/UPDATE in service

#### 2. Fix Schema Mismatches
**Priority:** HIGH

**Changes:**
- Rename `game_sessions.duration` → `duration_seconds` in schema
- Add columns to `pvp_matches`: `player1_health`, `player2_health`, `turn_count`
- Or update code to match schema

#### 3. Fix RLS Policies
**Priority:** HIGH

**Options:**
- **Option A:** Set `app.current_user_id` session variable in middleware/API routes
- **Option B:** Disable RLS on all tables (current approach for profiles)
- **Option C:** Use service role key for server-side operations (requires env var)

**Recommendation:** Option C (service role key) for security, with RLS enabled

#### 4. Integrate Leaderboard UI with Real Data
**Priority:** HIGH

**Changes:**
- Replace placeholder data in `leaderboard-view.tsx`
- Add API calls:
  - Overall: `LeaderboardService.getTopByPoints()`
  - Cryptoku: `CryptokuLeaderboardService.getLeaderboard()`
  - Ape In: New service (after implementing #1)
- Add loading states and error handling
- Add pagination (optional but recommended)

#### 5. Award Points for Cryptoku
**Priority:** MEDIUM

**Changes:**
- In `app/api/cryptoku/submit-result/route.ts`:
  - Calculate points from score (e.g., score = points, or different formula)
  - Call `ProfileService.updateBalance()` with points
  - Or use `record_game_session()` RPC with points_earned

#### 6. Standardize Score Submission Pattern
**Priority:** MEDIUM

**Create unified pattern:**
- All games submit to `/api/{game}/submit-result`
- All use server-side scoring
- All write to `game_sessions`
- All update `leaderboard.{game}_high_score`
- All award points to `leaderboard.total_points`

### Schema/Index Tweaks (Suggestions Only)

#### 7. Add Missing Indexes
```sql
-- For game_sessions score queries
CREATE INDEX idx_game_sessions_score ON game_sessions(score DESC) WHERE score > 0;

-- For leaderboard high score queries
CREATE INDEX idx_leaderboard_ape_in_high_score ON leaderboard(ape_in_high_score DESC) WHERE ape_in_high_score > 0;
CREATE INDEX idx_leaderboard_cryptoku_high_score ON leaderboard(cryptoku_high_score DESC) WHERE cryptoku_high_score > 0;

-- For game_sessions by game_type and mode
CREATE INDEX idx_game_sessions_type_mode ON game_sessions(game_type, game_mode) WHERE result = 'won';
```

#### 8. Add Ape In Leaderboard Table (Optional)
**Similar to `cryptoku_leaderboard`:**
```sql
CREATE TABLE ape_in_leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('aida', 'lana', 'enj1n', 'nifty', 'pvp', 'multiplayer')),
  score INTEGER NOT NULL CHECK (score >= 0),
  opponent_score INTEGER,
  winner TEXT, -- 'player' or 'opponent'
  duration_seconds INTEGER,
  rounds INTEGER,
  completed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ape_in_leaderboard_mode_score ON ape_in_leaderboard(mode, score DESC) WHERE completed = TRUE;
```

**Benefits:**
- Consistent with Cryptoku pattern
- Better query performance
- Supports mode-specific leaderboards

#### 9. Add Stats Table for Cryptoku
**Migrate localStorage stats to Supabase:**
```sql
CREATE TABLE cryptoku_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  clean_streak INTEGER DEFAULT 0,
  degen_completed_count INTEGER DEFAULT 0,
  ape_completed_count INTEGER DEFAULT 0,
  total_completed_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 10. Add Transaction Logging for Hints/Free Plays
**Track in transactions table:**
- Hint purchases
- Hint usage (optional, may be too verbose)
- Free play usage (optional)

---

## SUMMARY CHECKLIST (What Would Change)

### Critical (Must Fix)
- [ ] Implement Ape In score submission API endpoint
- [ ] Create Ape In leaderboard service
- [ ] Fix `game_sessions.duration` vs `duration_seconds` mismatch
- [ ] Fix `pvp_matches` missing columns or update code
- [ ] Integrate real leaderboard data in UI (replace placeholders)
- [ ] Award points for Cryptoku games

### High Priority (Should Fix)
- [ ] Fix RLS policies (set session variable or use service role key)
- [ ] Add atomic operation for Ape In free plays (prevent race conditions)
- [ ] Add index on `game_sessions(score)` for performance
- [ ] Implement Ape In PvP/multiplayer score submission

### Medium Priority (Nice to Have)
- [ ] Add pagination to leaderboard queries
- [ ] Migrate Cryptoku stats from localStorage to Supabase
- [ ] Add validation for score submissions
- [ ] Standardize score submission pattern across all games
- [ ] Add transaction logging for hints/free plays

### Low Priority (Future Enhancements)
- [ ] Add service role key for elevated permissions
- [ ] Improve error handling for profile creation race conditions
- [ ] Add audit logging for all game completions
- [ ] Consider separate leaderboard tables per game (like Cryptoku)

---

**END OF AUDIT REPORT**

