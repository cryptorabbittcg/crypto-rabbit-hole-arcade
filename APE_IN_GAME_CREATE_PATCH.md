# 🎯 Ape In Game Create Route - Exact Patch
**Date:** 2026-01-20  
**Status:** Implementation-ready patch (minimal diff)

---

## 📍 Patch Location

**File:** `app/api/ape-in/game/create/route.ts`  
**Replace:** Lines 36-47 (TODO comment through GameService.createGame call)

---

## ✅ Exact Patch (Minimal Diff)

### Step 1: Add Top-Level Imports (at top of file, after existing imports):
```typescript
import { ApeInPlaysConsumptionService } from "@/lib/supabase/services/ape-in-plays-consumption.service"
import { getGame } from "@/lib/ape-in/game-store"
```

### Step 2: Replace This Block (lines 36-64):
```typescript
    // TODO: Check payment/play token for ranked modes (if needed)
    // For now, we'll allow game creation for all modes

    console.log('🎮 Creating game:', { mode, playerName, walletAddress: walletAddress?.slice(0, 10) + '...' })

    // Create game using GameService (uses weighted card drawing, no deck needed)
    const gameState = await GameService.createGame(
      mode as GameMode,
      playerName,
      walletAddress,
      isDailyFree || false
    )

    console.log('✅ Game created and stored:', gameState.gameId, 'Mode:', mode)
    
    // Verify game was stored by trying to retrieve it
    try {
      const { getGame } = await import('@/lib/ape-in/game-store')
      const stored = await getGame(gameState.gameId)
      if (stored) {
        console.log('✅ Verified: Game stored successfully and can be retrieved')
      } else {
        console.error('❌ WARNING: Game created but could not be retrieved immediately')
      }
    } catch (error) {
      console.error('❌ Error verifying game storage:', error)
    }

    return NextResponse.json(gameState)
```

### With This:
```typescript
    // Sandy is always free - skip play consumption
    if (isSandy) {
      // Proceed directly to game creation
      console.log('🎮 Creating Sandy tutorial (always free):', { mode, playerName })
      const gameState = await GameService.createGame(
        mode as GameMode,
        playerName,
        walletAddress,
        isDailyFree || false
      )
      
      // Verify game was stored
      try {
        const stored = await getGame(gameState.gameId)
        if (stored) {
          console.log('✅ Verified: Game stored successfully and can be retrieved')
        } else {
          console.error('❌ WARNING: Game created but could not be retrieved immediately')
        }
      } catch (error) {
        console.error('❌ Error verifying game storage:', error)
      }
      
      return NextResponse.json({
        ...gameState,
        freePlaysRemaining: 0, // Not applicable for Sandy
        purchasedPlaysRemaining: 0, // Not applicable for Sandy
        totalPlaysRemaining: 0, // Not applicable for Sandy
        consumedType: null, // Sandy is free
      })
    }

    // For ranked modes: consume play server-side (atomic)
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required for ranked modes" },
        { status: 400 }
      )
    }

    // Use consumption service (already imported at top)
    const consumptionService = new ApeInPlaysConsumptionService()
    
    // Consume play (free first, then purchased) - atomic operation
    const playConsumed = await consumptionService.consumePlayForMode(walletAddress, mode as GameMode)
    
    if (!playConsumed.success) {
      return NextResponse.json(
        {
          error: playConsumed.error || "No plays available",
          freePlaysRemaining: playConsumed.freePlaysRemaining || 0,
          purchasedPlaysRemaining: playConsumed.purchasedPlaysRemaining || 0,
          totalPlaysRemaining: playConsumed.totalPlaysRemaining || 0,
        },
        { status: 400 }
      )
    }

    console.log('🎮 Creating game (play consumed):', { 
      mode, 
      playerName, 
      walletAddress: walletAddress?.slice(0, 10) + '...',
      consumedType: playConsumed.consumedType,
      remainingPlays: playConsumed.totalPlaysRemaining,
    })

    // Play consumed successfully - create game
    // NOTE: If game creation fails, play is still consumed (no refund for MVP)
    // This is acceptable - logs help diagnose rare create failures
    const gameState = await GameService.createGame(
      mode as GameMode,
      playerName,
      walletAddress,
      isDailyFree || false
    )

    console.log('✅ Game created and stored:', gameState.gameId, 'Mode:', mode)
    
    // Verify game was stored (getGame already imported at top)
    try {
      const stored = await getGame(gameState.gameId)
      if (stored) {
        console.log('✅ Verified: Game stored successfully and can be retrieved')
      } else {
        console.error('❌ WARNING: Game created but could not be retrieved immediately')
      }
    } catch (error) {
      console.error('❌ Error verifying game storage:', error)
    }

    // Return game state + remaining balances (for UI sync)
    return NextResponse.json({
      ...gameState,
      freePlaysRemaining: playConsumed.freePlaysRemaining,
      purchasedPlaysRemaining: playConsumed.purchasedPlaysRemaining,
      totalPlaysRemaining: playConsumed.totalPlaysRemaining, // Computed on server
      consumedType: playConsumed.consumedType, // 'free' | 'purchased'
    })
```

---

## 🔒 Critical Requirements

### 1. Atomic Operation
- `consumePlayForMode()` must be a **single DB transaction**
- Use Supabase RPC function OR single transaction
- Prevents "double game start" race condition (two rapid requests both passing check)

### 2. Priority Order
- Free play first (mode-specific)
- Then purchased play (global balance)
- Else reject

### 3. Response Contract
- Success: GameState + balance fields
- Error: Error message + balance fields (so UI can update)

### 4. Model A (Global Purchased Plays)
- Purchased balance is global (no mode column)
- Intent table can store `game_mode` for analytics
- Balance table: `user_id` + `balance` only

---

## 📋 Dependencies

This patch requires:
1. `ApeInPlaysConsumptionService` to exist (create first)
2. `ape_in_purchased_plays_balances` table to exist (migration first)
3. Free plays service to support server-side consumption

## ⚠️ Important Notes

### 1. Static Imports (Not Dynamic)
- All imports are at top of file (deterministic, no bundling issues)
- `ApeInPlaysConsumptionService` and `getGame` are static imports

### 2. Single Return Per Branch
- Sandy branch: returns once (line ~50)
- Ranked branch: returns once (line ~95)
- Error branch: returns once (line ~75)
- **No double-return risk**

### 3. Consume-First, No-Refund (MVP)
- Play is consumed BEFORE game creation
- If game creation fails, play is still consumed (no refund)
- This is acceptable for MVP (simple + consistent)
- Logs help diagnose rare create failures

---

**Status:** Ready to apply once dependencies are in place.

**See:** `app/api/ape-in/game/create/route.ts.FINAL` for complete copy-paste ready file.
