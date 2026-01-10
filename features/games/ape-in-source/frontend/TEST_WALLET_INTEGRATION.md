# ✅ Test Wallet Integration

## Quick Verification

Run these checks to verify everything is working:

### 1. Check Dependencies
```bash
cd frontend
npm list thirdweb
```
**Expected:** `thirdweb@5.108.13` (or higher)

### 2. Verify Files Exist
```bash
ls -la src/lib/thirdweb.ts
ls -la src/components/Header.tsx
ls -la .env
```
**Expected:** All files should exist

### 3. Check Environment Variable
```bash
cat .env | grep VITE_THIRDWEB_CLIENT_ID
```
**Expected:** Should show your Client ID

### 4. Start Dev Server
```bash
npm run dev
```
**Expected:** Server starts on http://localhost:3000

### 5. Visual Test Checklist

Open `http://localhost:3000` and verify:

#### Header (Not Signed In)
- [ ] "APE IN!" logo visible
- [ ] "Play" and "Leaderboard" links visible
- [ ] "Sign In" button visible (gradient purple/pink)

#### Sign In Modal
- [ ] Click "Sign In" button
- [ ] Modal opens with title "Welcome to Ape In!"
- [ ] "Continue with Google" option visible
- [ ] Other wallet options visible (MetaMask, etc.)

#### Google Login
- [ ] Click "Continue with Google"
- [ ] Google OAuth popup opens
- [ ] Sign in with your Gmail
- [ ] Popup closes automatically

#### Header (Signed In)
- [ ] Wallet address displayed (format: `0x1234...5678`)
- [ ] Green pulsing dot indicator visible
- [ ] "Disconnect" button visible
- [ ] On mobile: address shows below buttons

#### Functionality
- [ ] Click "Disconnect" - logs out properly
- [ ] Refresh page - wallet stays connected
- [ ] Play a game - wallet address sent to backend
- [ ] Check leaderboard - wallet address visible

---

## Console Checks

Open browser DevTools (F12) → Console

### Should NOT see:
- ❌ "Client ID not found"
- ❌ "Failed to connect wallet"
- ❌ React errors
- ❌ Network errors from ThirdWeb

### Should see:
- ✅ "ThirdWeb SDK loaded"
- ✅ Wallet connection logs (if enabled)
- ✅ No errors

---

## Network Checks

Open DevTools → Network tab

### When clicking "Sign In":
- ✅ Requests to ThirdWeb API
- ✅ OAuth redirect (if using Google)
- ✅ Successful responses (200 OK)

### When connected:
- ✅ Wallet address available in console
- ✅ Account object populated

---

## Code Verification

### Check ThirdWeb Client
```typescript
// src/lib/thirdweb.ts should have:
import { createThirdwebClient } from 'thirdweb'
export const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID
})
```

### Check Header Component
```typescript
// src/components/Header.tsx should have:
import { useActiveAccount } from 'thirdweb/react'
const account = useActiveAccount()
// Display: {account.address}
```

### Check Main App
```typescript
// src/main.tsx should have:
import { ThirdwebProvider } from 'thirdweb/react'
<ThirdwebProvider>
  <App />
</ThirdwebProvider>
```

---

## Troubleshooting

### Problem: "Sign In" button doesn't appear
**Check:**
1. Is `Header.tsx` imported in `App.tsx`?
2. Run: `npm list thirdweb` - is it installed?
3. Clear cache: `rm -rf node_modules .vite && npm install`

### Problem: Click "Sign In" but nothing happens
**Check:**
1. Browser console for errors
2. Is Client ID set in `.env`?
3. Run: `cat .env | grep VITE_THIRDWEB_CLIENT_ID`

### Problem: Google login option not showing
**Check:**
1. ThirdWeb Dashboard → Embedded Wallets
2. Is Google enabled?
3. Is domain whitelisted (if in production)?

### Problem: Wallet connects but address doesn't show
**Check:**
1. `useActiveAccount()` hook working?
2. Run in browser console: `localStorage` - see wallet data?
3. React DevTools - check component state

---

## Integration Test

Test the full user flow:

```typescript
// Test Script (run in browser console)
console.log('Testing Wallet Integration...')

// 1. Check if ThirdWeb is loaded
if (window.thirdweb) {
  console.log('✅ ThirdWeb loaded')
} else {
  console.error('❌ ThirdWeb not loaded')
}

// 2. Check for active account (after signing in)
// This will be available via React hooks, not window
console.log('Check Header component for wallet address')

// 3. Verify localStorage
const hasWalletData = Object.keys(localStorage).some(
  key => key.includes('thirdweb') || key.includes('wallet')
)
console.log(hasWalletData ? '✅ Wallet data in localStorage' : '❌ No wallet data')
```

---

## Performance Test

### Load Time
```bash
# Build for production
npm run build

# Measure bundle size
ls -lh dist/assets/*.js

# Expected: Main bundle < 500KB gzipped
```

### Runtime Performance
- [ ] Page loads in < 2 seconds
- [ ] Sign in modal opens instantly
- [ ] OAuth popup < 1 second
- [ ] Wallet connection < 500ms
- [ ] No layout shift after connection

---

## Security Verification

### Client-Side
- [ ] Client ID not exposed in bundle (it's public anyway)
- [ ] No private keys in frontend code
- [ ] HTTPS only in production
- [ ] Secure localStorage usage

### Network
- [ ] All API calls over HTTPS
- [ ] OAuth redirects to trusted domains
- [ ] CORS configured properly
- [ ] No sensitive data in URLs

---

## Production Readiness

Before deploying:

- [ ] Get production ThirdWeb Client ID
- [ ] Configure production domain in ThirdWeb
- [ ] Enable rate limiting
- [ ] Set up monitoring
- [ ] Test on real devices (iOS/Android)
- [ ] Verify mobile browsers (Safari, Chrome)
- [ ] Test slow 3G connection
- [ ] Check accessibility (screen readers)

---

## Success Criteria

✅ **All these should work:**
1. User can click "Sign In"
2. Google login option appears
3. OAuth completes successfully
4. Wallet address displays in header
5. Disconnect works properly
6. Wallet persists on refresh
7. Games can access wallet address
8. Leaderboard shows wallet
9. Mobile layout works
10. No console errors

---

## Next Steps After Testing

Once all tests pass:

1. **Commit Changes**
   ```bash
   git add .
   git commit -m "✨ Add Gmail social login with ThirdWeb"
   ```

2. **Deploy Frontend**
   - Update production env vars
   - Deploy to Vercel/Netlify
   - Test in production

3. **Enable Features**
   - Token rewards
   - NFT achievements
   - On-chain leaderboard

---

**All tests passing? You're ready to go! 🎉**

For issues, see:
- `QUICK_START_WALLET.md` - Quick fixes
- `THIRDWEB_SETUP.md` - Detailed guide
- Console errors - Usually most helpful!

























