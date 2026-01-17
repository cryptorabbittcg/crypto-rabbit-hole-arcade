# Leaderboard & Stats Display Audit

## 🔍 Issues Found

### 1. **Leaderboard Page - Overall Tab**
**Location:** `features/leaderboard/leaderboard-view.tsx` (lines 84-93)

**Problem:**
- Hardcodes `wins: 0` and `streak: 0` even though RPC returns `total_wins`
- Comment says "RPC doesn't return wins in this format" but it DOES return `total_wins`
- `win_streak` is NOT returned by RPC, but it should be

**Current Code:**
```typescript
const entries: LeaderboardEntry[] = scores.map((entry) => ({
  rank: entry.rank,
  address: entry.wallet_address 
    ? `${entry.wallet_address.slice(0, 6)}...${entry.wallet_address.slice(-4)}`
    : "0x0000...0000",
  points: entry.score, // score field contains total_points
  wins: 0, // ❌ HARDCODED - RPC DOES return total_wins!
  streak: 0, // ❌ HARDCODED - RPC doesn't return win_streak (needs fix)
  avatar: undefined,
}))
```

**Fix Needed:**
1. Use `entry.total_wins` from RPC response (if available)
2. Update `get_leaderboard` RPC to return `win_streak` from profiles

---

### 2. **Cryptoku Leaderboard - Empty Display**
**Location:** `features/leaderboard/leaderboard-view.tsx` (lines 132-163)

**Problem:**
- Fetches from `/api/cryptoku/leaderboard` which calls `get_cryptoku_leaderboard` RPC
- RPC should work, but may be filtering incorrectly or not returning data

**Current Code:**
```typescript
const response = await fetch(`/api/cryptoku/leaderboard?mode=${mode}&limit=100`)
const data = await response.json()
const entries: CryptokuLeaderboardEntry[] = data.entries.map((entry: any) => ({
  rank: entry.rank,
  address: entry.address || "0x0000...0000",
  score: entry.score,
  // ...
}))
```

**Fix Needed:**
- Verify `get_cryptoku_leaderboard` RPC is working correctly
- Check if data is being filtered properly (completed=true, forfeited=false)
- Ensure mode filtering works (DEGEN/APE)

---

### 3. **Cryptoku Homepage Leaderboard**
**Location:** `features/games/cryptoku/cryptokugame.tsx` (line 1532)

**Problem:**
- Fetches leaderboard but may not be updating after game completion
- May be using old/cached data

**Current Code:**
```typescript
const response = await fetch(`/api/cryptoku/leaderboard?mode=${mode}&limit=50`)
```

**Fix Needed:**
- Ensure leaderboard refreshes after game completion
- Verify it's using the correct mode (ALL/DEGEN/APE)

---

### 4. **Arcade Hub High Scores**
**Location:** `features/arcade/arcade-hub.tsx` (lines 79-120)

**Problem:**
- Fetches Cryptoku high scores but may not be updating
- Uses `cryptokuHighScoresMode` state which may not be synced

**Current Code:**
```typescript
const response = await fetch(`/api/cryptoku/leaderboard?mode=${cryptokuHighScoresMode}&limit=5`)
```

**Fix Needed:**
- Ensure high scores refresh when mode changes
- Verify data is being displayed correctly

---

### 5. **get_leaderboard RPC Function**
**Location:** `scripts/03-functions.sql` (lines 269-298)

**Problem:**
- Returns `total_wins` from profiles ✅
- Does NOT return `win_streak` from profiles ❌
- Frontend expects `win_streak` but it's not in the response

**Current Function:**
```sql
RETURNS TABLE (
  rank INTEGER,
  user_id UUID,
  username TEXT,
  wallet_address TEXT,
  avatar_url TEXT,
  total_points INTEGER,
  total_wins INTEGER,  -- ✅ Returns this
  card_battle_wins INTEGER
  -- ❌ Missing: win_streak
) AS $$
```

**Fix Needed:**
- Add `win_streak` to return type
- Add `p.win_streak` to SELECT statement

---

## 📋 Files to Fix

### Priority 1: Critical Fixes
1. **`scripts/03-functions.sql`** - Update `get_leaderboard` to return `win_streak`
2. **`features/leaderboard/leaderboard-view.tsx`** - Use `total_wins` from RPC, add `win_streak`

### Priority 2: Verification Fixes
3. **`features/games/cryptoku/cryptokugame.tsx`** - Verify leaderboard refresh
4. **`features/arcade/arcade-hub.tsx`** - Verify high scores refresh
5. **`app/api/cryptoku/leaderboard/route.ts`** - Verify API returns correct data

---

## 🔧 Fix Plan

### Step 1: Fix `get_leaderboard` RPC
- Add `win_streak` to return type
- Add `p.win_streak` to SELECT

### Step 2: Fix Leaderboard View
- Map `total_wins` from RPC response (not hardcode 0)
- Map `win_streak` from RPC response

### Step 3: Verify Cryptoku Leaderboard
- Check `get_cryptoku_leaderboard` RPC is working
- Verify data filtering (completed, forfeited, mode)

### Step 4: Test All Displays
- Overall leaderboard (points, wins, streak)
- Cryptoku leaderboard (all modes)
- Arcade Hub high scores
- Cryptoku homepage leaderboard

---

## 🧪 Testing Checklist

- [ ] Overall leaderboard shows correct wins (not 0)
- [ ] Overall leaderboard shows correct streak (not 0)
- [ ] Cryptoku leaderboard (DEGEN) shows entries
- [ ] Cryptoku leaderboard (APE) shows entries
- [ ] Cryptoku homepage leaderboard updates after game
- [ ] Arcade Hub high scores update correctly
- [ ] Points display correctly in header
- [ ] Stats display correctly in Cryptoku homepage
