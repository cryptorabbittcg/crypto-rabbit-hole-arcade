# Cryptoku Hints Table Fix

## Issue
**Error:** `relation "cryptoku_hints" does not exist`

**Root Cause:** The `cryptoku_hints` table was never created in Supabase. The migrations assumed it existed but only fixed RLS policies and function security.

## Solution
Created migration `20260117010000_create_cryptoku_hints_table.sql` that:

1. ✅ Creates the `cryptoku_hints` table with proper schema
2. ✅ Creates indexes for performance
3. ✅ Sets up RLS policies
4. ✅ Creates/updates all required functions with SECURITY DEFINER
5. ✅ Creates trigger for `updated_at` timestamp

## Table Schema
```sql
cryptoku_hints (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) UNIQUE NOT NULL,
  hint_balance INTEGER DEFAULT 3 NOT NULL,
  total_ranked_completed INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
```

## Functions Created/Updated
- `ensure_cryptoku_hints(p_user_id UUID)` - Creates default hints record
- `use_cryptoku_hint(p_user_id UUID)` - Uses a hint atomically
- `reward_cryptoku_hint(p_user_id UUID)` - Rewards hint on game completion
- `purchase_cryptoku_hints(p_user_id UUID, p_amount INTEGER)` - Purchases hints

All functions have:
- `SECURITY DEFINER` - Bypasses RLS
- `SET search_path = 'pg_catalog, public'` - Can find public schema tables

## Action Required

1. **Run the migration in Supabase:**
   - Go to Supabase Dashboard → SQL Editor
   - Run: `supabase/migrations/20260117010000_create_cryptoku_hints_table.sql`
   - Or use Supabase CLI: `supabase db push`

2. **Verify the table was created:**
   ```sql
   SELECT * FROM cryptoku_hints LIMIT 1;
   ```

3. **Test the functions:**
   ```sql
   -- Should create a hints record
   SELECT ensure_cryptoku_hints('00000000-0000-0000-0000-000000000000'::UUID);
   ```

## Expected Result
After running the migration:
- ✅ Table `cryptoku_hints` exists
- ✅ All functions work correctly
- ✅ No more "relation does not exist" errors
- ✅ Hints system works in Cryptoku game
