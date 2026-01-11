# Reset All Stats for Testing

This guide explains how to reset all game stats and scores for testing purposes.

## Overview

When you want a clean slate to test the new points system, you need to reset data in three places:
1. **Supabase Database** - SQL script
2. **Vercel KV Store** - API endpoint or manual deletion
3. **Browser LocalStorage** - Manual clearing

---

## Step 1: Reset Database (Supabase)

### Option A: Use SQL Script (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `scripts/07-reset-all-stats-for-testing.sql`
4. Click **Run** to execute

This will:
- Reset all `points` to 0 in `profiles`
- Reset all game stats (games played, wins, losses, streaks, playtime) to 0
- Reset all leaderboard scores to 0
- Keep user accounts, balances (APE, tickets), and referral data intact

### Option B: Manual Reset via SQL

If you want more control, you can run these individually:

```sql
-- Reset profile stats
UPDATE profiles SET points = 0, total_games_played = 0, total_wins = 0, 
  total_losses = 0, win_streak = 0, best_win_streak = 0, total_playtime = 0;

-- Reset leaderboard
UPDATE leaderboard SET total_points = 0, card_battle_wins = 0, 
  ape_in_high_score = 0, cryptoku_high_score = 0, overall_rank = NULL;
```

### Optional: Clear Game History

If you also want to delete game session history:

```sql
DELETE FROM game_sessions;
DELETE FROM transactions WHERE currency = 'points';
```

**Note:** This will delete all historical game data. Use with caution.

---

## Step 2: Reset Vercel KV Store (Cryptoku Data)

Cryptoku stores stats, hints, and leaderboard data in Vercel KV (Redis). You need to clear this data.

### Option A: Create an Admin API Route (Recommended)

Create a new API route at `app/api/admin/reset-kv/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { kv } from "@vercel/kv"

export async function POST(request: NextRequest) {
  try {
    // Verify admin access (add authentication here)
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all Cryptoku keys
    const keys = await kv.keys("cryptoku:*")
    
    // Delete all Cryptoku keys
    if (keys.length > 0) {
      await kv.del(...keys)
    }

    return NextResponse.json({ 
      success: true, 
      deleted: keys.length,
      message: `Deleted ${keys.length} Cryptoku keys from KV store` 
    })
  } catch (error) {
    console.error("Error resetting KV store:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

Then call it with:
```bash
curl -X POST https://your-domain.com/api/admin/reset-kv \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

### Option B: Manual Vercel KV Deletion

1. Go to your Vercel project dashboard
2. Navigate to **Storage** → **KV**
3. Use the Vercel CLI or dashboard to delete keys matching `cryptoku:*`

Using Vercel CLI:
```bash
vercel kv --version  # Make sure you have KV CLI
vercel kv keys "cryptoku:*"  # List all Cryptoku keys
# Then delete them manually or use a script
```

### Option C: Clear In-Memory Cache (Development Only)

If you're using the in-memory fallback (when KV is not configured), restart your development server to clear the cache.

---

## Step 3: Clear Browser LocalStorage

Users need to clear their browser's localStorage to remove client-side cached stats.

**Note:** Before Supabase integration, points and game data were stored in localStorage. Even though you're now using Supabase, these legacy keys may still exist and could interfere with testing.

### For Testing (Your Browser)

1. Open browser DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Expand **Local Storage**
4. Find your domain (e.g., `localhost:3000` or your production domain)
5. Delete these keys:

**Legacy Pre-Supabase Storage Keys:**
   - `crypto_rabbit_session` - Game session data (points, tickets, user info)
   - `crypto_rabbit_point_updates` - Queue of point updates from games
   - `arcade_profile_{your_address}` - Profile data by wallet address (points, tickets, stats)

**Cryptoku Keys:**
   - `cryptoku-player-stats` - Cryptoku player stats
   - `cryptoku-game-sessions` - Cryptoku game sessions
   - `cryptoku_rht_balance_{your_address}` - Cryptoku RHT balance
   - `cryptoku_hints_{address}` - Cryptoku hints data (resets to 3 free hints)

**Ape In Keys:**
   - `dailyFreePlays_{address}` - Ape In daily free games (resets to 5 free plays per mode)
   - Any other keys starting with `ape-in` or containing `ape_in`

### Quick JavaScript Console Method

Open browser console and run:

```javascript
// Clear all game-related localStorage (comprehensive)
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (
    key.startsWith('cryptoku') || 
    key.startsWith('crypto_rabbit') ||
    key.startsWith('arcade_profile') ||
    key.startsWith('dailyFreePlays') ||  // Ape In free games
    key.includes('ape-in') ||
    key.includes('ape_in')
  )) {
    keysToRemove.push(key);
  }
}
keysToRemove.forEach(key => localStorage.removeItem(key));
console.log('Cleared keys:', keysToRemove);
console.log(`✅ Removed ${keysToRemove.length} localStorage keys`);
console.log('Note: Cryptoku hints will reset to 3 free hints when you next play');
console.log('Note: Ape In free games will reset to 5 free plays per mode when you next play');
```

**Or clear everything (nuclear option):**
```javascript
localStorage.clear();
sessionStorage.clear(); // Also clear sessionStorage
console.log('✅ Cleared all localStorage and sessionStorage');
```

---

## Complete Reset Checklist

- [ ] Run SQL script to reset database stats (points, tickets, game stats, leaderboard)
- [ ] Clear Vercel KV store (Cryptoku hints and stats)
- [ ] Clear browser localStorage (including Cryptoku hints and Ape In free games)
- [ ] Restart development server (if using in-memory cache)
- [ ] Verify points are at 0 in the UI
- [ ] Verify leaderboard is empty/reset
- [ ] Verify Cryptoku hints reset to 3 (check on next game start)
- [ ] Verify Ape In free games reset to 5 per mode (check on next game start)
- [ ] Test a game to ensure new points system works

---

## Verification Queries

After resetting, verify with these SQL queries:

```sql
-- Check profile stats
SELECT wallet_address, points, total_games_played, total_wins, total_losses 
FROM profiles;

-- Check leaderboard
SELECT user_id, total_points, cryptoku_high_score, ape_in_high_score 
FROM leaderboard;

-- Check game sessions count
SELECT COUNT(*) as total_sessions FROM game_sessions;
```

All should show 0 values (except user_id/wallet_address which should remain).

---

## Notes

- **APE Balance & Tickets**: The reset script preserves these by default. If you want to reset them too, uncomment the relevant lines in the SQL script.
- **Referral Data**: Also preserved by default. Uncomment if you want to reset.
- **Game History**: Optional deletion. Keep it if you want to see past games, delete if you want a completely clean slate.
- **Production**: Never run this in production! Only use in development/testing environments.

---

## Troubleshooting

**Stats still showing after reset?**
- Make sure you cleared localStorage in your browser
- Check if KV store was cleared (if using Vercel KV)
- Restart your development server
- Clear browser cache

**KV reset not working?**
- Verify KV environment variables are set
- Check Vercel KV dashboard for keys
- Make sure you're using the correct key patterns (`cryptoku:*`)

**Database reset not working?**
- Check RLS policies (you may need to use service_role key)
- Verify you're connected to the correct database
- Check for foreign key constraints that might prevent updates

