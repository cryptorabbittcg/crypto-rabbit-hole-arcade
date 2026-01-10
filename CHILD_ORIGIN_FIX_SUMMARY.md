# Child Origin Fix - Summary

## The Issue
Console shows: `⚠️ Message from unauthorized origin: https://arcade.thecryptorabbithole.io - ignoring`

The child (ape-in-game) is rejecting all messages from the production arcade hub because `https://arcade.thecryptorabbithole.io` is not in the allowed origins list.

## The Fix

**Add to child's allowed origins array:**
```typescript
const ALLOWED_PARENT_ORIGINS = [
  'https://arcade.thecryptorabbithole.io',  // ← ADD THIS LINE
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]
```

**Location:** Find the message listener in the child codebase (likely in `src/hooks/use-arcade-session.ts` or similar)

**Also ensure:** Messages from self are ignored:
```typescript
if (event.origin === window.location.origin) {
  return  // Ignore self
}
```

## Why This Blocks Sandy

1. Parent sends `ARCADE_IDENTITY` message
2. Child rejects it (origin not allowed)
3. Child never receives session
4. Sandy may check for session before launching
5. Result: Sandy doesn't launch

## After Fix

1. ✅ Messages from parent are accepted
2. ✅ Session is received and stored
3. ✅ Sandy can launch (even without session, but session will be available)
4. ✅ Full integration works

See `APE_IN_URGENT_FIX.md` for detailed code changes.

