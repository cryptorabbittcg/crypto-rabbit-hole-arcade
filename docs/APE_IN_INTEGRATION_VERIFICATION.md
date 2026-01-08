# Ape In Integration Verification

This document verifies that the Arcade Hub's implementation matches Ape In's expectations for the `ARCADE_IDENTITY` message.

## ✅ Verification Checklist

### 1. Message Format ✅

**Status**: CORRECT

The arcade sends the exact structure Ape In expects:

```typescript
{
  type: "ARCADE_IDENTITY",
  session: {
    sessionId: string,
    userId: string,
    username: string,
    address: string | null,
    thirdwebClientId: string,
    tickets: number,
    points: number,
    timestamp: number
  },
  // Plus flattened properties for compatibility
  sessionId: string,
  userId: string,
  username: string,
  address: string | null,
  thirdwebClientId: string,
  tickets: number,
  points: number
}
```

**Location**: `components/game-modal.tsx` lines 124-135

### 2. Message Timing ✅

**Status**: FIXED

- ✅ Sends identity **AFTER** iframe `onload` event fires
- ✅ Waits **300ms** after load (within recommended 200-500ms range)
- ✅ Does NOT send before iframe is ready
- ✅ Handles case where iframe might already be loaded

**Implementation**:
- `handleLoad()` function waits for `iframe.onload` event
- 300ms delay after load event (reduced from 1000ms)
- Retry mechanism only runs if identity hasn't been sent yet

**Location**: `components/game-modal.tsx` lines 161-172

### 3. Message Frequency ✅

**Status**: FIXED

- ✅ Sends identity **ONCE** per iframe load
- ✅ Uses `hasSentIdentity` flag to prevent duplicate sends
- ✅ Retry mechanism stops immediately after successful send
- ✅ Clears retry interval when identity is sent
- ✅ Resets flag only on new iframe load or explicit request

**Implementation**:
- `hasSentIdentity` boolean flag prevents duplicate sends
- Retry interval clears itself after successful send
- Flag resets only when:
  - New iframe loads (new `handleLoad` call)
  - Explicit `REQUEST_ARCADE_IDENTITY` message received
  - Component unmounts/remounts

**Location**: `components/game-modal.tsx` lines 52, 54, 155, 200-214

### 4. PostMessage Target Origin ✅

**Status**: CORRECT

- ✅ Uses `"*"` as target origin for cross-origin iframes
- ✅ Ape In validates origin on receive side
- ✅ Allows messages to reach Ape In regardless of origin restrictions

**Location**: `components/game-modal.tsx` line 153

### 5. Console Logging ✅

**Status**: ENHANCED

The arcade now logs:
- `📤 Sending identity message:` - Full JSON payload
- `📤 Message structure breakdown:` - How to access properties
- `📤 Full session object:` - Complete session data
- `✅ postMessage called with target origin: '*' - Identity sent successfully`
- `⏭️ Identity already sent, skipping duplicate send` - When duplicate prevented
- `🔄 Retry attempt X/Y - sending identity...` - Retry attempts
- `📥 Received identity request from iframe - sending identity...` - When requested

**Location**: `components/game-modal.tsx` lines 137-154

## Expected Ape In Console Logs

After Ape In loads, you should see in the **Ape In iframe's console** (not the parent console):

1. `📨 Message event received:` - Shows origin validation
2. `📥 Received valid message from parent: ARCADE_IDENTITY` - Message received
3. `📦 Parsing identity from arcade message:` - Processing message
4. `✅ Identity received and mapped:` - Identity parsed successfully
5. `✅ Setting identity:` - Identity applied to game state

If these logs don't appear, check:
- Browser console is set to show iframe logs (Chrome: right-click iframe → Inspect)
- Message is actually being sent (check parent console for `✅ postMessage called`)
- Origin validation is passing (check Ape In console for origin errors)

## Retry Mechanism

The arcade has a smart retry mechanism:

- **Primary**: Sends after `iframe.onload` + 300ms delay
- **Backup**: Retries every 500ms for up to 3 seconds (6 attempts)
- **Stops immediately** when identity is successfully sent
- **Respects** the `hasSentIdentity` flag to prevent duplicates

This ensures the message is sent even if:
- Load event fires before Ape In's listener is ready
- Load event doesn't fire (edge case)
- Timing issues occur

## Message Flow

```
1. Iframe starts loading
   ↓
2. Iframe.onload event fires
   ↓
3. Wait 300ms (ensure Ape In listener is ready)
   ↓
4. Send ARCADE_IDENTITY message (if not already sent)
   ↓
5. Set hasSentIdentity = true
   ↓
6. Clear retry interval
   ↓
7. Ape In receives and processes message
```

**Alternative flow** (if load event missed):
```
1. Retry interval starts (every 500ms)
   ↓
2. Check hasSentIdentity flag
   ↓
3. If false, send message
   ↓
4. If true, stop retrying
```

**On explicit request**:
```
1. Ape In sends REQUEST_ARCADE_IDENTITY
   ↓
2. Arcade receives request
   ↓
3. Reset hasSentIdentity flag
   ↓
4. Send identity immediately
```

## Testing Checklist

When testing the integration:

1. ✅ Open Ape In game in arcade hub
2. ✅ Check parent console for: `✅ postMessage called with target origin: '*' - Identity sent successfully`
3. ✅ Check Ape In iframe console for: `📥 Received valid message from parent: ARCADE_IDENTITY`
4. ✅ Verify identity is sent only ONCE (check for `⏭️ Identity already sent` if multiple attempts)
5. ✅ Verify Ape In processes the identity (check for `✅ Identity received and mapped`)
6. ✅ Verify game loads with correct user data

## Summary

All requirements from Ape In have been implemented:

- ✅ **Message format**: Correct structure with nested session + flattened properties
- ✅ **Message timing**: Sends after iframe.onload + 300ms delay
- ✅ **Message frequency**: Sends only once per iframe load (guarded by flag)
- ✅ **PostMessage origin**: Uses `"*"` for cross-origin compatibility
- ✅ **Console logging**: Comprehensive logging for debugging

The arcade build is now **fully congruent** with Ape In's expectations.

