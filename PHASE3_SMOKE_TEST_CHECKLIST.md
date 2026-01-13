# Phase 3 Linked Wallets - Smoke Test Checklist

## Prerequisites
- Server running (Next.js dev/prod)
- Valid Ethereum address for testing (e.g., `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`)
- MetaMask installed (for full E2E test)
- Profile exists in database for test address

---

## 1. GET /api/profile/linked-wallets

### Test 1.1: Valid address with no linked wallets
```bash
curl -X GET "http://localhost:3000/api/profile/linked-wallets?address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "ok": true,
  "linked_wallets": []
}
```

**Server Log:**
```
[linked-wallets] Profile not found for address: 0x742d35c... (if no profile)
OR
[linked-wallets] Found 0 linked wallet(s) for profile: abc12345...
```

### Test 1.2: Valid address with linked wallets
```bash
curl -X GET "http://localhost:3000/api/profile/linked-wallets?address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "ok": true,
  "linked_wallets": [
    {
      "address": "0x1234567890123456789012345678901234567890",
      "type": "metamask",
      "linkedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Server Log:**
```
[linked-wallets] Found 1 linked wallet(s) for profile: abc12345...
```

### Test 1.3: Missing address parameter
```bash
curl -X GET "http://localhost:3000/api/profile/linked-wallets" \
  -H "Content-Type: application/json"
```

**Expected Response (400):**
```json
{
  "ok": false,
  "error": "Missing address parameter"
}
```

### Test 1.4: Invalid address format
```bash
curl -X GET "http://localhost:3000/api/profile/linked-wallets?address=invalid" \
  -H "Content-Type: application/json"
```

**Expected Response (400):**
```json
{
  "ok": false,
  "error": "Invalid address format"
}
```

**Client Log (when fetching from ProfileView):**
```
[ProfileView] Fetching linked wallets for 0x742d35c...
[ProfileView] Fetched 0 linked wallet(s)
```

---

## 2. POST /api/profile/link-wallet

### Test 2.1: Successful link (requires valid signature)
```bash
curl -X POST "http://localhost:3000/api/profile/link-wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "linkedAddress": "0x1234567890123456789012345678901234567890",
    "type": "metamask",
    "message": "Link wallet message here...",
    "signature": "0x1234..."
  }'
```

**Expected Response (200):**
```json
{
  "ok": true,
  "linked_wallets": [
    {
      "address": "0x1234567890123456789012345678901234567890",
      "type": "metamask",
      "linkedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Server Log:**
```
[link-wallet] Attempting to link wallet 0x12345678... to profile abc12345...
[link-wallet] Success: Linked wallet 0x12345678... to profile abc12345... (total: 1)
```

**Client Log:**
```
[ProfileView] Link success: 1 total linked wallet(s)
```

### Test 2.2: Missing required fields
```bash
curl -X POST "http://localhost:3000/api/profile/link-wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

**Expected Response (400):**
```json
{
  "ok": false,
  "error": "Missing required fields"
}
```

### Test 2.3: Invalid wallet type
```bash
curl -X POST "http://localhost:3000/api/profile/link-wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "linkedAddress": "0x1234567890123456789012345678901234567890",
    "type": "coinbase",
    "message": "Link wallet message here...",
    "signature": "0x1234..."
  }'
```

**Expected Response (400):**
```json
{
  "ok": false,
  "error": "Invalid wallet type. Allowed types: metamask"
}
```

### Test 2.4: Invalid address format
```bash
curl -X POST "http://localhost:3000/api/profile/link-wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryAddress": "invalid",
    "linkedAddress": "0x1234567890123456789012345678901234567890",
    "type": "metamask",
    "message": "Link wallet message here...",
    "signature": "0x1234..."
  }'
```

**Expected Response (400):**
```json
{
  "ok": false,
  "error": "Invalid address format"
}
```

### Test 2.5: Profile not found
```bash
curl -X POST "http://localhost:3000/api/profile/link-wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryAddress": "0x0000000000000000000000000000000000000000",
    "linkedAddress": "0x1234567890123456789012345678901234567890",
    "type": "metamask",
    "message": "Link wallet message here...",
    "signature": "0x1234..."
  }'
```

**Expected Response (404):**
```json
{
  "ok": false,
  "error": "Profile not found"
}
```

### Test 2.6: Invalid signature
```bash
curl -X POST "http://localhost:3000/api/profile/link-wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "linkedAddress": "0x1234567890123456789012345678901234567890",
    "type": "metamask",
    "message": "Link wallet message here...",
    "signature": "0xinvalid"
  }'
```

**Expected Response (401):**
```json
{
  "ok": false,
  "error": "Invalid signature"
}
```

### Test 2.7: Maximum linked wallets reached (5)
```bash
# After linking 5 wallets, attempt to link a 6th
curl -X POST "http://localhost:3000/api/profile/link-wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "linkedAddress": "0x9999999999999999999999999999999999999999",
    "type": "metamask",
    "message": "Link wallet message here...",
    "signature": "0x1234..."
  }'
```

**Expected Response (400):**
```json
{
  "ok": false,
  "error": "Maximum linked wallets reached (5)"
}
```

**Server Log:**
```
[link-wallet] Attempting to link wallet 0x99999999... to profile abc12345...
[link-wallet] Failed: Maximum linked wallets reached (5) for profile abc12345...
```

**Client Log:**
```
[ProfileView] Link failure: Error: Maximum linked wallets reached (5)
```

### Test 2.8: Wallet already linked
```bash
# Attempt to link the same wallet twice
curl -X POST "http://localhost:3000/api/profile/link-wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "linkedAddress": "0x1234567890123456789012345678901234567890",
    "type": "metamask",
    "message": "Link wallet message here...",
    "signature": "0x1234..."
  }'
```

**Expected Response (400):**
```json
{
  "ok": false,
  "error": "Wallet already linked or failed to link"
}
```

**Server Log:**
```
[link-wallet] Attempting to link wallet 0x12345678... to profile abc12345...
[link-wallet] Failed: Wallet already linked or failed to link for profile abc12345...
```

**Client Log:**
```
[ProfileView] Link failure: Error: Wallet already linked or failed to link
```

---

## 3. POST /api/profile/unlink-wallet

### Test 3.1: Successful unlink
```bash
curl -X POST "http://localhost:3000/api/profile/unlink-wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "linkedAddress": "0x1234567890123456789012345678901234567890"
  }'
```

**Expected Response (200):**
```json
{
  "ok": true,
  "linked_wallets": []
}
```

**Server Log:**
```
[unlink-wallet] Attempting to unlink wallet 0x12345678... from profile abc12345...
[unlink-wallet] Success: Unlinked wallet 0x12345678... from profile abc12345... (remaining: 0)
```

**Client Log:**
```
[ProfileView] Unlink success: 0 remaining linked wallet(s)
```

### Test 3.2: Missing required fields
```bash
curl -X POST "http://localhost:3000/api/profile/unlink-wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

**Expected Response (400):**
```json
{
  "ok": false,
  "error": "Missing required fields"
}
```

### Test 3.3: Invalid address format
```bash
curl -X POST "http://localhost:3000/api/profile/unlink-wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryAddress": "invalid",
    "linkedAddress": "0x1234567890123456789012345678901234567890"
  }'
```

**Expected Response (400):**
```json
{
  "ok": false,
  "error": "Invalid address format"
}
```

### Test 3.4: Profile not found
```bash
curl -X POST "http://localhost:3000/api/profile/unlink-wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryAddress": "0x0000000000000000000000000000000000000000",
    "linkedAddress": "0x1234567890123456789012345678901234567890"
  }'
```

**Expected Response (404):**
```json
{
  "ok": false,
  "error": "Profile not found"
}
```

### Test 3.5: Wallet not linked
```bash
curl -X POST "http://localhost:3000/api/profile/unlink-wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "linkedAddress": "0x9999999999999999999999999999999999999999"
  }'
```

**Expected Response (404):**
```json
{
  "ok": false,
  "error": "Wallet not linked"
}
```

**Server Log:**
```
[unlink-wallet] Attempting to unlink wallet 0x99999999... from profile abc12345...
[unlink-wallet] Failed: Wallet not linked for profile abc12345...
```

**Client Log:**
```
[ProfileView] Unlink failure: Error: Wallet not linked
```

---

## Full E2E Test Flow

### Step 1: Check initial state
```bash
curl -X GET "http://localhost:3000/api/profile/linked-wallets?address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
```
**Expected:** `{"ok": true, "linked_wallets": []}`

### Step 2: Link wallet (via UI with MetaMask)
1. Open profile page in browser
2. Click "Link MetaMask"
3. Approve MetaMask connection
4. Sign message in MetaMask
5. Verify success toast appears

**Client Logs:**
```
[ProfileView] Fetching linked wallets for 0x742d35c...
[ProfileView] Fetched 0 linked wallet(s)
[ProfileView] Link success: 1 total linked wallet(s)
```

**Server Logs:**
```
[link-wallet] Attempting to link wallet 0x12345678... to profile abc12345...
[link-wallet] Success: Linked wallet 0x12345678... to profile abc12345... (total: 1)
```

### Step 3: Verify linked wallet appears
```bash
curl -X GET "http://localhost:3000/api/profile/linked-wallets?address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
```
**Expected:** `{"ok": true, "linked_wallets": [{"address": "...", "type": "metamask", "linkedAt": "..."}]}`

### Step 4: Unlink wallet (via UI)
1. Click "Unlink" button next to linked wallet
2. Verify success toast appears

**Client Logs:**
```
[ProfileView] Unlink success: 0 remaining linked wallet(s)
```

**Server Logs:**
```
[unlink-wallet] Attempting to unlink wallet 0x12345678... from profile abc12345...
[unlink-wallet] Success: Unlinked wallet 0x12345678... from profile abc12345... (remaining: 0)
```

### Step 5: Verify wallet is unlinked
```bash
curl -X GET "http://localhost:3000/api/profile/linked-wallets?address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
```
**Expected:** `{"ok": true, "linked_wallets": []}`

---

## Error Scenarios to Test

### Client-Side Error Handling
1. **MetaMask not installed**
   - Client Log: None (toast shown)
   - Expected: Toast with "MetaMask Not Installed"

2. **User rejects connection**
   - Client Log: None (toast shown)
   - Expected: Toast with "Connection Rejected"

3. **User rejects signature**
   - Client Log: `[ProfileView] Link failure: Error: ...`
   - Expected: Toast with "Signature Rejected"

4. **API error response**
   - Client Log: `[ProfileView] Link failure: Error: <server error message>`
   - Expected: Toast with server error message

---

## Debug Log Locations

### Server-Side Logs
- **`app/api/profile/linked-wallets/route.ts`**
  - Line ~28: Profile not found
  - Line ~33: Found linked wallets count

- **`app/api/profile/link-wallet/route.ts`**
  - Line ~63: Attempting to link wallet
  - Line ~67: Maximum wallets reached
  - Line ~70: Wallet already linked
  - Line ~74: Link success with count

- **`app/api/profile/unlink-wallet/route.ts`**
  - Line ~37: Attempting to unlink wallet
  - Line ~39: Wallet not linked
  - Line ~43: Unlink success with remaining count

### Client-Side Logs
- **`features/profile/profile-view.tsx`**
  - Line ~73: Fetching linked wallets
  - Line ~77: Fetch error
  - Line ~79: Response error
  - Line ~94: Fetched count
  - Line ~252: Link success with count
  - Line ~258: Link failure
  - Line ~295: Unlink success with remaining count
  - Line ~301: Unlink failure

---

## Notes
- All addresses are normalized to lowercase in logs
- Profile IDs are truncated to first 8 characters in logs
- Wallet addresses are truncated to first 10 characters in logs
- Logs use consistent prefixes: `[linked-wallets]`, `[link-wallet]`, `[unlink-wallet]`, `[ProfileView]`

