# Step-by-Step Fix for Missing cryptoku_hints Table

## 🔴 Problem
The `cryptoku_hints` table doesn't exist, causing all hint-related functions to fail.

## ✅ Solution: Run These Scripts in Order

### Step 1: Create the Table
**File:** `CREATE_CRYPTOKU_HINTS_TABLE_ONLY.sql`

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `CREATE_CRYPTOKU_HINTS_TABLE_ONLY.sql`
3. Run it
4. **Verify:** Should show "Table created successfully" with column_count = 6

### Step 2: Create RLS Policies
**File:** `CREATE_CRYPTOKU_HINTS_POLICIES.sql`

1. Still in SQL Editor
2. Copy and paste the entire contents of `CREATE_CRYPTOKU_HINTS_POLICIES.sql`
3. Run it
4. **Verify:** Should show 3 policies created

### Step 3: Create Trigger
**File:** `CREATE_CRYPTOKU_HINTS_TRIGGER.sql`

1. Still in SQL Editor
2. Copy and paste the entire contents of `CREATE_CRYPTOKU_HINTS_TRIGGER.sql`
3. Run it
4. **Verify:** Should show trigger was created

### Step 4: Test the Function
**File:** `QUICK_TEST_FUNCTIONS.sql` (or run this):

```sql
-- Test ensure_cryptoku_hints
SELECT ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1));

-- Verify it worked
SELECT * FROM cryptoku_hints WHERE user_id = (SELECT id FROM profiles LIMIT 1);
```

**Expected:** No error, and a row should be created in `cryptoku_hints`

## 🎯 All-in-One Script (Alternative)

If you prefer to run everything at once, use the full migration:

**File:** `supabase/migrations/20260117010000_create_cryptoku_hints_table.sql`

1. Open Supabase Dashboard → SQL Editor
2. Copy the ENTIRE file (all 286 lines)
3. Paste and run it
4. This creates table, policies, trigger, and updates functions

## ⚠️ Important Notes

- **Run scripts in order** - Table must exist before policies/triggers
- **Don't skip steps** - Each step depends on the previous one
- **Verify after each step** - Make sure it worked before moving on

## 🔍 Verification Queries

After completing all steps, run these to verify:

```sql
-- 1. Check table exists
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'cryptoku_hints';
-- Should return: 1

-- 2. Check columns
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'cryptoku_hints'
ORDER BY ordinal_position;
-- Should show: id, user_id, hint_balance, total_ranked_completed, created_at, updated_at

-- 3. Check policies
SELECT COUNT(*) FROM pg_policies 
WHERE tablename = 'cryptoku_hints';
-- Should return: 3

-- 4. Test function
SELECT ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1));
-- Should return: (no error)

-- 5. Verify record created
SELECT COUNT(*) FROM cryptoku_hints;
-- Should return: 1 or more
```

## 🐛 If You Still Get Errors

### Error: "relation cryptoku_hints does not exist"
- **Cause:** Table creation failed or wasn't run
- **Fix:** Run `CREATE_CRYPTOKU_HINTS_TABLE_ONLY.sql` again

### Error: "permission denied"
- **Cause:** RLS policies not set up correctly
- **Fix:** Run `CREATE_CRYPTOKU_HINTS_POLICIES.sql` again

### Error: "function ensure_cryptoku_hints does not exist"
- **Cause:** Function doesn't exist (unlikely, but possible)
- **Fix:** Run the full migration `20260117010000_create_cryptoku_hints_table.sql`

## ✅ Success Criteria

After completing all steps:
- ✅ Table `cryptoku_hints` exists
- ✅ 3 RLS policies exist
- ✅ Trigger exists
- ✅ Function `ensure_cryptoku_hints` works without error
- ✅ Can insert/select from `cryptoku_hints` table
