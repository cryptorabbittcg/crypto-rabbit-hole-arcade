# Setup Complete - Next Steps

## ✅ What's Working

1. ✅ **`cryptoku_leaderboard` table** - Created (11 columns)
2. ✅ **`add_cryptoku_leaderboard_entry` function** - Created with SECURITY DEFINER
3. ✅ **`get_cryptoku_leaderboard` function** - Created with SECURITY DEFINER
4. ✅ **`get_leaderboard` function** - Working (returns data)

## ⚠️ Remaining Steps

### Step 1: Update get_leaderboard to Return win_streak

**If `total_wins` and `win_streak` are showing 0**, you need to run:

**File:** `FIX_LEADERBOARD_DISPLAYS.sql`

This will:
- Add `win_streak` to the return type
- Update the SELECT to include `p.win_streak`

**To Check:**
Run `VERIFY_COMPLETE_SETUP.sql` and check the "get_leaderboard function" row - it should say "✅ Returns win_streak"

---

### Step 2: Check if Profiles Have Wins/Streak Data

The test shows `total_wins: 0` and `win_streak: 0`. This could mean:

1. **Profiles actually have 0 wins** (no games won yet)
2. **Function wasn't updated** (run `FIX_LEADERBOARD_DISPLAYS.sql`)

**To Check:**
```sql
SELECT wallet_address, total_wins, win_streak, total_games_played
FROM profiles
WHERE wallet_address IN (
  '0x1234567890123456789012345678901234567890',
  '0x431e3ca238fe4af6de90078f0acd688ff19f2968'
);
```

If `total_games_played > 0` but `total_wins = 0`, then wins aren't being recorded when games complete.

---

### Step 3: Test Cryptoku Leaderboard

Now that the table and functions exist:

1. **Play a Cryptoku game** (DEGEN or APE mode)
2. **Complete it** (don't forfeit)
3. **Check leaderboard:**
   - Go to `/leaderboard` → Cryptoku tab
   - Should show your entry
   - Switch between DEGEN and APE modes

**To Verify Data:**
```sql
-- Check if entries exist
SELECT COUNT(*) FROM cryptoku_leaderboard
WHERE completed = TRUE AND forfeited = FALSE AND mode IN ('DEGEN', 'APE');

-- Test the function
SELECT * FROM get_cryptoku_leaderboard('DEGEN', 10);
```

---

## 🧪 Complete Verification

Run `VERIFY_COMPLETE_SETUP.sql` to check:
- ✅ Function returns win_streak
- ✅ Profiles have wins/streak data
- ✅ Cryptoku leaderboard has entries
- ✅ All functions have SECURITY DEFINER

---

## 📋 Summary

**Fixed:**
- ✅ Cryptoku leaderboard table created
- ✅ Cryptoku leaderboard functions created
- ✅ Functions have SECURITY DEFINER

**To Do:**
- ⚠️ Run `FIX_LEADERBOARD_DISPLAYS.sql` (if win_streak still missing)
- ⚠️ Verify profiles have wins/streak data
- ⚠️ Test Cryptoku leaderboard by playing a game

**Expected Results:**
- Overall leaderboard shows wins/streak (after running FIX_LEADERBOARD_DISPLAYS.sql)
- Cryptoku leaderboard shows entries (after playing a game)
- Points display correctly (already working)

---

## 🎯 Quick Test

1. **Run:** `VERIFY_COMPLETE_SETUP.sql`
2. **Check:** All items should be ✅
3. **If win_streak missing:** Run `FIX_LEADERBOARD_DISPLAYS.sql`
4. **Play a game:** Complete a DEGEN or APE Cryptoku game
5. **Check leaderboard:** Should show your entry

Everything should be working now! 🎉
