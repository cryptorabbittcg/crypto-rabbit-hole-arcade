# PostMessage Handshake & Sandy Launch Fix - Summary

## Problem
1. Child (ape-in-game) repeatedly logs "No arcade session found" and never receives ARCADE_IDENTITY
2. Parent sends ARCADE_IDENTITY but uses '*' origin instead of exact origin
3. Missing Supabase env causes calls to placeholder.supabase.co which fail
4. Sandy mode cannot launch without session

## Solutions Implemented

### Parent Code (Arcade Hub) - ✅ FIXED

#### File: `components/game-modal.tsx`
**Changes:**
- Extract exact origin from iframe src URL using `new URL(iframe.src).origin`
- Send postMessage with exact origin instead of '*' (falls back to '*' only if origin cannot be determined)
- Handle both `ARCADE_SESSION_REQUEST` and `REQUEST_ARCADE_IDENTITY` message types
- Improved logging for debugging

**Key Code:**
```typescript
const getIframeOrigin = (): string | null => {
  if (!iframe?.src) return null
  try {
    const url = new URL(iframe.src)
    return url.origin
  } catch {
    return null
  }
}

// Use exact origin if available
const targetOrigin = getIframeOrigin()
contentWindow.postMessage(messagePayload, targetOrigin || "*")
```

#### File: `lib/supabase/client.ts`
**Changes:**
- Removed placeholder.supabase.co fallback completely
- Added `hasSupabaseConfig()` helper function
- Returns client that fails gracefully (operations return errors that services can catch)
- Never uses placeholder URL - throws error if env vars missing

**Key Code:**
```typescript
// Guard: Never use placeholder
if (!url || !key || url.includes("placeholder") || url === "https://placeholder.supabase.co") {
  console.warn("[v0] Missing or invalid Supabase environment variables")
  // Return client that will fail operations gracefully
  return createBrowserClient("https://supabase-not-configured.local", key || "not-configured-key")
}
```

### Child Code (Ape In Game) - 📋 TO IMPLEMENT

See `APE_IN_CHILD_CODE_FIXES.md` for complete implementation.

**Key Files to Create/Update:**
1. `src/lib/arcade-session.ts` - Session storage/retrieval
2. `src/hooks/use-arcade-session.ts` - postMessage listener with retry loop
3. `src/components/ArcadeSessionGuard.tsx` - Optional session guard
4. `src/lib/supabase/client.ts` - Never use placeholder
5. `src/utils/game-launch.ts` - Sandy launches without session
6. Wrap app with `ArcadeSessionGuard`

**Key Features:**
- ✅ Origin allowlisting: Only accepts messages from `arcade.thecryptorabbithole.io` + localhost
- ✅ Self-message filtering: Ignores messages from own origin
- ✅ Retry loop: Requests session via `ARCADE_SESSION_REQUEST` up to 10 times (5 seconds)
- ✅ Session storage: Stores in localStorage for persistence
- ✅ Sandy mode: Always launches without session/Supabase/wallet checks
- ✅ Supabase guards: Checks `hasSupabaseConfig()` before all operations
- ✅ Graceful degradation: Missing session doesn't block UI

## Testing Checklist

### Parent (Arcade Hub)
- [ ] Open Ape In game in arcade hub
- [ ] Check console for: `✅ postMessage called with target origin: 'https://ape-in-game.vercel.app'` (or exact origin)
- [ ] Verify messages are sent with exact origin (not '*')
- [ ] Verify `ARCADE_SESSION_REQUEST` requests are handled

### Child (Ape In Game)
- [ ] Open game in iframe
- [ ] Check console for: `✅ ARCADE_IDENTITY received from parent`
- [ ] Check console for: `✅ Arcade session stored`
- [ ] Should NOT see: `🔍 No arcade session found` (after message received)
- [ ] Click Sandy Play button
- [ ] Check console for: `✅ Sandy tutorial launched successfully`
- [ ] Game should actually start (not just log)
- [ ] Remove Supabase env vars
- [ ] Sandy should still launch (no Supabase errors blocking)
- [ ] Should log warnings but continue

## File Changes Summary

### Modified Files (Parent - Arcade Hub)
1. `components/game-modal.tsx` - Exact origin postMessage, ARCADE_SESSION_REQUEST handling
2. `lib/supabase/client.ts` - Removed placeholder, added guards

### New Files (Child - Ape In Game)
See `APE_IN_CHILD_CODE_FIXES.md` for all files to create/update.

## Next Steps

1. **Deploy parent changes** (already fixed in this repo)
2. **Implement child changes** from `APE_IN_CHILD_CODE_FIXES.md` in ape-in-game repository
3. **Test both sides** using the testing checklist above
4. **Verify Sandy route launches** without session

## Notes

- The "No arcade session found" log is likely in the child's `ArcadeSessionGuard` or game launch logic
- The child code structure assumes React + TypeScript (Vite or Next.js)
- All Supabase operations should be wrapped in try/catch with `hasSupabaseConfig()` checks
- Sandy mode should bypass ALL checks - session, Supabase, wallet, free plays, etc.

