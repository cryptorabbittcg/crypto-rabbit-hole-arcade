# Payment Protection Summary

**Status:** ✅ All critical fixes applied

## What Was Done

### 1. Module Boundary Created
- **File:** `lib/payments/cryptokuHintsPayment.ts`
- **Header:** "DO NOT MODIFY WITHOUT UPDATING TESTS: payments invariants"
- **Exports:**
  - `createIntent(params)` - Creates purchase intent
  - `verifyAndCompleteIntent(params)` - Verifies transaction and grants hints
  - `PAYMENT_CONSTANTS` - Exported for testing

### 2. Payment Invariants Test Suite
- **File:** `lib/payments/__tests__/cryptokuHintsPayment.test.ts`
- **Tests cover:**
  - ✅ Wrong chain rejection (simulated via RPC error)
  - ✅ Wrong recipient rejection
  - ✅ Wrong value rejection
  - ✅ Reused txHash rejection
  - ✅ Expired intent rejection
  - ✅ Valid transaction acceptance

### 3. Routes Refactored to Use Module
- **`app/api/cryptoku/hints/purchase-intent/route.ts`** - Calls `createIntent()` from module
- **`app/api/cryptoku/hints/confirm-purchase/route.ts`** - Calls `verifyAndCompleteIntent()` from module

### 4. Treasury Address Protection
- **Check script:** `scripts/check-treasury-address.sh` ✅ Working
- **CI check:** `.github/workflows/check-treasury-address.yml` (runs on PRs)
- **Result:** ✅ Treasury address NOT found in client code (`features/`, `components/`)

### 5. Critical Bug Fixes

#### Fixed: `crypto.randomUUID()` Import Bug
**File:** `lib/payments/cryptokuHintsPayment.ts` (line 155-157)
- **Before:** Mixed `import { randomBytes }` with `crypto.randomUUID()` (crypto undefined)
- **After:** `const crypto = await import("crypto")` - both methods work
- **Impact:** Prevents build/runtime failure

#### Fixed: Permissive RLS Policy
**File:** `supabase/migrations/20260117120000_create_cryptoku_hint_purchase_intents.sql` (line 44-50)
- **Before:** `USING (true)` - anyone could read all intents (wallet addresses, tx hashes, intent IDs)
- **After:** No SELECT policy - all reads must go through server routes using `createAdminClient()`
- **Impact:** Prevents unauthorized access to sensitive intent data

## Build Safety Audit

### ✅ Fixed Issues
1. **Crypto import bug** - Fixed (prevents build failure)
2. **RLS policy** - Fixed (prevents data exposure)
3. **Treasury check script** - Working

### ⚠️ Potential Build/Runtime Issues to Monitor

1. **Vitest not installed yet**
   - Test file exists but requires: `npm install --save-dev vitest @vitest/ui`
   - Scripts added to `package.json`:
     - `npm test` - Run all tests
     - `npm run test:payment` - Run payment tests only
   - **Action:** Install vitest before running tests

2. **Migration not applied**
   - File: `supabase/migrations/20260117120000_create_cryptoku_hint_purchase_intents.sql`
   - **Action:** Run migration in Supabase dashboard before testing

3. **Wagmi/SendTransaction compatibility**
   - Client uses `useSendTransaction` from wagmi
   - **Action:** Verify wagmi is properly configured for Glyph connector

4. **Chain switching**
   - Uses `ensureApeChain()` as fallback
   - **Action:** Test chain switch on actual wallet connection

## Security Status

### ✅ Protected
- Treasury address server-side only
- All intent reads require admin client (no direct client access)
- Transaction verification before hint granting
- Replay protection (tx_hash uniqueness)
- Intent expiry enforcement

### ✅ Test Coverage
- All 6 payment invariants have test cases
- Tests document expected behavior
- Test file warns: "DO NOT MODIFY WITHOUT UPDATING IMPLEMENTATION"

## Next Steps for Production

1. **Install test dependencies:**
   ```bash
   npm install --save-dev vitest @vitest/ui
   ```

2. **Run migration:**
   - Apply `supabase/migrations/20260117120000_create_cryptoku_hint_purchase_intents.sql` in Supabase

3. **Run tests:**
   ```bash
   npm test
   # Or payment-specific:
   npm run test:payment
   ```

4. **Run treasury check:**
   ```bash
   npm run check:treasury
   # Or:
   bash scripts/check-treasury-address.sh
   ```

5. **Test end-to-end:**
   - Connect wallet on ApeChain
   - Click "Buy Hints"
   - Verify intent creation → transaction → confirmation → hints granted

## Files Modified

- ✅ `lib/payments/cryptokuHintsPayment.ts` - Payment module (sanctuary zone)
- ✅ `lib/payments/__tests__/cryptokuHintsPayment.test.ts` - Test suite
- ✅ `lib/payments/PAYMENT_INVARIANTS.md` - Documentation
- ✅ `app/api/cryptoku/hints/purchase-intent/route.ts` - Refactored to use module
- ✅ `app/api/cryptoku/hints/confirm-purchase/route.ts` - Refactored to use module
- ✅ `supabase/migrations/20260117120000_create_cryptoku_hint_purchase_intents.sql` - RLS policy fixed
- ✅ `scripts/check-treasury-address.sh` - Working guardrail script
- ✅ `package.json` - Added test scripts
- ✅ `vitest.config.ts` - Test configuration

## Critical Notes

**DO NOT:**
- ❌ Remove invariant checks without replacement
- ❌ Expose treasury address to client code
- ❌ Bypass transaction verification
- ❌ Allow permissive RLS on intents table
- ❌ Modify payment module without updating tests

**MUST:**
- ✅ Run tests before deploying payment changes
- ✅ Run treasury check in CI
- ✅ Use admin client for all intent operations
- ✅ Verify on-chain before granting hints
