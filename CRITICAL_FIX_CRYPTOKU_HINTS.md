# 🔴 CRITICAL FIX: Missing cryptoku_hints Table

## Issue Found

**Error:** `relation "cryptoku_hints" does not exist`

**Root Cause:** The `cryptoku_hints` table was never created in your Supabase database, even though:
- ✅ The migration file exists: `20260117010000_create_cryptoku_hints_table.sql`
- ✅ The function `ensure_cryptoku_hints` exists and tries to use the table
- ❌ The table itself doesn't exist

## Impact

This breaks:
- ❌ Cryptoku hints system
- ❌ Hint rewards on game completion
- ❌ Hint purchases
- ❌ Any code that calls `ensure_cryptoku_hints`, `use_cryptoku_hint`, `reward_cryptoku_hint`, or `purchase_cryptoku_hints`

## Fix

### Option 1: Run the Full Migration (Recommended)

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of: `supabase/migrations/20260117010000_create_cryptoku_hints_table.sql`
3. Paste and run it
4. This will create the table AND update all functions

### Option 2: Quick Fix Script

1. Open Supabase Dashboard → SQL Editor
2. Copy and run: `FIX_MISSING_CRYPTOKU_HINTS_TABLE.sql`
3. This creates just the table (functions already exist)

## Verification

After running the fix, verify:

```sql
-- Check table exists
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'cryptoku_hints';
-- Should return: 1

-- Check columns
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'cryptoku_hints'
ORDER BY ordinal_position;
-- Should show: id, user_id, hint_balance, total_ranked_completed, created_at, updated_at

-- Test function
SELECT ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1));
-- Should return: (no error)
```

## Why This Happened

The migration `20260117010000_create_cryptoku_hints_table.sql` was created but never run in your Supabase database. This can happen if:
- Migration wasn't applied via Supabase CLI
- Migration wasn't run manually in SQL Editor
- Migration was skipped or failed silently

## Next Steps

1. **Run the fix** (Option 1 or 2 above)
2. **Verify the table exists** (use verification queries)
3. **Test the functions** (run `QUICK_TEST_FUNCTIONS.sql` again)
4. **Check for other missing tables** - Run the full verification script again

## Related Issues

After fixing this, also check:
- ✅ `cryptoku_leaderboard` table exists (should be OK based on earlier checks)
- ✅ `leaderboard` table exists (should be OK based on earlier checks)
- ✅ All functions can access their tables (test after creating table)
