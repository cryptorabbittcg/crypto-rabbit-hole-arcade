# 🔴 URGENT FIX: ensure_cryptoku_hints Function Missing

## Problem

The `ensure_cryptoku_hints` function was dropped but not recreated properly. Other functions (`use_cryptoku_hint`, `reward_cryptoku_hint`, etc.) depend on it and are failing.

## Error

```
function ensure_cryptoku_hints(uuid) does not exist
```

## Quick Fix

**Run:** `RECREATE_ENSURE_FUNCTION.sql`

This will:
1. ✅ Check what functions exist
2. ✅ Drop any old/broken versions
3. ✅ Verify table exists
4. ✅ Create the function with correct signature
5. ✅ Test the function
6. ✅ Verify other functions can call it

## Manual Fix (If Script Doesn't Work)

Run this in Supabase SQL Editor:

```sql
-- Drop any existing versions
DROP FUNCTION IF EXISTS ensure_cryptoku_hints(UUID);
DROP FUNCTION IF EXISTS ensure_cryptoku_hints(uuid);

-- Create the function
CREATE FUNCTION ensure_cryptoku_hints(p_user_id UUID)
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

## Verify It Works

```sql
-- Test the function
SELECT ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1));

-- Should return: (no error)

-- Verify record was created
SELECT * FROM cryptoku_hints WHERE user_id = (SELECT id FROM profiles LIMIT 1);
```

## Why This Happened

When we ran `FORCE_RECREATE_FUNCTION.sql`, the function may have been dropped but the creation step might have failed silently, or there was a transaction issue.

## After Fix

All these functions should work:
- ✅ `ensure_cryptoku_hints` - Creates default hints record
- ✅ `use_cryptoku_hint` - Uses a hint (calls ensure_cryptoku_hints)
- ✅ `reward_cryptoku_hint` - Rewards hint (calls ensure_cryptoku_hints)
- ✅ `purchase_cryptoku_hints` - Purchases hints (calls ensure_cryptoku_hints)

## Next Steps

1. **Run `RECREATE_ENSURE_FUNCTION.sql`**
2. **Verify all tests pass**
3. **Test in your application**
