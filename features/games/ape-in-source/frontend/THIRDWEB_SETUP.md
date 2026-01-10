# 🔐 ThirdWeb Gmail Social Login Setup

## Quick Setup Guide

### 1. Get Your ThirdWeb Client ID

1. Go to [ThirdWeb Dashboard](https://thirdweb.com/dashboard)
2. Sign in or create an account
3. Click "Create API Key" or "Settings"
4. Copy your **Client ID**

### 2. Configure Environment Variables

Create a `.env` file in the `frontend/` directory:

```bash
cd frontend
cp .env.example .env
```

Edit `.env` and add your Client ID:

```env
VITE_THIRDWEB_CLIENT_ID=your_actual_client_id_here
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

### 3. Enable Social Login in ThirdWeb Dashboard

1. Go to your ThirdWeb Dashboard
2. Select your project/API key
3. Navigate to **"Embedded Wallets"** or **"In-App Wallets"**
4. Enable **"Google"** authentication
5. Configure OAuth settings if needed

### 4. Test the Integration

Start your frontend:

```bash
npm run dev
```

Visit `http://localhost:3000` and you should see:
- **"Sign In"** button in the header
- Click it to see social login options
- **"Continue with Google"** should appear
- After signing in, your wallet address displays in the header

---

## Features Implemented

### ✅ Gmail Social Login
- Users can sign in with their Google account
- No need to manage private keys
- Secure embedded wallet created automatically

### ✅ Multiple Wallet Options
- **Google** - Sign in with Gmail
- **Email** - Magic link authentication
- **Passkey** - Biometric authentication
- **MetaMask** - Browser extension wallet
- **Coinbase Wallet** - Mobile/browser wallet
- **Rainbow** - Mobile wallet

### ✅ Wallet Address Display
- Shows connected wallet address in header
- Formatted as `0x1234...5678`
- Green indicator when connected
- Mobile-responsive design

### ✅ Disconnect Functionality
- Clean disconnect button
- Clears session properly
- Returns to sign-in state

---

## Code Structure

### `/frontend/src/lib/thirdweb.ts`
ThirdWeb client and wallet configuration:
```typescript
import { createThirdwebClient } from 'thirdweb'
import { inAppWallet } from 'thirdweb/wallets'

export const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
})

export const wallet = inAppWallet({
  auth: {
    options: ['google', 'email', 'passkey'],
  },
})
```

### `/frontend/src/components/Header.tsx`
Header with sign-in button and wallet display:
```typescript
import { ConnectButton, useActiveAccount } from 'thirdweb/react'
import { client, wallet } from '../lib/thirdweb'

// Get connected account
const account = useActiveAccount()

// Display wallet address
{account && (
  <div>{formatAddress(account.address)}</div>
)}
```

### `/frontend/src/main.tsx`
ThirdWeb provider wrapper:
```typescript
import { ThirdwebProvider } from 'thirdweb/react'

<ThirdwebProvider>
  <App />
</ThirdwebProvider>
```

---

## How Users Sign In

### Step 1: Click "Sign In" Button
User clicks the gradient "Sign In" button in the header.

### Step 2: Choose Login Method
Modal appears with options:
- 🌐 **Continue with Google**
- ✉️ **Continue with Email**
- 🔑 **Continue with Passkey**
- 🦊 **MetaMask**
- 💼 **Coinbase Wallet**
- 🌈 **Rainbow**

### Step 3: Authenticate
For Google login:
1. User selects "Continue with Google"
2. Google OAuth popup appears
3. User signs in with Gmail account
4. Popup closes automatically

### Step 4: Wallet Created
- Embedded wallet automatically created
- Wallet address generated
- User is now connected

### Step 5: Address Displayed
- Wallet address appears in header
- Green dot indicates active connection
- User can now play games with wallet

---

## Security Features

### 🔒 Embedded Wallet Security
- Private keys never leave ThirdWeb infrastructure
- Keys encrypted and managed securely
- No user responsibility for key management

### 🔐 OAuth Security
- Standard OAuth 2.0 flow
- Secure token exchange
- No passwords stored locally

### 🛡️ Session Management
- Secure session storage
- Auto-logout on disconnect
- CSRF protection built-in

---

## Integration with Game Logic

### Wallet Address in Game
When a user plays a game, their wallet address is sent to the backend:

```typescript
const game = await gameAPI.createGame(
  mode,
  playerName,
  account.address  // Wallet address included
)
```

### Leaderboard Integration
Leaderboard entries are linked to wallet addresses:

```typescript
{
  playerName: "Player",
  walletAddress: "0x1234...5678",
  totalWins: 10,
  highScore: 150
}
```

### Benefits
- ✅ Unique player identification
- ✅ Persistent stats across sessions
- ✅ Ready for token rewards
- ✅ NFT integration possible

---

## Customization Options

### Change Login Options

Edit `frontend/src/lib/thirdweb.ts`:

```typescript
export const wallet = inAppWallet({
  auth: {
    options: [
      'google',      // Gmail login
      'facebook',    // Facebook login
      'apple',       // Apple ID login
      'email',       // Email magic link
      'phone',       // SMS authentication
      'passkey',     // Biometric
    ],
  },
})
```

### Change Button Text

Edit `frontend/src/components/Header.tsx`:

```typescript
<ConnectButton
  connectButton={{
    label: 'Connect Wallet',  // Change button text
  }}
  connectModal={{
    title: 'Sign In to Ape In!',  // Change modal title
  }}
/>
```

### Change Theme

```typescript
<ConnectButton
  theme="light"  // or "dark"
/>
```

---

## Troubleshooting

### "Client ID not found"
**Problem**: Missing or invalid Client ID

**Solution**:
1. Check `.env` file exists in `frontend/`
2. Verify `VITE_THIRDWEB_CLIENT_ID` is set
3. Restart dev server after changing `.env`

### "Google login not available"
**Problem**: Google OAuth not enabled

**Solution**:
1. Go to ThirdWeb Dashboard
2. Enable Google in Embedded Wallets settings
3. Configure OAuth redirect URLs if needed

### Wallet not connecting
**Problem**: Connection fails silently

**Solution**:
1. Check browser console for errors
2. Verify Client ID is correct
3. Try clearing browser cache
4. Check ThirdWeb dashboard for API limits

### Address not displaying
**Problem**: Wallet connects but address doesn't show

**Solution**:
1. Check `useActiveAccount()` is working
2. Verify Header component is re-rendering
3. Check console for React errors

---

## Testing Checklist

- [ ] "Sign In" button appears in header
- [ ] Clicking button opens modal
- [ ] "Continue with Google" option appears
- [ ] Google login popup works
- [ ] Wallet address displays after login
- [ ] Address is properly formatted
- [ ] Green indicator shows when connected
- [ ] "Disconnect" button appears
- [ ] Disconnect works properly
- [ ] Mobile view displays correctly
- [ ] Wallet persists on page refresh

---

## Next Steps

### 🎮 For Gaming
- User wallet addresses are now saved with game stats
- Leaderboard entries are wallet-based
- Ready for multiplayer matchmaking

### 💰 For Blockchain Features
- Ready to integrate token rewards
- Can mint NFT achievements
- Smart contract interactions possible
- On-chain leaderboard ready

### 🚀 For Production
- Get production ThirdWeb Client ID
- Configure production OAuth settings
- Set up proper domain whitelisting
- Enable rate limiting

---

## Resources

- [ThirdWeb Documentation](https://portal.thirdweb.com/)
- [ThirdWeb React SDK](https://portal.thirdweb.com/react)
- [Embedded Wallets Guide](https://portal.thirdweb.com/wallets/embedded-wallet)
- [Social Login Setup](https://portal.thirdweb.com/wallets/embedded-wallet/how-to/enable-social-login)

---

**🎉 Your game now has secure, user-friendly wallet authentication!**

























