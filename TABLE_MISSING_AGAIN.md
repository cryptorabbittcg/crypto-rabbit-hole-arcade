# 🔴 Table Missing Again!

## Problem

The `cryptoku_hints` table appears to have been dropped or never existed in the first place. The function exists but can't find the table.

## Possible Causes

1. **Table was dropped** - Someone or something dropped it
2. **Table never created** - The creation script didn't run successfully
3. **Wrong schema** - Table exists in a different schema
4. **Transaction rollback** - Table creation was rolled back

## Solution

### Step 1: Check if Table Exists

**Run:** `CHECK_TABLE_EXISTS.sql`

This will show:
- ✅ If table exists in information_schema
- ✅ If table exists in pg_tables
- ✅ If you can query it directly
- ✅ What schema it's in (if it exists)

### Step 2: Recreate Table and Function Together

**Run:** `RECREATE_TABLE_AND_FUNCTION.sql`

This script:
1. ✅ Drops the function first
2. ✅ Creates the table (if not exists)
3. ✅ Verifies table exists
4. ✅ Creates the function AFTER table exists
5. ✅ Tests the function immediately
6. ✅ Verifies it works

## Why This Approach Works

By creating the table and function in the same script:
- Ensures table exists before function is created
- Avoids timing issues
- Tests immediately to catch problems
- Uses explicit `public.` schema qualification

## After Running

You should see:
- ✅ Table exists (verification shows ✅)
- ✅ Function created successfully
- ✅ Function test passes (no error)
- ✅ Record created in table

## If Table Still Doesn't Exist After Running Script

1. **Check for errors** - Look at Supabase SQL Editor output
2. **Check permissions** - Make sure you have CREATE TABLE permission
3. **Check schema** - Verify you're in the `public` schema
4. **Check for constraints** - Maybe `profiles` table doesn't exist (foreign key constraint)

## Quick Manual Fix

If the script doesn't work, run this manually:

```sql
-- Create table
CREATE TABLE IF NOT EXISTS cryptoku_hints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  hint_balance INTEGER DEFAULT 3 NOT NULL CHECK (hint_balance >= 0),
  total_ranked_completed INTEGER DEFAULT 0 NOT NULL CHECK (total_ranked_completed >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_cryptoku_hints_user ON cryptoku_hints(user_id);

-- Enable RLS
ALTER TABLE cryptoku_hints ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'cryptoku_hints';
-- Should return: 1

-- Then create function
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
