# 🎯 Ape In Play Consumption Hook-In Points
**Date:** 2026-01-20  
**Status:** Report Only (No Changes)

---

## ✅ Corrections to Implementation Map

### 1. Play Consumption Location (CRITICAL)

**❌ INCORRECT (from map):**
- "Add play consumption logic to submit-result route"

**✅ CORRECT:**
- **Play consumption happens at game start, NOT at submit-result**
- Hook into `/api/ape-in/game/create` route BEFORE creating game
- Server-side atomic operation (prevent spoofing)

**Why:**
- If user crashes/disconnects before submit-result, play should still be consumed
- submit-result may never fire → creates free exploit if consumption is there
- submit-result should remain pure logging + points + leaderboard

---

### 2. Pricing Consistency

**Current Code:**
- `PaymentService.getGamePrice()` returns `0.1 APE` (per play)
- `PlayBalanceService.getPlayPrice()` returns `0.1 APE`

**New MVP Decision:**
- **1 APE = 5 plays** (bundle only)
- No single-play purchases

**Action Required:**
- Update all pricing references to reflect bundle model
- Remove "0.1 APE per play" from codebase
- Replace with "1 APE = 5 plays" everywhere

---

## 🔍 Current Play Consumption Flow (Analysis)

### Current State:

**Client-Side (INSECURE):**
- `PlayBalanceService.useFreePlay()` - localStorage-based (line 123 in `playBalanceService.ts`)
- Called client-side before game creation
- **Can be spoofed** - no server validation

**Server-Side (MISSING):**
- `/api/ape-in/game/create` route has TODO comment (line 36):
  ```typescript
  // TODO: Check payment/play token for ranked modes (if needed)
  ```
- **No actual play consumption happens server-side**
- Game is created regardless of play availability

**Free Plays API:**
- `/api/ape-in/free-plays/use` route exists but **not called during game creation**
- Only used for explicit free play deduction (separate flow)

---

## 🎯 Where Purchased-Play Consumption Should Hook In

### File: `app/api/ape-in/game/create/route.ts`

**Current Code (lines 5-72):**
```typescript
export async function POST(request: NextRequest) {
  // ... validation ...
  
  // TODO: Check payment/play token for ranked modes (if needed)
  // For now, we'll allow game creation for all modes
  
  const gameState = await GameService.createGame(...)
  
  return NextResponse.json(gameState)
}
```

**✅ CORRECT Hook-In Point:**

**Location:** Right after validation, BEFORE `GameService.createGame()` call

**Flow:**
1. Validate mode, playerName, walletAddress (existing)
2. **NEW: Consume play (server-side, atomic)**
   - If Sandy → skip (always free)
   - If ranked mode:
     - Check free plays first (via `ApeInFreePlaysService`)
     - If free plays > 0 → consume free play
     - Else check purchased plays (via new service)
     - If purchased plays > 0 → consume purchased play
     - Else → return 400 error "No plays available"
3. Only if play consumed successfully → create game
4. Return game state

**Recommended Implementation Pattern:**
```typescript
// After validation (around line 35)

// Sandy is always free - skip play consumption
if (mode === 'sandy') {
  // Proceed directly to game creation
  const gameState = await GameService.createGame(...)
  return NextResponse.json(gameState)
}

// For ranked modes: consume play server-side (atomic)
if (!walletAddress) {
  return NextResponse.json(
    { error: "Wallet address required for ranked modes" },
    { status: 400 }
  )
}

// Consume play (free first, then purchased)
const playConsumed = await consumePlayForMode(walletAddress, mode)
if (!playConsumed.success) {
  return NextResponse.json(
    { 
      error: playConsumed.error || "No plays available",
      freePlaysRemaining: playConsumed.freePlaysRemaining || 0,
      purchasedPlaysRemaining: playConsumed.purchasedPlaysRemaining || 0,
    },
    { status: 400 }
  )
}

// Play consumed successfully - create game
const gameState = await GameService.createGame(...)
return NextResponse.json(gameState)
```

**New Service Function Needed:**
```typescript
// lib/supabase/services/ape-in-plays-consumption.service.ts (new file)

async consumePlayForMode(
  walletAddress: string, 
  gameMode: GameMode
): Promise<{
  success: boolean
  error?: string
  freePlaysRemaining: number
  purchasedPlaysRemaining: number
  totalPlaysRemaining: number // Computed: free + purchased
  consumedType: 'free' | 'purchased' | null
}> {
  // CRITICAL: Must be atomic (single DB transaction)
  // Use Supabase RPC function OR single transaction
  // Prevents "double game start" race condition
  
  // OPERATIONAL REQUIREMENT (MVP):
  // - Consume play FIRST, then create game
  // - If game creation fails after consumption, play is still consumed (no refund)
  // - This is acceptable for MVP (simple + consistent)
  // - Logs help diagnose rare create failures
  
  // 1. Get profile
  // 2. In single transaction:
  //    - Check free plays first (mode-specific)
  //    - If free > 0, consume free play (atomic decrement)
  //    - Else check purchased plays (global balance)
  //    - If purchased > 0, consume purchased play (atomic decrement)
  //    - Else return error
  // 3. Return result with remaining balances
}
```

---

## 🔒 Security Requirements

### Atomic Operation:
- Play consumption must be **single database transaction**
- Use `createAdminClient()` for server-side writes
- Prevent race conditions (multiple simultaneous game starts)

### Client-Side Balance Display (OK):
- ✅ Client can display balances (for UI)
- ✅ Client can do optimistic decrements (for snappy UI)
- ❌ Client decrements are **NOT authoritative**
- ✅ Server decrements are **authoritative** - client re-syncs from server response

### Priority Order:
1. **Free plays first** (daily reset, limited)
2. **Purchased plays second** (unlimited, paid)
3. **Reject if both = 0**

### Server-Side Only:
- **Remove client-side play consumption** (`PlayBalanceService.useFreePlay()`)
- All play consumption must happen server-side
- Client can check balance for UI, but server enforces

---

## 📋 Updated Implementation Checklist

### Phase 1: Backend (Play Consumption)

- [ ] **Create play consumption service**
  - File: `lib/supabase/services/ape-in-plays-consumption.service.ts`
  - Method: `consumePlayForMode(walletAddress, gameMode)`
  - Atomic: Single transaction for free OR purchased
  - Returns: `{ success, error, freePlaysRemaining, purchasedPlaysRemaining, consumedType }`

- [ ] **Update game/create route**
  - File: `app/api/ape-in/game/create/route.ts`
  - Add play consumption BEFORE game creation (line ~36)
  - Skip for Sandy mode
  - Return 400 if no plays available
  - Only create game if play consumed successfully

- [ ] **Update client-side consumption (make non-authoritative)**
  - File: `features/games/ape-in/lib/playBalanceService.ts`
  - Keep `useFreePlay()` for optimistic UI only (not authoritative)
  - Client can display balances and do optimistic decrements for snappy UI
  - **Server decrements are authoritative** - client re-syncs from server response
  - Mark method: "Optimistic UI only - server consumption is authoritative"
  - Default path should call server, not client-side decrement

### Phase 2: Purchased Plays Balance

- [ ] **Create purchased plays balance table**
  - Migration: `ape_in_purchased_plays_balances`
  - Columns: `user_id` (PK), `balance` (INT), `updated_at`

- [ ] **Update consumption service**
  - Check purchased plays balance
  - Decrement balance atomically
  - Handle edge cases (balance = 0, negative balance prevention)

### Phase 3: Client Updates

- [ ] **Update MainMenu component**
  - Remove client-side `PlayBalanceService.useFreePlay()` call
  - Show "Buy Plays" button when total plays = 0
  - Handle 400 error from game/create (no plays available)

- [ ] **Update ApeInGame component**
  - Remove client-side play consumption
  - Handle server-side consumption errors gracefully
  - Show user-friendly message: "No plays available. Buy plays to continue."

---

## 🔍 run_id Schema Verification

### Current State:
- Code expects `run_id` uniqueness (handles `23505` error in submit-result)
- Base schema (`scripts/01-create-tables.sql`) doesn't show `run_id` column
- Only found in `cryptoku_leaderboard` table (separate table)

### Action Required:
- **Verify migration exists** that adds `run_id TEXT` to `game_sessions`
- If missing, create migration with **partial unique index** (safer):
  ```sql
  ALTER TABLE game_sessions 
  ADD COLUMN IF NOT EXISTS run_id TEXT;
  
  -- Partial unique index (allows NULL, prevents duplicate non-NULL values)
  CREATE UNIQUE INDEX IF NOT EXISTS idx_game_sessions_run_id 
  ON game_sessions(run_id) 
  WHERE run_id IS NOT NULL;
  ```
- **Why partial index:** Existing rows might have NULL, avoids backfill drama
- **Do NOT use plain UNIQUE constraint** unless 100% sure every insert includes run_id

### Verification Query:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'game_sessions'
  AND column_name = 'run_id';
```

---

## 🎯 Purchased Plays Design Choice (CRITICAL)

### Model A: Global Purchased Plays (RECOMMENDED)

**Design:**
- Purchased plays are **global per user** (not per mode)
- Buy 5 plays → spend on any paid mode (aida/lana/enj1n/nifty/pvp/multiplayer)
- Simpler, more user-friendly
- Fewer edge cases

**Database Schema:**
- `ape_in_purchased_plays_balances` table:
  - `user_id` (PK)
  - `balance` (INT) - **no mode column**
- Intent table can store `game_mode` for analytics, but balance is global

**Consumption Logic:**
- Check global purchased balance
- Decrement from global balance
- Can be used for any paid mode

### Model B: Per-Mode Purchased Plays (NOT RECOMMENDED)

**Design:**
- Purchased plays are **scoped per mode**
- Buy 5 plays for Aida → only usable for Aida
- More complex, less user-friendly
- More edge cases (what if user buys for wrong mode?)

**Database Schema:**
- `ape_in_purchased_plays_balances` table:
  - `user_id` (PK)
  - `game_mode` (TEXT)
  - `balance` (INT)
  - Unique constraint: `(user_id, game_mode)`

**Consumption Logic:**
- Check mode-specific purchased balance
- Decrement from mode-specific balance
- Must match exact mode

### ✅ RECOMMENDATION: Model A (Global)

**Why:**
- User buys 5 plays, wants to try different modes
- Simpler implementation
- Better UX (no mode-locked purchases)
- Matches free plays pattern (daily free plays are per-mode, but purchased are global)

**Implementation:**
- Balance table: `user_id` + `balance` (no mode column)
- Intent table: can store `game_mode` for analytics/audit
- Consumption: check global balance, decrement globally

---

## ✅ Correct End-to-End Flow

### 1. User Clicks "Play" on Mode Card

**Client:** `MainMenu.tsx` → `handleModeSelect(mode)`
- Check balance (for UI display only)
- Call `onSelectMode(mode)` → triggers game initialization

### 2. Game Initialization

**Client:** `apeingame.tsx` → `initGame()` (line 131)
- Calls `gameAPI.createGame(mode, name, address)`

**Server:** `/api/ape-in/game/create` (line 5)
- ✅ **NEW: Consume play (atomic, server-side)** - Hook in at line ~36 (after validation, before line 42)
  - Free play first (if available) - mode-specific
  - Else purchased play (if available) - global balance
  - Else return 400 error with remaining balances
- If play consumed → create game (line 42)
- Return game state + remaining balances (for UI sync)

### 3. Game Play

- User plays game
- No additional play consumption

### 4. Submit Result

**Server:** `/api/ape-in/submit-result` (line 5)
- ✅ **Pure logging only**
- Insert game session with `run_id`
- Update leaderboard (if high score)
- Award points
- ❌ **NO play consumption here**

---

## 🎯 Summary

### What Needs to Change:

1. **Play consumption moves from client → server**
   - Hook into `/api/ape-in/game/create` BEFORE game creation
   - Atomic operation (free first, then purchased)
   - Remove client-side `PlayBalanceService.useFreePlay()` calls

2. **Pricing consistency**
   - Update all "0.1 APE per play" → "1 APE = 5 plays"
   - Bundle-only model (no single-play purchases)

3. **run_id schema verification**
   - Verify `run_id TEXT UNIQUE` exists in `game_sessions`
   - If missing, add migration

### What Stays the Same:

- ✅ submit-result route (pure logging, no play consumption)
- ✅ Leaderboard logging (already correct)
- ✅ Points awarding (already correct)
- ✅ Free plays system (just move consumption to server)

---

**Next Step:** Verify `run_id` schema, then implement server-side play consumption in game/create route.
