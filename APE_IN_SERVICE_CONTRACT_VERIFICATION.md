# ✅ Ape In Service Contract Verification
**Date:** 2026-01-20  
**Status:** Pre-implementation verification

---

## 🔍 Required Service Contract

### `ApeInPlaysConsumptionService.consumePlayForMode()`

**Signature:**
```typescript
async consumePlayForMode(
  walletAddress: string,
  gameMode: GameMode
): Promise<ConsumePlayResult>
```

**Return Type:**
```typescript
interface ConsumePlayResult {
  success: boolean
  error?: string
  freePlaysRemaining: number
  purchasedPlaysRemaining: number
  totalPlaysRemaining: number // Computed: free + purchased
  consumedType: 'free' | 'purchased' | null
}
```

---

## ✅ Route Expectations

The route (`app/api/ape-in/game/create/route.ts.FINAL`) expects:

1. **Success case:**
   - `playConsumed.success === true`
   - All balance fields present (freePlaysRemaining, purchasedPlaysRemaining, totalPlaysRemaining)
   - `consumedType` is either `'free'` or `'purchased'`

2. **Error case:**
   - `playConsumed.success === false`
   - `playConsumed.error` is a string
   - All balance fields still present (for UI sync)

---

## 📋 Implementation Checklist

When implementing `ApeInPlaysConsumptionService`, ensure:

- [ ] Method signature matches exactly
- [ ] Return type includes all 6 fields (success, error?, freePlaysRemaining, purchasedPlaysRemaining, totalPlaysRemaining, consumedType)
- [ ] `totalPlaysRemaining` is computed on server (free + purchased)
- [ ] Atomic operation (single DB transaction)
- [ ] Priority: free play first (mode-specific), then purchased play (global)
- [ ] Returns error if both balances are 0

---

**Status:** Ready for service implementation. Route contract is locked.
