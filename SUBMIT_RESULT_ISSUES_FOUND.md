# Submit Result Issues Found - Critical Analysis

## 🔴 CRITICAL ISSUE FOUND

### Issue: `leaderboard` Table May Not Exist or RLS May Block Updates

**Location:** Both `app/api/cryptoku/submit-result/route.ts` and `app/api/ape-in/submit-result/route.ts`

**Problem:**
1. The `leaderboard` table is created in `scripts/01-create-tables.sql` but this script may not have been run as a migration
2. RLS is enabled on `leaderboard` table (from `scripts/02-rls-policies.sql`)
3. The RLS policies use `current_setting('app.current_user_id', true)` which requires a session variable
4. Functions use `SECURITY DEFINER` which should bypass RLS, but we need to verify

**Impact:**
- `add_cryptoku_leaderboard_entry` function tries to UPDATE/INSERT into `leaderboard` table
- `ape-in/submit-result` manually tries to UPDATE/INSERT into `leaderboard` table
- If RLS blocks these operations, leaderboard updates will fail silently or with errors

## ✅ What's Working Correctly

1. **Function Names Match** - All function names in code match database functions
2. **Parameter Names Match** - All parameter names are consistent
3. **Tables Exist** - `cryptoku_leaderboard`, `profiles`, `game_sessions` all exist
4. **Functions Have SECURITY DEFINER** - All functions that need it have it
5. **Admin Client Used** - Both routes use admin client to bypass RLS

## ⚠️ Potential Issues

### 1. `leaderboard` Table Creation
**Check:** Verify `leaderboard` table exists in Supabase
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'leaderboard';
```

### 2. `leaderboard` Table RLS Policies
**Check:** Verify RLS policies allow function access
```sql
SELECT * FROM pg_policies WHERE tablename = 'leaderboard';
```

**Current Policies (from scripts/02-rls-policies.sql):**
- SELECT: "Leaderboard is viewable by everyone" ✅ (allows reads)
- INSERT: "Users can insert own leaderboard entry" ⚠️ (requires `app.current_user_id`)
- UPDATE: "Users can update own leaderboard entry" ⚠️ (requires `app.current_user_id`)

**Problem:** Functions with SECURITY DEFINER should bypass RLS, but if the function owner doesn't have permissions, it could fail.

### 3. Function Owner Permissions
**Check:** Verify function owners can INSERT/UPDATE into `leaderboard`
```sql
SELECT 
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security,
  pg_get_userbyid(p.proowner) as owner
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('add_cryptoku_leaderboard_entry', 'update_user_balance');
```

### 4. Missing `leaderboard` Entry Creation in Functions
**Check:** `add_cryptoku_leaderboard_entry` does handle this (lines 157-163), but uses `IF NOT FOUND` which checks if the UPDATE found a row. This should work, but let's verify.

## 🔧 Recommended Fixes

### Fix 1: Ensure `leaderboard` Table Exists
Create a migration to ensure the table exists:
```sql
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_points INTEGER DEFAULT 0,
  card_battle_wins INTEGER DEFAULT 0,
  ape_in_high_score INTEGER DEFAULT 0,
  cryptoku_high_score INTEGER DEFAULT 0,
  overall_rank INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Fix 2: Add RLS Policy for Functions
Add a policy that allows functions to INSERT/UPDATE:
```sql
-- Allow functions (SECURITY DEFINER) to modify leaderboard
CREATE POLICY "Functions can modify leaderboard"
  ON leaderboard
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);
```

**OR** Disable RLS on `leaderboard` if functions should handle all access:
```sql
ALTER TABLE leaderboard DISABLE ROW LEVEL SECURITY;
```

### Fix 3: Improve `add_cryptoku_leaderboard_entry` Function
The function already handles this, but we can make it more robust:
```sql
-- Ensure leaderboard entry exists (UPSERT)
INSERT INTO leaderboard (user_id, cryptoku_high_score, updated_at)
VALUES (p_user_id, p_score, NOW())
ON CONFLICT (user_id) DO UPDATE SET
  cryptoku_high_score = GREATEST(leaderboard.cryptoku_high_score, p_score),
  updated_at = NOW();
```

This is already done in the function, so it should work.

## 🎯 Action Items

1. **Verify `leaderboard` table exists** - Run the check query above
2. **Check RLS policies** - Verify they allow function access
3. **Test function execution** - Try calling `add_cryptoku_leaderboard_entry` directly
4. **Check error logs** - Look for specific errors about `leaderboard` table access
5. **Verify function owners** - Ensure they have proper permissions

## 📋 Testing Checklist

- [ ] `leaderboard` table exists
- [ ] `leaderboard` table has correct columns
- [ ] RLS policies allow function access OR RLS is disabled
- [ ] Functions can INSERT into `leaderboard`
- [ ] Functions can UPDATE `leaderboard`
- [ ] `add_cryptoku_leaderboard_entry` successfully updates `leaderboard`
- [ ] `update_user_balance` successfully updates `leaderboard.total_points`
- [ ] Ape In submit-result successfully updates `leaderboard.ape_in_high_score`
