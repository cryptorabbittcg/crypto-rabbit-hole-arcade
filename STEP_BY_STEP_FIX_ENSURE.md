# Step-by-Step Fix for ensure_cryptoku_hints

## 🔴 Problem

The function `ensure_cryptoku_hints` doesn't exist, causing all other hint functions to fail.

## ✅ Solution: 3 Simple Steps

### Step 1: Verify Function Doesn't Exist

**Run:** `VERIFY_FUNCTION_EXISTS.sql`

This will show if the function exists or not.

### Step 2: Create the Function

**Run:** `JUST_CREATE_THE_FUNCTION.sql`

This is the simplest possible script - just creates the function, nothing else.

**OR** copy and paste this directly into Supabase SQL Editor:

```sql
CREATE OR REPLACE FUNCTION ensure_cryptoku_hints(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
AS $$
BEGIN
  INSERT INTO cryptoku_hints (user_id, hint_balance, total_ranked_completed)
  VALUES (p_user_id, 3, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;
```

### Step 3: Verify It Works

**Run:** `VERIFY_FUNCTION_EXISTS.sql` again

Should now show: `✅ FUNCTION EXISTS`

**Then test it:**
```sql
SELECT ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1));
```

Should return: (no error)

## 🎯 Why This Should Work

- Uses `CREATE OR REPLACE` - won't fail if function exists
- Simple, no extra checks that could fail
- Exact same definition as the migration file
- Uses `cryptoku_hints` (not `public.cryptoku_hints`) since search_path is set

## ⚠️ If It Still Doesn't Work

1. **Check for errors** - Look at the Supabase SQL Editor output
2. **Check permissions** - Make sure you have CREATE FUNCTION permission
3. **Check schema** - Verify you're in the `public` schema
4. **Try explicit schema:**
   ```sql
   CREATE OR REPLACE FUNCTION public.ensure_cryptoku_hints(p_user_id UUID)
   ...
   ```

## ✅ Success

After creating the function:
- ✅ `VERIFY_FUNCTION_EXISTS.sql` shows function exists
- ✅ Can call `ensure_cryptoku_hints` without error
- ✅ Other functions (`use_cryptoku_hint`, etc.) can call it
- ✅ Cryptoku game submissions work
