# Payment Invariants Documentation

**DO NOT MODIFY WITHOUT UPDATING TESTS: payments invariants**

This document describes the critical payment invariants that must be enforced and tested for Cryptoku hint purchases.

## Payment Module

**Location:** `lib/payments/cryptokuHintsPayment.ts`

This module is the "sanctuary zone" for payment logic. All payment operations MUST go through this module.

## Invariants

### 1. Wrong Chain Rejection
- **Enforced:** Only ApeChain (33139) transactions accepted
- **Test:** `lib/payments/__tests__/cryptokuHintsPayment.test.ts` - "Wrong Chain Rejection"
- **Implementation:** Uses ApeChain RPC URL. Wrong chain transactions will fail RPC lookup.

### 2. Wrong Recipient Rejection
- **Enforced:** Only treasury address accepted (`0xae998cc1128974381008ad086828c9b606b00c0f`)
- **Test:** `lib/payments/__tests__/cryptokuHintsPayment.test.ts` - "Wrong Recipient Rejection"
- **Implementation:** Validates `tx.to` equals treasury address (case-insensitive)

### 3. Wrong Value Rejection
- **Enforced:** Only 1.0 APE (1e18 wei = "1000000000000000000") accepted
- **Test:** `lib/payments/__tests__/cryptokuHintsPayment.test.ts` - "Wrong Value Rejection"
- **Implementation:** Validates `tx.value` equals `BigInt(PRICE_WEI)`

### 4. Reused TxHash Rejection
- **Enforced:** Same transaction hash cannot be used twice
- **Test:** `lib/payments/__tests__/cryptokuHintsPayment.test.ts` - "Reused TxHash Rejection"
- **Implementation:** Database unique constraint on `tx_hash` + explicit check before verification

### 5. Expired Intent Rejection
- **Enforced:** Intents expire after 10 minutes
- **Test:** `lib/payments/__tests__/cryptokuHintsPayment.test.ts` - "Expired Intent Rejection"
- **Implementation:** Validates `intent.expires_at > now` and marks expired intents

### 6. Valid Transaction Acceptance
- **Enforced:** All checks pass, hints granted
- **Test:** `lib/payments/__tests__/cryptokuHintsPayment.test.ts` - "Valid Transaction Acceptance"
- **Implementation:** All validations pass → update intent → call `purchase_cryptoku_hints()` → return hint balance

## Treasury Address Security

**Treasury address:** `0xae998cc1128974381008ad086828c9b606b00c0f`

**CRITICAL:** Treasury address must NEVER be hardcoded in client code.

- ✅ **Allowed:** Server-side only (`lib/payments/cryptokuHintsPayment.ts`, API routes, migrations)
- ❌ **Forbidden:** `features/`, `components/`

**Check script:** `scripts/check-treasury-address.sh`

Run in CI:
```bash
./scripts/check-treasury-address.sh
```

## Testing

### Running Tests

Install test dependencies:
```bash
npm install --save-dev vitest @vitest/ui
```

Run tests:
```bash
npm test
```

### Test Coverage

All 6 payment invariants must be tested:
1. Wrong chain rejection
2. Wrong recipient rejection  
3. Wrong value rejection
4. Reused txHash rejection
5. Expired intent rejection
6. Valid transaction acceptance

## Modification Rules

**BEFORE modifying `lib/payments/cryptokuHintsPayment.ts`:**

1. ✅ Update tests in `lib/payments/__tests__/cryptokuHintsPayment.test.ts`
2. ✅ Ensure treasury address remains server-side only
3. ✅ Verify all invariants are still enforced
4. ✅ Run test suite: `npm test`
5. ✅ Run treasury check: `./scripts/check-treasury-address.sh`

**NEVER:**
- ❌ Remove invariant checks without adding replacement logic
- ❌ Expose treasury address to client code
- ❌ Skip transaction verification
- ❌ Allow bypassing replay protection
