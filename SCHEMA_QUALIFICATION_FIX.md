# Fix: Function Can't Find Table (Schema Qualification Issue)

## 🔴 Problem

- ✅ Table `cryptoku_hints` EXISTS in `public` schema
- ✅ Function `ensure_cryptoku_hints` EXISTS
- ❌ Function CAN'T FIND the table

This is a **schema qualification** or **search_path** issue.

## 🔧 Solution

**Run:** `FIX_FUNCTION_SCHEMA.sql`

This will:
1. ✅ Verify table exists (we know it does)
2. ✅ Test direct query (proves table is accessible)
3. ✅ Drop function
4. ✅ Recreate function with **explicit `public.` schema** in function name AND table reference
5. ✅ Test function
6. ✅ Verify it works

## 🎯 Key Changes

### Before (Not Working):
```sql
CREATE FUNCTION ensure_cryptoku_hints(p_user_id UUID)
...
  INSERT INTO cryptoku_hints ...
```

### After (Working):
```sql
CREATE FUNCTION public.ensure_cryptoku_hints(p_user_id UUID)
...
  INSERT INTO public.cryptoku_hints ...
```

**Both** the function name AND the table reference use explicit `public.` schema.

## ⚠️ Why This Happens

Even though:
- Table exists in `public` schema
- Function has `SET search_path = 'pg_catalog', 'public'`
- Function has `SECURITY DEFINER`

PostgreSQL sometimes still can't resolve the table name, especially if:
- The function was created before the table
- There are multiple schemas
- search_path resolution is cached

Using explicit `public.` qualification bypasses all search_path issues.

## ✅ After Running Fix

The function should:
- ✅ Be able to find the table
- ✅ Execute without errors
- ✅ Be callable from other functions
- ✅ Work in your application

## 🧪 Verification

After running the fix, test:
```sql
SELECT public.ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1));
```

Should return: (no error)

Then test from another function:
```sql
SELECT use_cryptoku_hint((SELECT id FROM profiles LIMIT 1));
```

Should return: JSON with success: true
