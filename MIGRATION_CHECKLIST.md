# Supabase Migration Verification Checklist

## 📋 Complete Migration List

### Migration Files (in chronological order):
1. `20260114131605_phase3_security.sql` - RLS and function security
2. `20260114132308_fix_rls_performance.sql` - RLS performance fixes
3. `20260114140732_fix_permissive_rls_policies.sql` - Permissive RLS
4. `20260114141553_fix_ape_in_game_states_rls_final.sql` - Ape In RLS
5. `20260114141553_fix_ape_in_game_states_rls.sql` - Ape In RLS (duplicate?)
6. `20260114151356_fix_cryptoku_game_logging.sql` - Cryptoku logging
7. `20260114153015_fix_cryptoku_hints_rls.sql` - Cryptoku hints RLS
8. `20260115111816_add_stub_leaderboard_functions.sql` - Stub functions
9. `20260116092321_fix_update_user_balance_security.sql` - Balance function security
10. `20260116093000_drop_old_update_user_balance.sql` - Drop old function
11. `20260116094000_create_cryptoku_leaderboard_table.sql` - **CRITICAL: Creates cryptoku_leaderboard table**
12. `20260116095000_fix_cryptoku_hints_insert_policy.sql` - Hints insert policy
13. `20260117000000_fix_ensure_cryptoku_hints_security.sql` - Hints function security
14. `20260117010000_create_cryptoku_hints_table.sql` - **CRITICAL: Creates cryptoku_hints table**

## 🔍 Verification Steps

### Step 1: Run Complete Verification Script
**File:** `SUPABASE_MIGRATION_VERIFICATION.sql`

Copy and paste the entire script into Supabase SQL Editor and run it. This will check:
- ✅ All tables exist
- ✅ All functions exist
- ✅ Function security settings
- ✅ RLS policies
- ✅ Indexes
- ✅ Constraints
- ✅ Triggers

### Step 2: Manual Table Checks

#### Check 1: Verify `cryptoku_leaderboard` Table
```sql
-- Should return 1 row
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'cryptoku_leaderboard';

-- Check columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'cryptoku_leaderboard'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id` (uuid)
- `run_id` (text, unique)
- `user_id` (uuid)
- `mode` (text)
- `score` (integer)
- `time_seconds` (integer)
- `hints_used` (integer)
- `errors` (integer)
- `completed` (boolean)
- `forfeited` (boolean)
- `created_at` (timestamp)

#### Check 2: Verify `cryptoku_hints` Table
```sql
-- Should return 1 row
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'cryptoku_hints';

-- Check columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'cryptoku_hints'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id` (uuid)
- `user_id` (uuid, unique)
- `hint_balance` (integer)
- `total_ranked_completed` (integer)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### Check 3: Verify `leaderboard` Table
```sql
-- Should return 1 row
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'leaderboard';

-- Check columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'leaderboard'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id` (uuid)
- `user_id` (uuid, unique)
- `total_points` (integer)
- `card_battle_wins` (integer)
- `ape_in_high_score` (integer)
- `cryptoku_high_score` (integer)
- `overall_rank` (integer)
- `updated_at` (timestamp)

### Step 3: Function Verification

#### Check 1: Verify `add_cryptoku_leaderboard_entry` Function
```sql
SELECT 
  p.proname,
  pg_get_function_identity_arguments(p.oid) as signature,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security,
  pg_get_functiondef(p.oid) LIKE '%search_path%' as has_search_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'add_cryptoku_leaderboard_entry';
```

**Expected:**
- Function exists
- Has `SECURITY DEFINER`
- Has `search_path` set
- Parameters: `p_run_id TEXT, p_user_id UUID, p_mode TEXT, p_score INTEGER, p_time_seconds INTEGER, p_hints_used INTEGER, p_errors INTEGER, p_completed BOOLEAN, p_forfeited BOOLEAN`

#### Check 2: Verify `update_user_balance` Function
```sql
SELECT 
  p.proname,
  pg_get_function_identity_arguments(p.oid) as signature,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security,
  pg_get_functiondef(p.oid) LIKE '%search_path%' as has_search_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'update_user_balance';
```

**Expected:**
- Function exists
- Has `SECURITY DEFINER`
- Has `search_path` set
- Parameters: `p_user_id UUID, p_ape_change INTEGER, p_tickets_change INTEGER, p_points_change INTEGER, p_transaction_type TEXT, p_description TEXT`
- **IMPORTANT:** Should be `p_tickets_change` (plural), NOT `p_ticket_change` (singular)

#### Check 3: Verify `ensure_cryptoku_hints` Function
```sql
SELECT 
  p.proname,
  pg_get_function_identity_arguments(p.oid) as signature,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security,
  pg_get_functiondef(p.oid) LIKE '%search_path%' as has_search_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'ensure_cryptoku_hints';
```

**Expected:**
- Function exists
- Has `SECURITY DEFINER`
- Has `search_path` set
- Parameters: `p_user_id UUID`

### Step 4: RLS Policy Verification

#### Check RLS Status
```sql
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('cryptoku_leaderboard', 'cryptoku_hints', 'leaderboard');
```

#### Check Policies
```sql
SELECT 
  tablename,
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('cryptoku_leaderboard', 'cryptoku_hints', 'leaderboard')
ORDER BY tablename, policyname;
```

**Expected policies for `cryptoku_leaderboard`:**
- SELECT: "Cryptoku leaderboard is viewable by everyone"
- INSERT: "Authenticated users can insert leaderboard entries"

**Expected policies for `cryptoku_hints`:**
- SELECT: "Cryptoku hints are viewable by everyone (TEMP)"
- INSERT: "Users can insert own hints (wallet auth)"
- UPDATE: "Authenticated users can update own hints"

**Expected policies for `leaderboard`:**
- SELECT: "Leaderboard is viewable by everyone"
- INSERT: "Users can insert own leaderboard entry"
- UPDATE: "Users can update own leaderboard entry"

### Step 5: Test Function Execution

#### Test 1: Test `ensure_cryptoku_hints` (Safe - won't break if run multiple times)
```sql
-- Get a real user_id from your profiles table
SELECT id FROM profiles LIMIT 1;

-- Then test (replace with actual user_id)
SELECT ensure_cryptoku_hints('YOUR-USER-ID-HERE'::UUID);
```

**Expected:** No error, function executes successfully

#### Test 2: Test `add_cryptoku_leaderboard_entry` (Safe - uses ON CONFLICT)
```sql
-- Get a real user_id from your profiles table
SELECT id FROM profiles LIMIT 1;

-- Then test (replace with actual user_id)
SELECT add_cryptoku_leaderboard_entry(
  'test-run-' || NOW()::TEXT,
  'YOUR-USER-ID-HERE'::UUID,
  'DEGEN',
  100,
  60,
  0,
  0,
  true,
  false
);
```

**Expected:** Returns a UUID (entry ID), no error

#### Test 3: Test `update_user_balance` (Safe - only updates if user exists)
```sql
-- Get a real user_id from your profiles table
SELECT id FROM profiles LIMIT 1;

-- Then test (replace with actual user_id)
SELECT update_user_balance(
  'YOUR-USER-ID-HERE'::UUID,
  0,  -- ape_change
  0,  -- tickets_change
  10, -- points_change
  'test',
  'Test balance update'
);
```

**Expected:** No error, function executes successfully

### Step 6: Check for Common Issues

#### Issue 1: Missing Tables
```sql
-- Check if any expected tables are missing
SELECT 'cryptoku_leaderboard' as table_name, 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'cryptoku_leaderboard') as exists
UNION ALL
SELECT 'cryptoku_hints', 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'cryptoku_hints')
UNION ALL
SELECT 'leaderboard',
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'leaderboard');
```

#### Issue 2: Functions Without SECURITY DEFINER
```sql
SELECT 
  p.proname,
  CASE WHEN p.prosecdef THEN 'OK' ELSE 'MISSING SECURITY DEFINER' END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'add_cryptoku_leaderboard_entry',
    'update_user_balance',
    'ensure_cryptoku_hints',
    'use_cryptoku_hint',
    'reward_cryptoku_hint',
    'purchase_cryptoku_hints'
  )
  AND NOT p.prosecdef;
```

**Expected:** No rows returned (all should have SECURITY DEFINER)

#### Issue 3: Functions Without search_path
```sql
SELECT 
  p.proname,
  pg_get_function_identity_arguments(p.oid) as signature
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'add_cryptoku_leaderboard_entry',
    'update_user_balance',
    'ensure_cryptoku_hints'
  )
  AND pg_get_functiondef(p.oid) NOT LIKE '%search_path%';
```

**Expected:** No rows returned (all should have search_path)

#### Issue 4: Duplicate Functions
```sql
SELECT 
  p.proname,
  COUNT(*) as count,
  string_agg(pg_get_function_identity_arguments(p.oid), ' | ') as signatures
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'update_user_balance'
GROUP BY p.proname
HAVING COUNT(*) > 1;
```

**Expected:** Should return 1 row with count = 1 (only one version should exist)

## 🎯 Quick Verification Query

Run this single query to get a quick overview:

```sql
SELECT 
  'Tables' as category,
  COUNT(*) FILTER (WHERE table_name IN ('cryptoku_leaderboard', 'cryptoku_hints', 'leaderboard')) as found,
  3 as expected
FROM information_schema.tables 
WHERE table_schema = 'public'

UNION ALL

SELECT 
  'Functions' as category,
  COUNT(*) FILTER (WHERE proname IN ('add_cryptoku_leaderboard_entry', 'update_user_balance', 'ensure_cryptoku_hints')) as found,
  3 as expected
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';
```

## 📝 What to Do If Issues Found

### If Tables Are Missing:
1. Check which migration creates the table
2. Run that migration manually in Supabase SQL Editor
3. Verify table was created

### If Functions Are Missing:
1. Check which migration creates the function
2. Run that migration manually
3. Verify function was created

### If Functions Don't Have SECURITY DEFINER:
1. Run the security fix migration for that function
2. Or manually fix: `ALTER FUNCTION function_name SECURITY DEFINER;`

### If Functions Don't Have search_path:
1. Run the security fix migration for that function
2. Or manually fix: `ALTER FUNCTION function_name SET search_path = 'pg_catalog, public';`

### If RLS Is Blocking:
1. Check if functions have SECURITY DEFINER (they should bypass RLS)
2. Or add policies that allow function access
3. Or disable RLS on the table if functions handle all access

## 🔧 Quick Fixes

### Fix Missing `cryptoku_leaderboard` Table:
Run migration: `20260116094000_create_cryptoku_leaderboard_table.sql`

### Fix Missing `cryptoku_hints` Table:
Run migration: `20260117010000_create_cryptoku_hints_table.sql`

### Fix Missing `leaderboard` Table:
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
