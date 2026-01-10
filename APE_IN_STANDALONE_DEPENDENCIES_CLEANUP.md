# Ape In - Standalone Dependencies Cleanup Plan

## Issues Found

Ape In still has standalone dependencies that need to be removed to match Cryptoku's integration pattern:

### 1. Environment Variables (Vite-specific) ❌
- `import.meta.env.VITE_*` - Won't work in Next.js
- Files affected:
  - `lib/paymentService.ts` - VITE_RPC_URL, VITE_TOKEN_ADDRESS, etc.
  - `lib/playTokenService.ts` - VITE_API_URL, VITE_ALLOW_STANDALONE
  - `lib/resultSubmissionService.ts` - VITE_API_URL, VITE_ALLOW_STANDALONE
  - `lib/websocket.ts` - VITE_WS_URL
  - `hooks/useApeCoinBalance.ts` - VITE_RPC_URL, VITE_TOKEN_SYMBOL
  - `components/GameBoard.tsx` - VITE_ZKVERIFY_API_KEY, VITE_USE_ZKVERIFY

### 2. Old Identity/Wallet System ❌
- `hooks/useIdentity.ts` - Old postMessage hook (should use `useArcade()`)
- `lib/identity-bridge.ts` - postMessage identity bridge (not needed)
- `providers/IdentityProvider.tsx` - Old postMessage provider (not needed)
- `lib/thirdweb.ts` - Standalone Thirdweb client (should use arcade hub's)

### 3. Services Using Old Patterns ❌
- `lib/paymentService.ts` - Uses `useIdentity` hook
- `lib/playTokenService.ts` - Uses old API URLs
- `lib/resultSubmissionService.ts` - Uses old API URLs
- `hooks/useApeCoinBalance.ts` - Uses `useIdentity` hook

### 4. Unused/Obsolete Files ❌
- `frontend/src/lib/thirdweb.ts` - Old Thirdweb client
- `frontend/src/providers/IdentityProvider.tsx` - Old provider
- `lib/identity-bridge.ts` - Old postMessage bridge

## Cleanup Plan

### Step 1: Remove Obsolete Files
- Delete `lib/identity-bridge.ts` (not needed - use arcade hub context)
- Delete `hooks/useIdentity.ts` (replace with `useArcade()`)
- Delete `providers/IdentityProvider.tsx` (not needed)
- Delete `frontend/src/lib/thirdweb.ts` (use arcade hub's)
- Delete `lib/supabase/client.ts` (use arcade hub's)

### Step 2: Update Services to Use Arcade Hub
- Update `lib/paymentService.ts` - Remove `useIdentity`, use arcade hub context
- Update `lib/playTokenService.ts` - Use Next.js API routes
- Update `lib/resultSubmissionService.ts` - Use Next.js API routes
- Update `hooks/useApeCoinBalance.ts` - Use `useArcade()` instead of `useIdentity`

### Step 3: Replace Environment Variables
- Replace `import.meta.env.VITE_*` with `process.env.NEXT_PUBLIC_*` (Next.js pattern)
- Or remove if not needed (use arcade hub's shared config)

### Step 4: Update Components
- Ensure all components use `useArcade()` from arcade hub
- Remove any remaining `useIdentity()` calls
- Remove `import.meta.env` references

### Step 5: Verify Integration
- All wallet/address access via `useArcade()`
- All profile access via `useArcade()`
- All Thirdweb usage via arcade hub's client
- All Supabase usage via arcade hub's client
- No standalone env files needed

