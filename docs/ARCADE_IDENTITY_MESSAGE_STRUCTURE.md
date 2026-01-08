# ARCADE_IDENTITY Message Structure

This document describes the exact structure of the `ARCADE_IDENTITY` message sent from the Arcade Hub to embedded games (like Ape In) via `postMessage`.

## Message Delivery

The message is sent using `postMessage`:
```typescript
iframe.contentWindow.postMessage(messagePayload, "*")
```

When Ape In receives this message, it will be in the `MessageEvent`:
- **`event.data`** contains the message payload
- **`event.origin`** will be `"https://arcade.thecryptorabbithole.io"` (the parent window's origin)

## Message Payload Structure

The message payload has the following structure:

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
  // All session properties are also flattened at the top level for compatibility
  sessionId: string,
  userId: string,
  username: string,
  address: string | null,
  thirdwebClientId: string,
  tickets: number,
  points: number
}
```

## Accessing the Data in Ape In

When Ape In receives the message, it should access the data like this:

```typescript
window.addEventListener("message", (event: MessageEvent) => {
  // Verify origin
  if (event.origin !== "https://arcade.thecryptorabbithole.io") {
    return
  }
  
  if (event.data?.type === "ARCADE_IDENTITY") {
    // Option 1: Access via nested session object
    const session = event.data.session
    console.log("Session ID:", session.sessionId)
    console.log("User ID:", session.userId)
    console.log("Username:", session.username)
    console.log("Address:", session.address)
    console.log("Thirdweb Client ID:", session.thirdwebClientId)
    console.log("Tickets:", session.tickets)
    console.log("Points:", session.points)
    console.log("Timestamp:", session.timestamp)
    
    // Option 2: Access via flattened properties
    console.log("Session ID (flat):", event.data.sessionId)
    console.log("User ID (flat):", event.data.userId)
    console.log("Username (flat):", event.data.username)
    // etc...
  }
})
```

## Complete TypeScript Type Definition

```typescript
interface ArcadeIdentityMessage {
  type: "ARCADE_IDENTITY"
  session: {
    sessionId: string
    userId: string
    username: string
    address: string | null
    thirdwebClientId: string
    tickets: number
    points: number
    timestamp: number
  }
  // Flattened properties (duplicates of session properties)
  sessionId: string
  userId: string
  username: string
  address: string | null
  thirdwebClientId: string
  tickets: number
  points: number
}
```

## Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `type` | `string` | Message type identifier | `"ARCADE_IDENTITY"` |
| `session.sessionId` | `string` | Unique session identifier | `"session_1234567890_abc123"` |
| `session.userId` | `string` | User identifier (usually username or wallet address) | `"0x431E3cA238fE4AF6De90078F0AcD688Ff19f2968"` |
| `session.username` | `string` | Display username | `"Player123"` or `"Guest"` |
| `session.address` | `string \| null` | Wallet address (null if not connected) | `"0x431E3cA238fE4AF6De90078F0AcD688Ff19f2968"` or `null` |
| `session.thirdwebClientId` | `string` | Thirdweb Client ID for authentication | `"fc800f64235293d8bc898052f0859a3f"` |
| `session.tickets` | `number` | Current ticket balance | `0` (currently disabled) |
| `session.points` | `number` | Current points balance | `1250` |
| `session.timestamp` | `number` | Session creation timestamp (milliseconds) | `1698765432000` |

## Example Message

```json
{
  "type": "ARCADE_IDENTITY",
  "session": {
    "sessionId": "session_1698765432000_abc123def456",
    "userId": "0x431E3cA238fE4AF6De90078F0AcD688Ff19f2968",
    "username": "Player123",
    "address": "0x431E3cA238fE4AF6De90078F0AcD688Ff19f2968",
    "thirdwebClientId": "fc800f64235293d8bc898052f0859a3f",
    "tickets": 0,
    "points": 1250,
    "timestamp": 1698765432000
  },
  "sessionId": "session_1698765432000_abc123def456",
  "userId": "0x431E3cA238fE4AF6De90078F0AcD688Ff19f2968",
  "username": "Player123",
  "address": "0x431E3cA238fE4AF6De90078F0AcD688Ff19f2968",
  "thirdwebClientId": "fc800f64235293d8bc898052f0859a3f",
  "tickets": 0,
  "points": 1250
}
```

## Important Notes

1. **Data Location**: The identity data is in `event.data`, NOT `event.data.data` or `event.session`
2. **Nested Structure**: The full session object is in `event.data.session`
3. **Flattened Properties**: All session properties are also available directly on `event.data` for convenience
4. **Origin Validation**: Ape In should validate `event.origin === "https://arcade.thecryptorabbithole.io"` before processing
5. **Type Check**: Always check `event.data?.type === "ARCADE_IDENTITY"` before processing
6. **Null Address**: `address` can be `null` if the user is not connected (guest mode)

## Console Logging

The Arcade Hub now logs the exact message structure before sending:
- `📤 Sending identity message:` - Full JSON stringified payload
- `📤 Message structure breakdown:` - Shows how to access each property
- `📤 Full session object:` - The complete session object

Check the browser console when opening Ape In to see the exact structure being sent.

