# 🗺️ Ape In "Buy Plays" Implementation Map
**Date:** 2026-01-20  
**Pricing:** 1 APE = 5 plays  
**Pattern:** Mirror Cryptoku hints purchase flow exactly

---

## ✅ Leaderboard Logging Verification

### Current State (VERIFIED):

1. **`run_id` Idempotency:**
   - ✅ Code handles `run_id` uniqueness (lines 77-137 in `submit-result/route.ts`)
   - ✅ Checks for `23505` error (unique constraint violation)
   - ✅ Returns existing session without double-awarding points
   - ⚠️ **NOTE:** Base schema (`scripts/01-create-tables.sql`) doesn't show `run_id` column
   - **ACTION NEEDED:** 
     - Verify migration exists that adds `run_id TEXT` to `game_sessions`
     - Verify partial unique index exists: `WHERE run_id IS NOT NULL`

2. **Points Awarding:**
   - ✅ Only awards points for new submissions (`shouldAwardPoints = true` only on successful insert)
   - ✅ Duplicate `run_id` → `shouldAwardPoints = false` → no double-award
   - ✅ Uses `update_user_balance` RPC (server-side, secure)

3. **Leaderboard Update:**
   - ✅ Only updates if `result === 'won' || result === 'completed'` (line 163)
   - ✅ Only updates if `score > currentHighScore` (line 172) - **max() behavior, not overwrite**
   - ✅ Creates leaderboard entry if doesn't exist (lines 187-204)

4. **Mode Filtering:**
   - ✅ `validModes` array excludes `'sandy'` (line 25: `['aida', 'lana', 'nifty', 'enj1n', 'pvp', 'multiplayer']`)
   - ✅ Sandy/tutorial results are **rejected** by validation (line 26-28)
   - ✅ **Sandy never reaches leaderboard** - correct behavior

**✅ VERDICT:** Ape In leaderboard logging is **Cryptoku-grade** and production-ready.

---

## 📍 Current Code Locations (Where Things Live)

### 1. Main Menu Component
**File:** `features/games/ape-in/components/MainMenu.tsx`

**Current Flow:**
- Lines 144-190: `handleModeSelect()` function
  - Checks free plays (line 165)
  - Validates payment if no free plays (lines 168-180)
  - Calls `onSelectMode(mode)` to start game
- Lines 440-452: `getDisplayPrice()` in `CompactGameCard`
  - Shows free plays remaining or cost
  - Currently shows "Cost: 0.1 APE" when no free plays

**Where "Buy Plays" Button Should Go:**
- **Option A (Recommended):** Add button in `CompactGameCard` component (around line 536-542)
  - Show when `freePlaysRemaining === 0` and `purchasedPlaysRemaining === 0`
  - Replace or supplement the "Cost: 0.1 APE" display
- **Option B:** Add separate "Buy Plays" section above game mode grid
  - Less intrusive, but requires separate UI

**Recommended Implementation:**
```typescript
// In CompactGameCard component, around line 536-542
{displayPrice.isFree ? (
  // Existing free plays display
) : (
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-center px-2 py-1 bg-orange-500/20 rounded-lg border border-orange-500/30">
      <span className="text-[9px] sm:text-[10px] font-bold text-orange-400">
        {displayPrice.text}
      </span>
    </div>
    {/* NEW: Buy Plays Button */}
    <button
      onClick={(e) => {
        e.stopPropagation() // Prevent mode selection
        handleBuyPlays(gameMode.mode)
      }}
      className="w-full px-2 py-1.5 rounded-lg font-semibold text-[10px] sm:text-xs bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90"
    >
      Buy 5 Plays (1 APE)
    </button>
  </div>
)}
```

---

### 2. Free Plays Balance Route
**File:** `app/api/ape-in/free-plays/balance/route.ts`

**Current State:**
- ✅ Returns `{ remaining, maxPerDay: 5 }`
- ✅ Uses `ApeInFreePlaysService.getFreePlaysRemainingByWallet()`
- ✅ Only checks daily free plays (not purchased plays)

**What Needs to Change:**
- **Add purchased plays to response:**
  ```typescript
  return NextResponse.json({
    remaining, // free plays
    maxPerDay: 5,
    purchasedPlaysRemaining: await getPurchasedPlaysRemaining(address, gameMode),
    totalPlaysRemaining: remaining + purchasedPlaysRemaining,
  })
  ```

**New Route Needed:**
- `GET /api/ape-in/plays/balance?address=...&mode=...`
  - Returns combined balance (free + purchased)
  - Used by client to determine if "Buy Plays" button should show

---

### 3. Submit Result Route
**File:** `app/api/ape-in/submit-result/route.ts`

**Current State:**
- ✅ Logs to `game_sessions` with `run_id` (idempotent)
- ✅ Updates leaderboard (high score only)
- ✅ Awards points (once per run_id)
- ✅ Pure logging only (no play consumption)

**What Needs to Change:**
- **Nothing - submit-result is pure logging only**
- ✅ Inserts session (idempotent via run_id)
- ✅ Awards points (once)
- ✅ Updates leaderboard
- ❌ **Never consumes plays** (play consumption happens at game start in /game/create)
- This prevents exploits (user could crash/disconnect before submit-result)

---

### 4. PaymentService.ts (DEPRECATE)
**File:** `features/games/ape-in/lib/paymentService.ts`

**Current State:**
- ✅ `validatePayment()` - works (checks balance via RPC)
- ✅ `getGamePrice()` - returns 0.1 APE (needs update: 1 APE = 5 plays)
- ✅ `formatApeCoin()` - works
- ❌ `executePayment()` - **STUB** (line 88-115, returns fake tx hash)
- ✅ `getPricingDisplay()` - works

**What Needs to Change:**
1. **Deprecate `executePayment()`:**
   ```typescript
   /**
    * @deprecated Use purchase-intent + confirm-purchase flow instead
    * This method is a stub and does not execute real transactions.
    */
   static async executePayment(...) {
     console.warn('[PaymentService] executePayment is deprecated. Use purchase-intent flow.')
     // Keep stub for backwards compatibility, but mark deprecated
   }
   ```

2. **Update `getGamePrice()`:**
   ```typescript
   static getGamePrice(gameMode: string, playsAmount: number = 5): number {
     // 1 APE = 5 plays
     if (gameMode === 'sandy') return 0
     return (playsAmount / 5) * 1.0 // e.g., 5 plays = 1 APE, 10 plays = 2 APE
   }
   ```

3. **Keep `validatePayment()` and `getPricingDisplay()`** - they're still useful

---

## 🏗️ Implementation Checklist

### Phase 1: Database & Backend

- [ ] **Migration: Add `run_id` column and partial unique index to `game_sessions`**
  - File: `supabase/migrations/YYYYMMDDHHMMSS_add_run_id_to_game_sessions.sql`
  - Add `run_id TEXT` column if missing
  - Add partial unique index: `CREATE UNIQUE INDEX ... WHERE run_id IS NOT NULL`
  - **Do NOT use plain UNIQUE constraint** (allows NULL, avoids backfill drama)
  - Verify existing Ape In submissions work

- [ ] **Migration: Create `ape_in_play_purchase_intents` table**
  - File: `supabase/migrations/YYYYMMDDHHMMSS_create_ape_in_play_purchase_intents.sql`
  - Columns: `id`, `user_id`, `intent_id` (UNIQUE), `wallet_address`, `game_mode`, `plays_amount`, `price_wei`, `recipient_address`, `status`, `tx_hash` (UNIQUE), `created_at`, `expires_at`, `completed_at`
  - Indexes: `status`, `wallet_address`, `expires_at`
  - RLS: No SELECT policy (server-only via admin client)

- [ ] **Migration: Create `ape_in_purchased_plays_balances` table (Model A: Global Balance)**
  - File: `supabase/migrations/YYYYMMDDHHMMSS_create_ape_in_purchased_plays_balances.sql`
  - Columns: `user_id` (PK, FK to profiles), `balance` (INT DEFAULT 0), `updated_at`
  - **No `game_mode` column** (global balance per user, not per mode)
  - RLS: No policies (server-only via admin client)
  - Intent table can store `game_mode` for analytics, but balance is global

- [ ] **Create Sanctuary Zone Module**
  - File: `lib/payments/apeInPlaysPayment.ts`
  - Functions: `createIntent()`, `verifyAndCompleteIntent()`
  - Header: "DO NOT MODIFY WITHOUT UPDATING TESTS: payments invariants"
  - Constants: `PRICE_WEI = "1000000000000000000"` (1 APE), `PLAYS_AMOUNT = 5`, `TREASURY = "0xae998cc1128974381008ad086828c9b606b00c0f"`

- [ ] **Create API Route: Purchase Intent**
  - File: `app/api/ape-in/plays/purchase-intent/route.ts`
  - Input: `{ address: string, gameMode: string, playsAmount?: number }` (default 5)
  - Calls `apeInPlaysPayment.createIntent()`
  - Returns: `{ intentId, chainId: 33139, recipient, priceWei, playsAmount: 5, expiresAt }`
  - Idempotency: Returns existing pending intent if not expired

- [ ] **Create API Route: Confirm Purchase**
  - File: `app/api/ape-in/plays/confirm-purchase/route.ts`
  - Input: `{ address: string, intentId: string, txHash: string }`
  - Calls `apeInPlaysPayment.verifyAndCompleteIntent()`
  - On success: Grants 5 plays to `ape_in_purchased_plays_balances`
  - Returns: `{ success: true, playsRemaining: number }`

- [ ] **Create API Route: Plays Balance**
  - File: `app/api/ape-in/plays/balance/route.ts`
  - Input: `?address=...&mode=...`
  - Returns: `{ freePlaysRemaining, purchasedPlaysRemaining, totalPlaysRemaining }`

- [ ] **Update Game Create Route (Play Consumption)**
  - File: `app/api/ape-in/game/create/route.ts`
  - Add play consumption logic BEFORE game creation (line ~36)
  - Consume free play first, then purchased play (atomic operation)
  - Return 400 error if no plays available
  - Skip consumption for Sandy mode (always free)
  - **DO NOT consume plays in submit-result** (submit-result is pure logging)

- [ ] **Create Payment Invariants Tests**
  - File: `lib/payments/__tests__/apeInPlaysPayment.test.ts`
  - Test: Wrong recipient rejection
  - Test: Wrong value rejection
  - Test: Reused txHash rejection
  - Test: Expired intent rejection
  - Test: Wrong chain rejection
  - Test: Valid transaction acceptance

- [ ] **Update Treasury Address Check Script**
  - File: `scripts/check-treasury-address.sh`
  - Add check for Ape In client code (features/games/ape-in/**)

---

### Phase 2: Client-Side

- [ ] **Update MainMenu Component**
  - File: `features/games/ape-in/components/MainMenu.tsx`
  - Add `handleBuyPlays(mode)` function
  - Add "Buy 5 Plays (1 APE)" button in `CompactGameCard`
  - Show when `totalPlaysRemaining === 0`
  - Use same pattern as Cryptoku hints:
    - `sendTransactionAsync` for tx
    - `localStorage` persistence
    - Recovery `useEffect`

- [ ] **Add Wagmi Hooks to ApeInGame**
  - File: `features/games/ape-in/apeingame.tsx`
  - Add: `useAccount()`, `useChainId()`, `useSwitchChain()`, `useSendTransaction()`
  - Add: `ensureApeChain()` helper (or use existing)

- [ ] **Create Purchase Plays Function**
  - File: `features/games/ape-in/apeingame.tsx` or new `lib/purchasePlays.ts`
  - Function: `purchasePlays(address, mode)`
  - Flow:
    1. POST `/api/ape-in/plays/purchase-intent`
    2. Ensure ApeChain (33139)
    3. `await sendTransactionAsync({ to: intent.recipient, value: BigInt(intent.priceWei) })`
    4. Save to localStorage immediately
    5. POST `/api/ape-in/plays/confirm-purchase`
    6. Update plays balance state
    7. Clear localStorage on success

- [ ] **Add Recovery Effect**
  - File: `features/games/ape-in/apeingame.tsx`
  - `useEffect` on mount to recover pending purchases from localStorage
  - Same pattern as Cryptoku hints recovery

- [ ] **Update Plays Balance Display**
  - File: `features/games/ape-in/components/MainMenu.tsx`
  - Fetch combined balance (free + purchased) from `/api/ape-in/plays/balance`
  - Update `getDisplayPrice()` to show total plays remaining
  - Show "X free plays" + "Y purchased plays" separately if both > 0

- [ ] **Deprecate PaymentService.executePayment()**
  - File: `features/games/ape-in/lib/paymentService.ts`
  - Add `@deprecated` JSDoc
  - Add console.warn
  - Keep stub for backwards compatibility

---

### Phase 3: Integration & Testing

- [ ] **Update Free Plays Service**
  - File: `lib/supabase/services/ape-in-free-plays.service.ts`
  - Add method: `getPurchasedPlaysRemaining(userId, gameMode)`
  - Add method: `getTotalPlaysRemaining(userId, gameMode)` (free + purchased)

- [ ] **Update Play Consumption Logic**
  - Server-side: Check free plays first, then purchased plays
  - Atomic operation (prevent race conditions)
  - Return error if no plays available

- [ ] **End-to-End Test:**
  1. User has 0 free plays
  2. Click "Buy 5 Plays (1 APE)"
  3. Wallet prompts for 1 APE transfer
  4. Transaction confirms
  5. Plays balance updates to 5
  6. User can start game
  7. Play is consumed (balance → 4)
  8. Refresh page → recovery effect finalizes if needed

- [ ] **Verify No Treasury Address in Client:**
  - Run `./scripts/check-treasury-address.sh`
  - Ensure no `0xae998...` appears in `features/games/ape-in/**`

---

## 📋 File-by-File Changes Summary

### New Files:
1. `supabase/migrations/YYYYMMDDHHMMSS_add_run_id_to_game_sessions.sql`
2. `supabase/migrations/YYYYMMDDHHMMSS_create_ape_in_play_purchase_intents.sql`
3. `supabase/migrations/YYYYMMDDHHMMSS_create_ape_in_purchased_plays_balances.sql`
4. `lib/payments/apeInPlaysPayment.ts` (sanctuary zone)
5. `app/api/ape-in/plays/purchase-intent/route.ts`
6. `app/api/ape-in/plays/confirm-purchase/route.ts`
7. `app/api/ape-in/plays/balance/route.ts`
8. `lib/payments/__tests__/apeInPlaysPayment.test.ts`

### Modified Files:
1. `features/games/ape-in/components/MainMenu.tsx`
   - Add `handleBuyPlays()` function
   - Add "Buy Plays" button in `CompactGameCard`
   - Update `getDisplayPrice()` to show total plays

2. `features/games/ape-in/apeingame.tsx`
   - Add wagmi hooks
   - Add `purchasePlays()` function
   - Add recovery `useEffect`

3. `app/api/ape-in/game/create/route.ts`
   - Add play consumption logic BEFORE game creation (line ~36)
   - Create service: `ape-in-plays-consumption.service.ts`
   - Atomic operation: free play first (mode-specific), then purchased play (global)
   - Return 400 if no plays available
   - Return game state + remaining balances (for UI sync)

4. `features/games/ape-in/lib/paymentService.ts`
   - Deprecate `executePayment()`
   - Update `getGamePrice()` for 1 APE = 5 plays

5. `lib/supabase/services/ape-in-free-plays.service.ts`
   - Add purchased plays methods

6. `scripts/check-treasury-address.sh`
   - Add Ape In client code check

---

## 🔒 Security Checklist

- [ ] Treasury address only in server code (env/migration)
- [ ] No treasury address in client bundles (CI check)
- [ ] On-chain verification (ApeChain, recipient, value)
- [ ] Replay protection (tx_hash uniqueness)
- [ ] Intent expiration (10 minutes)
- [ ] Server-side play consumption (prevent spoofing)
- [ ] Payment invariants tests passing
- [ ] RLS policies secure (no SELECT for intents/balances)

---

## 💰 Pricing Details

**Current (Stub - INCONSISTENT):**
- `PaymentService.getGamePrice()` returns 0.1 APE per play
- `PlayBalanceService.getPlayPrice()` returns 0.1 APE per play
- **Must be updated to bundle model**

**New (Production - BUNDLE ONLY):**
- **1 APE = 5 plays** (bundle only, no single-play purchases)
- Price lives server-side in intent response
- Update all pricing references: remove "0.1 APE per play", use "1 APE = 5 plays"

**Future (Optional):**
- "Buy 10 plays for 1.8 APE" (10% discount)
- "Buy 25 plays for 4 APE" (20% discount)

---

## 🎯 Key Integration Points

1. **MainMenu → Purchase Flow:**
   - User clicks "Buy 5 Plays (1 APE)" button
   - `handleBuyPlays(mode)` called
   - Purchase flow executes (intent → tx → confirm)
   - Plays balance updates
   - User can now start game

2. **Game Start → Play Consumption:**
   - User clicks "Play" on mode card
   - `handleModeSelect(mode)` calls `gameAPI.createGame()`
   - **Server-side:** `/api/ape-in/game/create` consumes play BEFORE creating game
   - Atomic operation: free play first, then purchased play
   - If no plays available → return 400 error, game not created
   - If play consumed → create game and return game state

3. **Submit Result → Pure Logging Only:**
   - Play was already consumed at game start (server-side)
   - Submit result is pure logging: session, leaderboard, points
   - **NO play consumption in submit-result** (prevents exploits)

---

## ✅ Success Criteria

1. User can purchase 5 plays for 1 APE
2. Purchased plays are stored in database
3. Plays balance shows free + purchased combined
4. Play consumption is server-authoritative
5. Recovery mechanism works (localStorage + useEffect)
6. Payment invariants tests pass
7. No treasury address in client code
8. End-to-end test passes (purchase → play → consume)

---

**Next Step:** Start with Phase 1 (Database & Backend) migrations and sanctuary zone module.
