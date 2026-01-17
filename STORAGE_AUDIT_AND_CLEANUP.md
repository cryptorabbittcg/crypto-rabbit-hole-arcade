# Complete Storage Audit and Cleanup

## 🔍 The Problem

After logout, profile data persists showing:
- Username: "George"
- Points: 1044
- Member since: January 2026
- Primary Wallet: Glyph (Not connected)

**Root Cause:** 
1. `logout()` doesn't reset profile state
2. `arcade_profile_{wallet_address}` localStorage key persists (by design)
3. Profile state is not cleared when wallet disconnects

---

## 📋 Storage Keys Audit

### Active Storage Keys Found:

1. **`arcade_profile_{wallet_address}`** (lib/profile-storage.ts)
   - Stores: username, avatar, points, tickets, stats
   - **NOT cleared on logout** (intentionally preserved)

2. **`crypto_rabbit_session`** (lib/game-session.ts)
   - Stores: userId, username, address, points, tickets
   - **CLEARED on logout** ✅

3. **`crypto_rabbit_point_updates`** (lib/game-session.ts)
   - Stores: pending point updates from games
   - **CLEARED on logout** ✅

4. **`arcade_auth_address`** (lib/auth.ts)
   - Stores: authenticated wallet address
   - **CLEARED on logout** ✅

5. **Game-specific keys:**
   - `cryptoku_hints_{user_id}` (lib/supabase/services/cryptoku-hints.service.ts)
   - `ape_in_free_plays_{user_id}` (lib/supabase/services/ape-in-free-plays.service.ts)
   - `cryptoku_state_{user_id}` (lib/cryptoku-store.ts)
   - These persist across sessions

---

## ✅ Fixes Applied

### 1. **Reset Profile State on Logout**

**File:** `components/providers.tsx`

**Before:**
```typescript
const logout = useCallback(() => {
  logger.log("[v0] Logging out user")
  setIsAuthenticated(false)
  setAuthToken(null)
  setAddress(null)
  setIsConnected(false)
  setApeBalance("0.0000")
  clearAuthToken()
  clearGameSession()
  // ❌ Profile state NOT reset!
}, [])
```

**After:**
```typescript
const logout = useCallback(() => {
  logger.log("[v0] Logging out user")
  setIsAuthenticated(false)
  setAuthToken(null)
  setAddress(null)
  setIsConnected(false)
  setApeBalance("0.0000")
  setPoints(0) // ✅ Reset points
  setTickets(0) // ✅ Reset tickets
  // ✅ Reset profile to default Guest state
  setProfile({
    username: "Guest",
    avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Artboard-1-83QWedD6ivnkXqy5WoMh05oLPpdMO6.png",
    referralCode: "RABBIT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    referralCount: 0,
    referralEarnings: 0,
    joinedAt: new Date(),
    stats: {
      gamesPlayed: 0,
      totalScore: 0,
      achievements: [],
    },
  })
  clearAuthToken()
  clearGameSession()
  // ✅ Optionally clear profile from localStorage (uncomment if needed)
  // if (address) {
  //   const { clearProfileByAddress } = require("@/lib/profile-storage")
  //   clearProfileByAddress(address)
  // }
}, [])
```

### 2. **Also Reset on Disconnect**

**File:** `components/providers.tsx`

Updated `disconnect` to also reset profile state when not authenticated.

---

## 🧹 Manual Cleanup Script

Run this in browser console to clear ALL storage:

```javascript
// Complete Storage Cleanup
(function() {
  console.log('🧹 Starting complete storage cleanup...');
  
  // Clear all localStorage keys starting with known prefixes
  const prefixes = [
    'arcade_profile_',
    'crypto_rabbit_session',
    'crypto_rabbit_point_updates',
    'arcade_auth_address',
    'cryptoku_hints_',
    'ape_in_free_plays_',
    'cryptoku_state_',
  ];
  
  // Clear known keys
  prefixes.forEach(prefix => {
    if (prefix.endsWith('_')) {
      // For prefixed keys, find all matching keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
          console.log(`✅ Removed: ${key}`);
        }
      });
    } else {
      // For exact keys
      if (localStorage.getItem(prefix)) {
        localStorage.removeItem(prefix);
        console.log(`✅ Removed: ${prefix}`);
      }
    }
  });
  
  // Clear sessionStorage
  sessionStorage.clear();
  console.log('✅ Cleared sessionStorage');
  
  // Show remaining keys (for debugging)
  const remaining = Object.keys(localStorage);
  console.log('📋 Remaining localStorage keys:', remaining.length > 0 ? remaining : 'None');
  
  console.log('✅ Cleanup complete! Refresh the page.');
})();
```

---

## 🎯 Testing Steps

1. **Logout**
   - Click logout
   - Profile should reset to "Guest"
   - Points should be 0
   - No username should show

2. **Disconnect**
   - Click disconnect
   - Same as logout

3. **Manual Cleanup**
   - Run cleanup script in console
   - Refresh page
   - All storage should be cleared

---

## 📝 Summary

**Issues Fixed:**
- ✅ Profile state now resets on logout
- ✅ Points reset to 0 on logout
- ✅ Tickets reset to 0 on logout
- ✅ Username resets to "Guest" on logout

**Storage Behavior:**
- `arcade_profile_{wallet_address}` still persists (by design for profile persistence)
- When user reconnects with same wallet, profile can be restored
- But on logout, UI shows default "Guest" state

**If you want complete profile deletion on logout:**
- Uncomment the `clearProfileByAddress` call in logout function
- This will remove profile from localStorage entirely
