# Ape In - Standalone Dependencies Cleanup

## ❌ Issues Found (Not Like Cryptoku)

### 1. Environment Variables (Vite-specific - won't work in Next.js)
Files using `import.meta.env.VITE_*`:
- `components/GameBoard.tsx` - VITE_ZKVERIFY_API_KEY, VITE_USE_ZKVERIFY
- `lib/paymentService.ts` - VITE_RPC_URL, VITE_TOKEN_ADDRESS, etc.
- `lib/playTokenService.ts` - VITE_API_URL, VITE_ALLOW_STANDALONE
- `lib/resultSubmissionService.ts` - VITE_API_URL, VITE_ALLOW_STANDALONE
- `lib/websocket.ts` - VITE_WS_URL
- `hooks/useApeCoinBalance.ts` - VITE_RPC_URL, VITE_TOKEN_SYMBOL

### 2. Old Identity/Wallet Hooks (should use arcade hub context)
Files using `useIdentity()`:
- `components/StatsModal.tsx` - uses `useIdentity()`
- `components/NewHeader.tsx` - uses `useIdentity()` + React Router
- `lib/paymentService.ts` - uses `useIdentity()`
- `hooks/useApeCoinBalance.ts` - uses `useIdentity()`
- `hooks/useIntroTracking.ts` - uses `useIdentity()`

### 3. Obsolete Files (old standalone build)
- `hooks/useIdentity.ts` - Old postMessage hook (should use `useArcade()`)
- `lib/identity-bridge.ts` - Old postMessage bridge (not needed)
- `providers/IdentityProvider.tsx` - Old postMessage provider (not needed)
- `lib/supabase/client.ts` - Should use arcade hub's Supabase client
- `frontend/src/` - Entire old frontend structure (not needed)

### 4. Services Using Old Patterns
- `lib/paymentService.ts` - Uses `useIdentity()` hook
- `lib/playTokenService.ts` - Uses external API URLs
- `lib/resultSubmissionService.ts` - Uses external API URLs
- `lib/websocket.ts` - Uses external WebSocket URL

## ✅ What Should Match Cryptoku

**Cryptoku Pattern:**
- Receives `playerAddress`, `profileUsername`, `profileAvatarUrl` as **props**
- No internal wallet/identity hooks
- Uses Next.js API routes (relative URLs)
- Uses localStorage for local game state only
- No environment variables for wallet/thirdweb
- No standalone providers

**Ape In Current State:**
- ✅ Main component receives props (correct)
- ✅ GameBoard uses `useArcade()` (correct)
- ❌ Still has `useIdentity()` in some components
- ❌ Still uses `import.meta.env.VITE_*`
- ❌ Still has old standalone services

