# Clear Browser Cache for Points

## 🔍 The Problem

Points are cached in browser storage (`localStorage` and `sessionStorage`), so even though the database has 0 points, the browser still shows 1044.

## ✅ Solution: Clear Browser Storage

### Option 1: Browser Console (Quickest)

Open your browser console (F12) and run:

```javascript
// Clear game session (contains points)
localStorage.removeItem('crypto_rabbit_session')
sessionStorage.removeItem('crypto_rabbit_session')

// Clear point updates
localStorage.removeItem('crypto_rabbit_point_updates')

// Clear all profile storage (if exists)
const profileKeys = Object.keys(localStorage).filter(key => key.startsWith('profile_'))
profileKeys.forEach(key => localStorage.removeItem(key))

console.log('✅ Browser cache cleared! Refresh the page.')
```

Then **refresh the page** (F5 or Ctrl+R).

---

### Option 2: Clear All Storage

If you want to clear everything:

```javascript
// Clear all localStorage and sessionStorage
localStorage.clear()
sessionStorage.clear()

console.log('✅ All browser storage cleared! Refresh the page.')
```

Then **refresh the page**.

---

### Option 3: Browser DevTools

1. Open DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Local Storage** → your domain
4. Delete these keys:
   - `crypto_rabbit_session`
   - `crypto_rabbit_point_updates`
   - Any keys starting with `profile_`
5. Click **Session Storage** → your domain
6. Delete `crypto_rabbit_session`
7. **Refresh the page**

---

## 🧪 Verify Database Has 0 Points

First, verify the database actually has 0 points:

```sql
SELECT wallet_address, points, ape_balance, tickets
FROM profiles
ORDER BY points DESC
LIMIT 5;
```

All `points` should be 0.

---

## 🔄 After Clearing Cache

1. **Refresh the page** (F5)
2. The app will:
   - Load fresh data from Supabase (points = 0)
   - Update localStorage with new session (points = 0)
   - Display 0 points in header and profile page

---

## 🐛 If Still Showing 1044

If points still show 1044 after clearing cache and refreshing:

1. **Hard refresh**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. **Clear browser cache**: Settings → Clear browsing data → Cached images and files
3. **Check database again**: Run the SQL query above
4. **Check profile sync**: The app should sync from Supabase on page load

---

## 📝 What Gets Stored in Browser

- `crypto_rabbit_session` - Contains points, tickets, username, address
- `crypto_rabbit_point_updates` - Pending point updates from games
- `profile_{wallet_address}` - Legacy profile storage (if exists)

All of these should be cleared to see fresh data from the database.
