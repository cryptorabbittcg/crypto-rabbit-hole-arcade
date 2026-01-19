# Cryptoku Hints Payment Module

**DO NOT MODIFY WITHOUT UPDATING TESTS: payments invariants**

This module is the "sanctuary zone" for payment verification logic.

## Module Structure

- **`cryptokuHintsPayment.ts`** - Payment logic (sanctuary zone)
- **`__tests__/cryptokuHintsPayment.test.ts`** - Payment invariants test suite
- **`PAYMENT_INVARIANTS.md`** - Documentation of all invariants

## Setup Tests

Install test dependencies:
```bash
npm install --save-dev vitest @vitest/ui
```

Run tests:
```bash
npm test
# Or run only payment tests:
npm run test:payment
```

## Module Exports

### `createIntent(params)`
Creates a purchase intent for hint purchase.

### `verifyAndCompleteIntent(params)`
Verifies on-chain transaction and completes purchase intent.

### `PAYMENT_CONSTANTS`
Exported constants for testing:
- `TREASURY_ADDRESS`
- `HINTS_AMOUNT`
- `PRICE_WEI`
- `APE_CHAIN_ID`
- `APE_CHAIN_RPC`

## Treasury Address Check

Run check script:
```bash
npm run check:treasury
```

This ensures treasury address is NOT hardcoded in client code (`features/`, `components/`).
