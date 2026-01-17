# URGENT: Fix Missing cryptoku_leaderboard Table

## 🔴 Critical Issue

The `cryptoku_leaderboard` table does not exist, causing:
- ❌ `get_cryptoku_leaderboard` function fails
- ❌ Cryptoku leaderboard displays empty
- ❌ Game submissions may fail

## ✅ Solution

Run these SQL scripts **in order** in Supabase SQL Editor:

### Step 1: Create the Table
**File:** `CREATE_CRYPTOKU_LEADERBOARD_TABLE.sql`

This creates:
- `cryptoku_leaderboard` table
- Indexes for performance
- RLS policies
- Update trigger

### Step 2: Create the Functions
**File:** `CREATE_CRYPTOKU_LEADERBOARD_FUNCTIONS.sql`

This creates:
- `add_cryptoku_leaderboard_entry` function
- `get_cryptoku_leaderboard` function
- Both with `SECURITY DEFINER` and proper `search_path`

## 🧪 Verification

After running both scripts, verify:

```sql
-- Check table exists
SELECT COUNT(*) FROM cryptoku_leaderboard;

-- Check functions exist
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN ('add_cryptoku_leaderboard_entry', 'get_cryptoku_leaderboard');

-- Test function (should not error)
SELECT * FROM get_cryptoku_leaderboard('DEGEN', 10);
```

## 📝 Notes

- The table should have been created by migration `20260116094000_create_cryptoku_leaderboard_table.sql`
- If that migration wasn't run, these scripts recreate it
- After creating, game submissions should work and leaderboard should populate

## 🚀 Next Steps

1. ✅ Run `CREATE_CRYPTOKU_LEADERBOARD_TABLE.sql`
2. ✅ Run `CREATE_CRYPTOKU_LEADERBOARD_FUNCTIONS.sql`
3. ✅ Verify table and functions exist
4. ✅ Test by playing a Cryptoku game (DEGEN or APE mode)
5. ✅ Check leaderboard displays entries
