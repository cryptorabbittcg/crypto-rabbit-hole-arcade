# 🚀 Quick Start: Gmail Social Login

## Setup (2 Minutes)

### 1. Get ThirdWeb Client ID
```bash
# Visit: https://thirdweb.com/dashboard
# Click "Create API Key" or "Settings"
# Copy your Client ID
```

### 2. Configure Environment
```bash
cd frontend

# Create .env file
echo "VITE_THIRDWEB_CLIENT_ID=your_client_id_here" > .env
echo "VITE_API_URL=http://localhost:8000" >> .env
echo "VITE_WS_URL=ws://localhost:8000" >> .env
```

### 3. Start App
```bash
npm run dev
```

### 4. Test Login
1. Open `http://localhost:3000`
2. Click **"Sign In"** button in header
3. Select **"Continue with Google"**
4. Sign in with your Gmail
5. See your wallet address in header! ✅

---

## What You Get

✅ **Gmail Login** - Sign in with Google  
✅ **Wallet Address** - Displayed in header (e.g., `0x1234...5678`)  
✅ **Green Indicator** - Shows when connected  
✅ **Disconnect Button** - Clean logout  
✅ **Mobile Responsive** - Works on all devices  

---

## Features Included

### Social Login Options
- 🌐 **Google** (Gmail)
- ✉️ **Email** (Magic link)
- 🔑 **Passkey** (Biometric)

### Wallet Options
- 🦊 **MetaMask**
- 💼 **Coinbase Wallet**
- 🌈 **Rainbow**

---

## How It Works

```typescript
// User clicks "Sign In"
→ Modal opens with login options
→ User selects "Continue with Google"
→ Google OAuth popup
→ Sign in with Gmail
→ Embedded wallet created
→ Wallet address displayed in header!
```

---

## Files Modified

- ✅ `src/components/Header.tsx` - Sign in button + wallet display
- ✅ `src/lib/thirdweb.ts` - ThirdWeb client configuration
- ✅ `src/main.tsx` - ThirdWeb provider setup
- ✅ `src/pages/GamePage.tsx` - Wallet integration
- ✅ `src/index.css` - Custom button styling
- ✅ `.env.example` - Environment template

---

## Troubleshooting

**Button doesn't appear?**
```bash
# Check if ThirdWeb is installed
npm list thirdweb

# If not, install it
npm install thirdweb@latest
```

**"Client ID not found" error?**
```bash
# 1. Check .env file exists
ls -la frontend/.env

# 2. Verify VITE_THIRDWEB_CLIENT_ID is set
cat frontend/.env

# 3. Restart dev server
npm run dev
```

**Google login not working?**
1. Go to ThirdWeb Dashboard
2. Navigate to "Embedded Wallets"
3. Enable "Google" authentication
4. Save settings

---

## Production Checklist

- [ ] Get production ThirdWeb Client ID
- [ ] Enable Google OAuth in dashboard
- [ ] Configure OAuth redirect URLs
- [ ] Set production domain whitelist
- [ ] Test on mobile devices
- [ ] Verify disconnect works
- [ ] Test wallet persistence

---

**Done! Your users can now sign in with Gmail!** 🎉

For detailed docs, see: `THIRDWEB_SETUP.md`

























