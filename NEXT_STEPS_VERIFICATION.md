# Next Steps: Deep Verification

## ✅ What We Know
- All 5 tables exist ✅
- All 7 functions exist ✅

## 🔍 What We Need to Check Next

Since tables and functions exist, the issue is likely:
1. **Function security settings** (SECURITY DEFINER, search_path)
2. **RLS policies** blocking function access
3. **Parameter mismatches** between code and functions
4. **Function execution errors** (permissions, table access)

## 📋 Step-by-Step Verification

### Step 1: Run Deep Verification Queries

**File:** `DEEP_VERIFICATION_QUERIES.sql`

Copy and run this in Supabase SQL Editor. It will check:
- ✅ Function security settings
- ✅ Function parameters
- ✅ RLS status and policies
- ✅ Table structure
- ✅ Function table access
- ✅ Indexes

### Step 2: Check Function Security

**Critical Check:**
```sql
SELECT 
  p.proname,
  CASE WHEN p.prosecdef THEN '✅ SECURITY DEFINER' ELSE '❌ SECURITY INVOKER' END as security,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%search_path%' THEN '✅ HAS search_path'
    ELSE '❌ MISSING search_path'
  END as search_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'add_cryptoku_leaderboard_entry',
    'update_user_balance',
    'ensure_cryptoku_hints'
  );
```

**Expected:** All should show `✅ SECURITY DEFINER` and `✅ HAS search_path`

**If any show ❌:**
- Run the appropriate security fix migration
- Or manually fix: `ALTER FUNCTION function_name SECURITY DEFINER SET search_path = 'pg_catalog, public';`

### Step 3: Check Function Parameters

**Critical Check:**
```sql
SELECT 
  'update_user_balance' as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  CASE 
    WHEN pg_get_function_arguments(p.oid) LIKE '%p_tickets_change%' THEN '✅ CORRECT'
    WHEN pg_get_function_arguments(p.oid) LIKE '%p_ticket_change%' THEN '❌ WRONG (singular)'
    ELSE '⚠️ CHECK'
  END as check
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'update_user_balance';
```

**Expected:** Should show `p_tickets_change` (plural), NOT `p_ticket_change` (singular)

**If wrong:**
- Run migration: `20260116092321_fix_update_user_balance_security.sql`
- This should fix the function definition

### Step 4: Check RLS Policies

**Critical Check:**
```sql
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN ('cryptoku_leaderboard', 'cryptoku_hints', 'leaderboard');
```

**Expected:**
- RLS should be ENABLED
- Policy count should be > 0

**If RLS is blocking:**
- Functions with SECURITY DEFINER should bypass RLS
- If not working, may need to disable RLS or add function-specific policies

### Step 5: Test Function Execution

**Get a test user_id:**
```sql
SELECT id, wallet_address FROM profiles LIMIT 1;
```

**Test 1: ensure_cryptoku_hints**
```sql
-- Replace YOUR_USER_ID with actual ID from above
SELECT ensure_cryptoku_hints('YOUR_USER_ID'::UUID);
```

**Expected:** No error, function executes

**Test 2: update_user_balance**
```sql
-- Replace YOUR_USER_ID with actual ID
SELECT update_user_balance(
  'YOUR_USER_ID'::UUID,
  0,  -- ape_change
  0,  -- tickets_change
  1,  -- points_change (small test)
  'test',
  'Test verification'
);
```

**Expected:** No error, function executes

**Test 3: add_cryptoku_leaderboard_entry**
```sql
-- Replace YOUR_USER_ID with actual ID
SELECT add_cryptoku_leaderboard_entry(
  'test-run-' || NOW()::TEXT,
  'YOUR_USER_ID'::UUID,
  'DEGEN',
  100,
  60,
  0,
  0,
  true,
  false
);
```

**Expected:** Returns UUID (entry ID), no error

### Step 6: Check Actual Error Messages

**If functions fail, check the exact error:**

1. **Check Vercel logs** for the actual error message
2. **Check browser console** for client-side errors
3. **Check Supabase logs** for database errors

**Common errors:**
- `relation "X" does not exist` → Function missing search_path
- `permission denied` → RLS blocking or missing SECURITY DEFINER
- `function does not exist` → Wrong parameter names
- `duplicate key value` → Idempotency issue (should be handled)

## 🎯 Most Likely Issues

Based on the symptoms, the most likely issues are:

### Issue 1: Functions Missing SECURITY DEFINER
**Fix:** Run security fix migrations:
- `20260116092321_fix_update_user_balance_security.sql`
- `20260117000000_fix_ensure_cryptoku_hints_security.sql`
- `20260116094000_create_cryptoku_leaderboard_table.sql` (includes function security)

### Issue 2: Functions Missing search_path
**Fix:** Same migrations as above (they set search_path)

### Issue 3: Wrong Parameter Name
**Fix:** Check `update_user_balance` has `p_tickets_change` (plural), not `p_ticket_change` (singular)

### Issue 4: RLS Blocking Function Access
**Fix:** 
- Verify functions have SECURITY DEFINER
- Or disable RLS: `ALTER TABLE leaderboard DISABLE ROW LEVEL SECURITY;`

## 📊 Report Template

After running deep verification, report:

```
✅ Function Security:
  [ ] All have SECURITY DEFINER
  [ ] All have search_path

✅ Function Parameters:
  [ ] update_user_balance has p_tickets_change (plural)
  [ ] All parameters match code calls

✅ RLS:
  [ ] Policies configured
  [ ] Functions can bypass RLS

✅ Function Execution:
  [ ] ensure_cryptoku_hints works
  [ ] update_user_balance works
  [ ] add_cryptoku_leaderboard_entry works

❌ Issues Found:
  [List any issues here]
```

## 🔧 Quick Fixes

### If functions missing SECURITY DEFINER:
```sql
ALTER FUNCTION add_cryptoku_leaderboard_entry(TEXT, UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN) SECURITY DEFINER;
ALTER FUNCTION update_user_balance(UUID, INTEGER, INTEGER, INTEGER, TEXT, TEXT) SECURITY DEFINER;
ALTER FUNCTION ensure_cryptoku_hints(UUID) SECURITY DEFINER;
```

### If functions missing search_path:
```sql
ALTER FUNCTION add_cryptoku_leaderboard_entry(TEXT, UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN) SET search_path = 'pg_catalog, public';
ALTER FUNCTION update_user_balance(UUID, INTEGER, INTEGER, INTEGER, TEXT, TEXT) SET search_path = 'pg_catalog, public';
ALTER FUNCTION ensure_cryptoku_hints(UUID) SET search_path = 'pg_catalog, public';
```

### If RLS blocking:
```sql
ALTER TABLE leaderboard DISABLE ROW LEVEL SECURITY;
```

## 🚀 Next Action

1. **Run `DEEP_VERIFICATION_QUERIES.sql`** in Supabase
2. **Share the results** - especially:
   - Function security status
   - Function parameters
   - Any test execution errors
3. **Check Vercel logs** for actual error messages
4. **Test function execution** with real user_id

This will pinpoint the exact issue!
