# ✅ Ape In "Buy Plays" - Implementation Ready
**Date:** 2026-01-20  
**Status:** Architecture Complete, Ready for Implementation

---

## 🎯 Final Approval Status

**Security & Integrity:** ✅ PASS  
**Contract Discipline:** ✅ EXCELLENT  
**Exploit Surface:** ✅ CLOSED  
**UX Sync:** ✅ GUARANTEED

---

## 📋 Implementation Order (Safest Build)

### Phase 1: Database Foundations
1. **Verify/Add `run_id` migration**
   - Partial unique index: `WHERE run_id IS NOT NULL`
   - Verify existing Ape In submissions work

2. **Create `ape_in_purchased_plays_balances` table**
   - Model A: Global balance (no mode column)
   - Columns: `user_id` (PK), `balance` (INT DEFAULT 0), `updated_at`
   - RLS: No policies (server-only via admin client)

3. **Create `ape_in_play_purchase_intents` table**
   - Columns: `id`, `user_id`, `intent_id` (UNIQUE), `wallet_address`, `game_mode` (for analytics), `plays_amount`, `price_wei`, `recipient_address`, `status`, `tx_hash` (UNIQUE), `created_at`, `expires_at`, `completed_at`
   - Indexes: `status`, `wallet_address`, `expires_at`
   - RLS: No SELECT policy (server-only)

### Phase 2: Core Services
4. **Create `ApeInPlaysConsumptionService`**
   - File: `lib/supabase/services/ape-in-plays-consumption.service.ts`
   - Method: `consumePlayForMode(walletAddress, gameMode)`
   - **Atomic operation** (single DB transaction)
   - Priority: free play first (mode-specific), then purchased play (global)
   - Return contract: `{ success, error?, freePlaysRemaining, purchasedPlaysRemaining, totalPlaysRemaining, consumedType }`
   - **See:** `APE_IN_SERVICE_CONTRACT_VERIFICATION.md` for exact contract

5. **Create Sanctuary Zone Module**
   - File: `lib/payments/apeInPlaysPayment.ts`
   - Functions: `createIntent()`, `verifyAndCompleteIntent()`
   - Header: "DO NOT MODIFY WITHOUT UPDATING TESTS: payments invariants"
   - Constants: `PRICE_WEI = "1000000000000000000"` (1 APE), `PLAYS_AMOUNT = 5`, `TREASURY = "0xae998cc1128974381008ad086828c9b606b00c0f"`

6. **Create Payment Invariants Tests**
   - File: `lib/payments/__tests__/apeInPlaysPayment.test.ts`
   - Test all 6 invariants (wrong recipient, wrong value, reused txHash, expired intent, wrong chain, valid tx)

### Phase 3: API Routes
7. **Create Purchase Intent Route**
   - File: `app/api/ape-in/plays/purchase-intent/route.ts`
   - Input: `{ address: string, gameMode?: string, playsAmount?: number }` (default 5)
   - Returns: `{ intentId, chainId: 33139, recipient, priceWei, playsAmount: 5, expiresAt }`
   - Idempotency: Returns existing pending intent if not expired

8. **Create Confirm Purchase Route**
   - File: `app/api/ape-in/plays/confirm-purchase/route.ts`
   - Input: `{ address: string, intentId: string, txHash: string }`
   - Verifies on-chain transaction (ApeChain, treasury, value)
   - Grants 5 plays to global purchased balance
   - Returns: `{ success: true, playsRemaining: number }`

9. **Create Plays Balance Route**
   - File: `app/api/ape-in/plays/balance/route.ts`
   - Input: `?address=...&mode=...`
   - Returns: `{ freePlaysRemaining, purchasedPlaysRemaining, totalPlaysRemaining }`

10. **Apply Game Create Route Patch**
    - File: `app/api/ape-in/game/create/route.ts`
    - **Use:** `app/api/ape-in/game/create/route.ts.FINAL`
    - Replace entire file (or apply patch from `APE_IN_GAME_CREATE_PATCH.md`)
    - **Dependencies:** `ApeInPlaysConsumptionService` must exist first

### Phase 4: Client Implementation
11. **Add Purchase Flow to ApeInGame**
    - File: `features/games/ape-in/apeingame.tsx`
    - Add wagmi hooks: `useAccount()`, `useChainId()`, `useSwitchChain()`, `useSendTransaction()`
    - Add `purchasePlays(mode)` function (mirror Cryptoku hints pattern)
    - Add recovery `useEffect` for pending purchases from localStorage
    - Use `sendTransactionAsync` (not callback style)

12. **Add Buy Plays Button to MainMenu**
    - File: `features/games/ape-in/components/MainMenu.tsx`
    - Add `handleBuyPlays(mode)` function
    - Show "Buy 5 Plays (1 APE)" button when `totalPlaysRemaining === 0`
    - Update `getDisplayPrice()` to show total plays (free + purchased)

13. **Update Client Balance Display**
    - Fetch from `/api/ape-in/plays/balance`
    - Show combined balance in UI
    - Handle 400 errors from game/create gracefully

### Phase 5: Testing & Verification
14. **End-to-End Test**
    - User has 0 free plays
    - Click "Buy 5 Plays (1 APE)"
    - Wallet prompts for 1 APE transfer
    - Transaction confirms
    - Plays balance updates to 5
    - User can start game
    - Play is consumed (balance → 4)
    - Refresh page → recovery effect finalizes if needed

15. **Verify No Treasury Address in Client**
    - Run `./scripts/check-treasury-address.sh`
    - Ensure no `0xae998...` appears in `features/games/ape-in/**`

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
- [ ] `isDailyFree` spoofing prevented (sanitizeIsDailyFree)
- [ ] Atomic consumption operation (single transaction)

---

## 📐 Service Contract (Locked)

**File:** `APE_IN_SERVICE_CONTRACT_VERIFICATION.md`

**Required Return Type:**
```typescript
{
  success: boolean
  error?: string
  freePlaysRemaining: number
  purchasedPlaysRemaining: number
  totalPlaysRemaining: number // Computed on server
  consumedType: 'free' | 'purchased' | null
}
```

**Implementation must match exactly.**

---

## 🎯 Key Design Decisions (Locked)

1. **Model A: Global Purchased Plays**
   - Balance table: `user_id` + `balance` (no mode column)
   - Intent table can store `game_mode` for analytics
   - User buys 5 plays → can use on any paid mode

2. **Consume-First, No-Refund (MVP)**
   - Play consumed BEFORE game creation
   - If game creation fails, play remains consumed
   - Acceptable for MVP (simple + consistent)
   - Logs help diagnose rare failures

3. **Pricing: 1 APE = 5 Plays**
   - Bundle-only (no single-play purchases)
   - Price lives server-side in intent response
   - Update all "0.1 APE per play" references

4. **Play Consumption Location**
   - `/api/ape-in/game/create` (BEFORE game creation)
   - `/api/ape-in/submit-result` (pure logging only, never consumes)

---

## 📁 Reference Documents

- **Implementation Map:** `APE_IN_BUY_PLAYS_IMPLEMENTATION_MAP.md`
- **Hook-In Points:** `APE_IN_PLAY_CONSUMPTION_HOOK_IN.md`
- **Exact Verification:** `APE_IN_EXACT_HOOK_IN_VERIFICATION.md`
- **Game Create Patch:** `APE_IN_GAME_CREATE_PATCH.md`
- **Final Route:** `app/api/ape-in/game/create/route.ts.FINAL`
- **Service Contract:** `APE_IN_SERVICE_CONTRACT_VERIFICATION.md`
- **Sanity Check:** `APE_IN_SANITY_CHECK_REPORT.md`

---

## ✅ Production Hardening Applied

- ✅ `isDailyFree` spoofing prevented
- ✅ PII logging protected (shortWallet helper)
- ✅ Mode list centralized (VALID_MODES const)
- ✅ Tournament removed (not yet supported)
- ✅ Single return per branch
- ✅ Defensive invariant check added
- ✅ Static imports (no dynamic imports)

---

**Status:** Architecture complete. Ready for implementation.

**Next Step:** Implement `ApeInPlaysConsumptionService` following the service contract.
