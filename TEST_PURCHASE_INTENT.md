# Testing Purchase Intent Endpoint

## Quick Test Options

### Option 1: Browser Console (Copy & Paste)

Open your browser console on `https://arcade.thecryptorabbithole.io` and paste:

```javascript
fetch("/api/cryptoku/hints/purchase-intent", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    address: "0x431E3cA238fE4AF6De90078F0AcD688Ff19f2968",
  }),
})
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error)
```

**Expected Success Response:**
```json
{
  "intentId": "b2e9c3c0-...",
  "chainId": 33139,
  "recipient": "0xae998cc1128974381008ad086828c9b606b00c0f",
  "priceWei": "1000000000000000000",
  "amount": 10,
  "expiresAt": "2026-01-20T..."
}
```

**Expected Error (if profile not found):**
```json
{
  "error": "Profile not found. Please ensure you're connected with a registered wallet."
}
```

### Option 2: Terminal (curl)

```bash
curl -X POST https://arcade.thecryptorabbithole.io/api/cryptoku/hints/purchase-intent \
  -H "Content-Type: application/json" \
  -d '{"address":"0x431E3cA238fE4AF6De90078F0AcD688Ff19f2968"}'
```

## Verify in Supabase

After successful request:

```sql
-- Check intent was created
SELECT intent_id, status, wallet_address, recipient_address, price_wei, expires_at
FROM cryptoku_hint_purchase_intents
ORDER BY created_at DESC
LIMIT 5;

-- Count should be > 0
SELECT COUNT(*) FROM cryptoku_hint_purchase_intents;
```

**Expected:**
- `status` = `'pending'`
- `wallet_address` = lowercase address
- `recipient_address` = `'0xae998cc1128974381008ad086828c9b606b00c0f'`
- `price_wei` = `'1000000000000000000'`
