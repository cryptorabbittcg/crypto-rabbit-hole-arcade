# Ape In "Buy Plays" Implementation - Complete

## Overview
This document describes the complete implementation of the Ape In "Buy Plays" monetization feature, mirroring the Cryptoku hints purchase flow pattern.

## Files Changed

### Database Migrations

1. **`supabase/migrations/20260120135000_add_plays_used_to_free_plays.sql`**
   - Adds `plays_used` counter column to `ape_in_daily_free_plays`
   - Converts table to counter model (one row per day per mode, 0-5 plays)

2. **`supabase/migrations/20260120130000_create_ape_in_purchased_plays_balances.sql`**
   - Creates `ape_in_purchased_plays_balances` table (Model A: global balance per user)

3. **`supabase/migrations/20260120140000_create_ape_in_consume_play_rpc.sql`**
   - Creates atomic RPC function `ape_in_consume_play` for play consumption
   - Updated to use counter model for free plays (atomic upsert)
   - Free plays first, then purchased plays (atomic single transaction)

4. **`supabase/migrations/20260120150000_create_ape_in_play_purchase_intents.sql`**
   - Creates `ape_in_play_purchase_intents` table for purchase intent tracking

### Backend Code

5. **`lib/payments/apeInPlaysPayment.ts`**
   - Payment module for Ape In plays (mirrors Cryptoku pattern)
   - `createIntent()` - Creates purchase intent (idempotent)
   - `verifyAndCompleteIntent()` - Verifies on-chain transaction and grants plays
   - Enforces payment invariants (chain, recipient, value, txHash uniqueness, expiry)

6. **`app/api/ape-in/plays/purchase-intent/route.ts`**
   - POST endpoint: Creates purchase intent
   - Returns: `{ intentId, chainId, recipient, priceWei, playsAmount, expiresAt }`

7. **`app/api/ape-in/plays/confirm-purchase/route.ts`**
   - POST endpoint: Verifies transaction and grants plays
   - Input: `{ address, intentId, txHash }`
   - Returns: `{ success, playsAdded, purchasedPlaysRemaining }`

8. **`app/api/ape-in/plays/balance/route.ts`**
   - GET endpoint: Returns play balance
   - Query: `?address=...&mode=...`
   - Returns: `{ freePlaysRemaining, purchasedPlaysRemaining, totalPlaysRemaining }`

9. **`app/api/ape-in/game/create/route.ts`**
   - Copied from `route.ts.FINAL`
   - Server-authoritative play consumption at game start
   - Returns updated balances in response

10. **`lib/supabase/services/ape-in-plays-consumption.service.ts`**
    - Already exists and calls `ape_in_consume_play` RPC
    - Returns `ConsumePlayResult` matching locked contract

### Client Code (TODO: Implementation Required)

11. **`features/games/ape-in/components/MainMenu.tsx`** (Partially Implemented)
    - **TODO:** Add wagmi hooks (`useAccount`, `useChainId`, `useSendTransaction`, `useSwitchChain`)
    - **TODO:** Add state for purchase flow (`isPurchasingPlays`, `playsBalance`)
    - **TODO:** Add `buyPlays` function (mirrors `purchaseHint` from Cryptoku)
    - **TODO:** Add localStorage recovery mechanism (`PENDING_PLAY_PURCHASE_KEY`)
    - **TODO:** Add "Buy 5 Plays (1 APE)" button when `totalPlaysRemaining === 0`
    - **TODO:** Add balance fetching on mount

## Implementation Details

### Payment Flow
1. User clicks "Buy 5 Plays (1 APE)" button
2. Client calls `POST /api/ape-in/plays/purchase-intent` → gets `intentId`, `recipient`, `priceWei`
3. Client ensures ApeChain (33139) via `switchChainAsync`
4. Client sends transaction via `sendTransactionAsync({ to: recipient, value: BigInt(priceWei) })`
5. Client immediately saves `{ intentId, txHash, address, createdAt }` to localStorage
6. Client calls `POST /api/ape-in/plays/confirm-purchase` with `{ address, intentId, txHash }`
7. Server verifies on-chain transaction and grants 5 plays
8. On success: clear localStorage, update UI balances
9. On failure: keep localStorage for recovery

### Recovery Mechanism
- On component mount, check localStorage for pending purchase
- If found, re-attempt confirmation (idempotent)
- Clear localStorage only on success or "expired" error

### Key Constants
- **Treasury Address:** `0xae998cc1128974381008ad086828c9b606b00c0f` (server-side only)
- **ApeChain ID:** `33139`
- **Price:** `1.0 APE` (`1000000000000000000` wei) for 5 plays
- **Intent Expiry:** 10 minutes

## Testing Checklist

### Backend Tests
- [ ] Run TypeScript build: `npm run build`
- [ ] Test balance route: `GET /api/ape-in/plays/balance?address=...&mode=aida`
- [ ] Test purchase-intent route: `POST /api/ape-in/plays/purchase-intent` with valid address
- [ ] Test confirm-purchase route with valid transaction
- [ ] Test game creation with 0 plays → should 400 with balances

### Frontend Tests
- [ ] Load MainMenu → should show "Buy Plays" button when total plays === 0
- [ ] Click "Buy Plays" → should create intent, switch chain, send transaction
- [ ] Complete purchase → purchased balance should increment by 5
- [ ] Start game → RPC should consume one play (free first, then purchased)
- [ ] Refresh mid-purchase → recovery should complete purchase

### Edge Cases
- [ ] User rejects transaction → should show "Transaction rejected" message
- [ ] User rejects chain switch → should show "Chain switch was rejected" message
- [ ] Network error during confirm → localStorage should persist for recovery
- [ ] Intent expires → should show "Purchase intent has expired" message

## Migration Order

1. `20260120130000_create_ape_in_purchased_plays_balances.sql`
2. `20260120135000_add_plays_used_to_free_plays.sql`
3. `20260120140000_create_ape_in_consume_play_rpc.sql`
4. `20260120150000_create_ape_in_play_purchase_intents.sql`

## Notes

- **Bundle Model Only:** Only 5 plays bundle is supported (1 APE = 5 plays)
- **Model A:** Purchased plays are global per user (not mode-specific)
- **Server-Authoritative:** Play consumption happens server-side at game start
- **Atomic:** RPC function ensures atomic consumption (single transaction)
- **Recovery-Safe:** localStorage persistence prevents lost purchases
- **No Treasury Exposure:** Treasury address never appears in client code

## Client Implementation Reference

See `features/games/cryptoku/cryptokugame.tsx` for complete reference:
- `PENDING_HINT_PURCHASE_KEY` → use `PENDING_PLAY_PURCHASE_KEY`
- `purchaseHint` → implement `buyPlays` with same pattern
- Recovery `useEffect` → same pattern for plays
- Error handling → same user rejection detection

## Status

✅ Backend: Complete and production-ready
⚠️ Frontend: Requires client-side buy flow implementation in MainMenu.tsx
