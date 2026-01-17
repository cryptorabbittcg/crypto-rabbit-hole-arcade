# Fix Points Cache Issue

## 🔍 Problem

Points show 1044 in header/profile even though database has 0 points.

**Root Cause:**
- Points are cached in `localStorage` (`crypto_rabbit_session`)
- Frontend loads from `localStorage` **before** syncing from Supabase
- Old cached value (1044) overwrites fresh database value (0)

## ✅ Solution

### Step 1: Clear Browser Cache

**Quick Method - Browser Console:**

1. Open browser console (F12)
2. Copy and paste this code:
```javascript
localStorage.removeItem('crypto_rabbit_session')
sessionStorage.removeItem('crypto_rabbit_session')
localStorage.removeItem('crypto_rabbit_point_updates')
console.log('✅ Cache cleared! Refresh the page.')
```
3. **Refresh the page** (F5)

**Or use the script:** `CLEAR_BROWSER_CACHE_SCRIPT.js`

---

### Step 2: Verify Database

Run this SQL to verify database has 0 points:

```sql
SELECT wallet_address, points 
FROM profiles 
ORDER BY points DESC 
LIMIT 5;
```

All points should be 0.

---

### Step 3: Code Fix (Already Applied)

Fixed bug in `hooks/use-profile-sync.ts`:
- **Before:** `setPoints(supabaseProfile.ape_balance)` ❌
- **After:** `setPoints((supabaseProfile as any).points || 0)` ✅

This ensures points are loaded from the correct field.

---

## 🔄 What Happens After Clear

1. **Clear browser cache** (Step 1)
2. **Refresh page** (F5)
3. App loads:
   - ❌ No localStorage session (cleared)
   - ✅ Syncs from Supabase (points = 0)
   - ✅ Updates localStorage with fresh data (points = 0)
   - ✅ Displays 0 points in header/profile

---

## 🐛 If Still Showing 1044

1. **Hard refresh:** Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. **Clear all cache:** Browser Settings → Clear browsing data → All time
3. **Check console logs:** Should see "📊 Loading points from database: 0"
4. **Verify database again:** Run SQL query above

---

## 📝 Files Fixed

1. ✅ `hooks/use-profile-sync.ts` - Fixed to use `points` field instead of `ape_balance`
2. ✅ `components/providers.tsx` - Already correctly uses `points` field (line 267)

---

## 🎯 Summary

1. ✅ Database has 0 points (verified)
2. ✅ Code fixed to read `points` field correctly
3. ⚠️ **You need to clear browser cache** - Run the script above
4. ✅ After refresh, points will show 0

**The cache is the issue - clear it and refresh!**
