# URGENT FIX: Ape In Child - Accept Messages from Arcade Hub

## Problem
The child (ape-in-game) is rejecting postMessage from the parent (arcade hub) with this error:
```
⚠️ Message from unauthorized origin: https://arcade.thecryptorabbithole.io - ignoring
```

This prevents:
- Session reception from parent
- Sandy mode from launching (may require session)
- Game integration from working

## Root Cause
The child's message listener origin allowlist doesn't include `https://arcade.thecryptorabbithole.io`.

## URGENT FIX - Apply to Ape In Child Code

### File: `src/hooks/use-arcade-session.ts` (or wherever message listener is)

Find the code that checks origins and update it:

**BEFORE (BROKEN):**
```typescript
const ALLOWED_PARENT_ORIGINS = [
  'http://localhost:3000',  // Only localhost
  // Missing production origin!
]

window.addEventListener('message', (event: MessageEvent) => {
  if (!ALLOWED_PARENT_ORIGINS.includes(event.origin)) {
    console.warn('⚠️ Message from unauthorized origin:', event.origin, '- ignoring')
    return  // ❌ Rejects messages from parent!
  }
  // ... handle message
})
```

**AFTER (FIXED):**
```typescript
const ALLOWED_PARENT_ORIGINS = [
  'https://arcade.thecryptorabbithole.io',  // ✅ ADD THIS - Production arcade hub
  'http://localhost:3000',                   // Local arcade hub
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]

window.addEventListener('message', (event: MessageEvent) => {
  // ⚠️ CRITICAL: Ignore messages from self (iframe sending to itself)
  if (event.origin === window.location.origin) {
    console.log('⏭️ Ignoring message from self (own origin)')
    return
  }

  // ✅ Accept messages from PARENT (arcade hub) only
  if (!ALLOWED_PARENT_ORIGINS.includes(event.origin)) {
    console.warn('⚠️ Message from unauthorized origin:', event.origin, '- ignoring')
    console.warn('   Allowed origins:', ALLOWED_PARENT_ORIGINS)
    console.warn('   Own origin:', window.location.origin)
    return
  }

  // ✅ Process ARCADE_IDENTITY message
  if (event.data?.type === 'ARCADE_IDENTITY') {
    console.log('✅ ARCADE_IDENTITY received from parent:', event.origin)
    // ... handle session
  }
})
```

### File: `src/components/ArcadeSessionGuard.tsx` (or game launch component)

Ensure Sandy mode can launch without session:

```typescript
// In your game launch function
async function startGame(mode: string) {
  // ✅ Sandy should ALWAYS work, no checks needed
  if (mode.toLowerCase() === 'sandy') {
    console.log('✅ Launching Sandy tutorial (no checks needed)')
    try {
      await launchGame('sandy')  // Your actual Sandy launch function
      return
    } catch (error) {
      console.error('❌ Failed to launch Sandy:', error)
      throw error
    }
  }

  // Other modes - try to use session if available, but don't block
  const session = getArcadeSession()
  if (!session) {
    console.warn('⚠️ No arcade session - continuing as guest')
    // Continue anyway - session is optional
  }

  await launchGame(mode)
}
```

## Quick Find & Replace

Search for this pattern in the child codebase:
```typescript
// Search for:
const allowedOrigins = [
  'http://localhost:3000',
]

// Replace with:
const allowedOrigins = [
  'https://arcade.thecryptorabbithole.io',  // Production arcade hub
  'http://localhost:3000',                   // Local arcade hub
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]
```

Or search for the error message:
```typescript
// Search for:
⚠️ Message from unauthorized origin

// Find the ALLOWED_PARENT_ORIGINS or allowedOrigins array above it
// Add 'https://arcade.thecryptorabbithole.io' to the array
```

## Testing After Fix

1. Deploy the fix to ape-in-game
2. Open arcade hub and launch Ape In
3. Check browser console - should see:
   - ✅ `ARCADE_IDENTITY received from parent: https://arcade.thecryptorabbithole.io`
   - ✅ `Arcade session stored`
   - ❌ Should NOT see: `⚠️ Message from unauthorized origin: https://arcade.thecryptorabbithole.io`
4. Click Sandy Play button
5. Game should launch without errors

## Full Implementation

For complete implementation, see: `APE_IN_CHILD_CODE_FIXES.md`

Key files to update:
1. Message listener origin allowlist ✅ (THIS FIX)
2. Sandy mode launch without session checks ✅ (THIS FIX)
3. Session storage in localStorage
4. Retry loop for session requests
5. Supabase graceful degradation

