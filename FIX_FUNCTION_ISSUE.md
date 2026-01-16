# Fix: Function Can't Find cryptoku_hints Table

## 🔴 Problem

Even though the table was created, the function `ensure_cryptoku_hints` still can't find it. This happens when:
1. Function was created before the table
2. Function's search_path isn't working correctly
3. Schema qualification issue

## 🔍 Step 1: Diagnose the Issue

**Run:** `DIAGNOSE_TABLE_ACCESS.sql`

This will show:
- ✅ If table exists
- ✅ What schema it's in
- ✅ If function can see it
- ✅ Function's search_path settings

## 🔧 Step 2: Fix the Function

**Run:** `FIX_FUNCTION_TABLE_ACCESS.sql`

This will:
1. Verify table exists in public schema
2. Recreate the function with explicit `public.` schema qualification
3. Test the function
4. Verify it works

## 🎯 Quick Fix (If Diagnosis Shows Table Exists)

If the table exists but function can't see it, run this:

```sql
-- Recreate function with explicit schema
CREATE OR REPLACE FUNCTION ensure_cryptoku_hints(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
BEGIN
  INSERT INTO public.cryptoku_hints (user_id, hint_balance, total_ranked_completed)
  VALUES (p_user_id, 3, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;
```

## ⚠️ Common Causes

### Cause 1: Function Created Before Table
- **Fix:** Recreate the function after table exists

### Cause 2: search_path Not Applied
- **Fix:** Use explicit `public.cryptoku_hints` in function

### Cause 3: Wrong Schema
- **Fix:** Verify table is in `public` schema, not another schema

## ✅ After Fix

Test the function:
```sql
SELECT ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1));
```

Should work without error!
