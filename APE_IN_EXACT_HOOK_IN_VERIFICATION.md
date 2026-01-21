# ✅ Ape In Exact Hook-In Verification
**Date:** 2026-01-20  
**Status:** Verification Report (No Changes)

---

## 📍 Exact Hook-In Point

### File: `app/api/ape-in/game/create/route.ts`

**Current Code Structure:**
```typescript
// Lines 5-34: Validation
export async function POST(request: NextRequest) {
  // ... validation ...
  
  // Line 36: TODO comment (where hook-in goes)
  // TODO: Check payment/play token for ranked modes (if needed)
  // For now, we'll allow game creation for all modes
  
  // Line 39: Log
  console.log('🎮 Creating game:', ...)
  
  // Line 42: Game creation (BEFORE this is where consumption happens)
  const gameState = await GameService.createGame(...)
  
  // Line 64: Return game state
  return NextResponse.json(gameState)
}
```

**✅ Hook-In Location:** **Line ~36** (replace TODO comment)

**Exact Implementation Point:**
```typescript
// After line 34 (wallet address validation)
// Before line 42 (GameService.createGame call)

// Sandy is always free - skip play consumption
if (mode === 'sandy') {
  // Proceed directly to game creation (existing flow)
  const gameState = await GameService.createGame(...)
  return NextResponse.json({
    ...gameState,
    freePlaysRemaining: 0, // Not applicable for Sandy
    purchasedPlaysRemaining: 0, // Not applicable for Sandy
  })
}

// For ranked modes: consume play server-side (atomic)
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

// Return game state + remaining balances (for UI sync)
return NextResponse.json({
  ...gameState,
  freePlaysRemaining: playConsumed.freePlaysRemaining,
  purchasedPlaysRemaining: playConsumed.purchasedPlaysRemaining,
  totalPlaysRemaining: playConsumed.freePlaysRemaining + playConsumed.purchasedPlaysRemaining, // Computed on server
  consumedType: playConsumed.consumedType, // 'free' | 'purchased'
})
```

---

## 🔍 Client-Side Call Site Analysis

### File: `features/games/ape-in/lib/api.ts`

**Current Code:**
```typescript
// Lines 57-100: createGame function
createGame: async (mode: GameMode, playerName: string, walletAddress?: string, isDailyFree?: boolean): Promise<GameState> => {
  // ... logging ...
  
  const requestData = {
    mode,
    playerName,
    ...(walletAddress && { walletAddress }),
    isDailyFree: isDailyFree || false,
  }
  
  // Line 78: API call
  const game = await apiCall<GameState>('/game/create', {
    method: 'POST',
    body: JSON.stringify(requestData),
  })
  
  return game
}
```

**Current Client Behavior:**
- ✅ Does NOT call `PlayBalanceService.useFreePlay()` before API call
- ✅ Does NOT do client-side consumption
- ✅ Just calls API directly

**What Needs to Change:**
- ✅ **No client-side consumption needed** (good!)
- ✅ Client should handle 400 error response (no plays available)
- ✅ Client should extract `freePlaysRemaining` and `purchasedPlaysRemaining` from success response
- ✅ Client can update UI optimistically, but server response is authoritative

**Updated Client Code Pattern:**
```typescript
createGame: async (mode: GameMode, playerName: string, walletAddress?: string, isDailyFree?: boolean): Promise<GameState & { freePlaysRemaining?: number; purchasedPlaysRemaining?: number }> => {
  // ... existing code ...
  
  const game = await apiCall<GameState & { freePlaysRemaining?: number; purchasedPlaysRemaining?: number }>('/game/create', {
    method: 'POST',
    body: JSON.stringify(requestData),
  })
  
  // Extract balance info for UI sync
  if (game.freePlaysRemaining !== undefined || game.purchasedPlaysRemaining !== undefined) {
    // Update local state if needed (optimistic UI)
    // Server response is authoritative
  }
  
  return game
}
```

---

## 🔍 Client-Side Free Play Consumption Check

### Current State:

**File:** `features/games/ape-in/lib/playBalanceService.ts`
- Line 123: `useFreePlay()` method exists
- **NOT called** in game creation flow (verified via grep)
- Only exists as utility method (not used in normal flow)

**Verification:**
- ✅ No calls to `PlayBalanceService.useFreePlay()` in `apeingame.tsx`
- ✅ No calls to `PlayBalanceService.useFreePlay()` in `MainMenu.tsx`
- ✅ No calls to `PlayBalanceService.useFreePlay()` in `api.ts`

**Conclusion:**
- ✅ **No client-side consumption currently happening**
- ✅ **No double-decrement risk** (client doesn't decrement)
- ✅ Can keep `useFreePlay()` for optimistic UI if desired, but not required

---

## 📊 Server Response Contract

### Success Response (200):
```typescript
{
  // Existing GameState fields
  gameId: string
  mode: GameMode
  playerName: string
  // ... other game state ...
  
  // NEW: Balance info (for UI sync - computed on server)
  freePlaysRemaining: number
  purchasedPlaysRemaining: number
  totalPlaysRemaining: number // Computed: free + purchased (so UI doesn't re-derive)
  consumedType: 'free' | 'purchased' | null // null for Sandy
}
```

### Error Response (400):
```typescript
{
  error: string // "No plays available" or specific error
  freePlaysRemaining: number
  purchasedPlaysRemaining: number
  totalPlaysRemaining: number // Computed on server
}
```

**Why Return Balances:**
- Client can sync UI immediately (no need for separate balance API call)
- Server is authoritative source
- Prevents client/server balance drift

---

## ✅ Verification Summary

### Hook-In Point:
- **File:** `app/api/ape-in/game/create/route.ts`
- **Line:** ~36 (replace TODO comment)
- **Before:** `GameService.createGame()` call (line 42)
- **After:** Validation (lines 10-34)

### Client Behavior:
- ✅ **No client-side consumption** (good - no double-decrement risk)
- ✅ Client just calls API, handles response
- ✅ Can use response balances for UI sync

### Server Responsibilities:
1. Validate mode + inputs (existing)
2. If Sandy → skip consumption (existing flow)
3. **NEW:** Consume play (atomic, server-side)
   - **Single DB transaction** (validate + decrement in one operation)
   - Free play first (mode-specific)
   - Then purchased play (global balance)
   - Else return 400
   - **Use Supabase RPC function OR single transaction** (prevent "double game start" race condition)
4. Only if play consumed → create game
5. Return game state + remaining balances (including totalPlaysRemaining computed on server)

### Design Choice:
- ✅ **Model A: Global purchased plays** (LOCKED - recommended)
- Balance table: `user_id` (PK) + `balance` (INT) + `updated_at` (NO mode column)
- Intent table: can store `game_mode` for analytics/audit, but balance is global
- User buys 5 plays → can use on any paid mode (aida/lana/enj1n/nifty/pvp/multiplayer)

---

**Status:** Ready for implementation. Hook-in point verified, no client-side consumption conflicts, server response contract defined.
