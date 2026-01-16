# Complete Supabase Migration Verification Guide

## 🎯 Purpose

This guide provides **complete verification** of all Supabase migrations to identify and fix any issues with submit-result and leaderboard functionality.

## 📁 Files Created

1. **`SUPABASE_MIGRATION_VERIFICATION.sql`** - Complete SQL script to run in Supabase
2. **`MIGRATION_CHECKLIST.md`** - Step-by-step manual verification checklist
3. **This file** - Summary and action plan

## 🚀 Quick Start

### Step 1: Run the Complete Verification Script

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `SUPABASE_MIGRATION_VERIFICATION.sql`
3. Paste and run it
4. Review all results

**This will check:**
- ✅ All tables exist
- ✅ All functions exist  
- ✅ Function security settings
- ✅ RLS policies
- ✅ Indexes and constraints
- ✅ Triggers

### Step 2: Review Results

Look for any ❌ MISSING or ❌ errors in the output. These indicate issues that need to be fixed.

## 🔍 Critical Checks

### Check 1: Essential Tables Must Exist

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'cryptoku_leaderboard',  -- ⚠️ CRITICAL for Cryptoku submissions
    'cryptoku_hints',        -- ⚠️ CRITICAL for hints system
    'leaderboard',          -- ⚠️ CRITICAL for all leaderboards
    'profiles',              -- ⚠️ CRITICAL for user data
    'game_sessions'          -- ⚠️ CRITICAL for Ape In submissions
  );
```

**Expected:** All 5 tables should exist

### Check 2: Essential Functions Must Exist

```sql
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'add_cryptoku_leaderboard_entry',  -- ⚠️ CRITICAL for Cryptoku
    'update_user_balance',              -- ⚠️ CRITICAL for points
    'ensure_cryptoku_hints',            -- ⚠️ CRITICAL for hints
    'reward_cryptoku_hint',             -- ⚠️ CRITICAL for hints
    'use_cryptoku_hint',                -- ⚠️ CRITICAL for hints
    'purchase_cryptoku_hints'           -- ⚠️ CRITICAL for hints
  );
```

**Expected:** All 6 functions should exist

### Check 3: Functions Must Have SECURITY DEFINER

```sql
SELECT 
  proname,
  CASE WHEN prosecdef THEN '✅ OK' ELSE '❌ MISSING' END as security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'add_cryptoku_leaderboard_entry',
    'update_user_balance',
    'ensure_cryptoku_hints',
    'reward_cryptoku_hint',
    'use_cryptoku_hint',
    'purchase_cryptoku_hints'
  )
  AND NOT prosecdef;
```

**Expected:** No rows returned (all should have SECURITY DEFINER)

### Check 4: Functions Must Have search_path

```sql
SELECT 
  proname,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%search_path%' THEN '✅ OK'
    ELSE '❌ MISSING'
  END as search_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'add_cryptoku_leaderboard_entry',
    'update_user_balance',
    'ensure_cryptoku_hints'
  )
  AND pg_get_functiondef(oid) NOT LIKE '%search_path%';
```

**Expected:** No rows returned (all should have search_path)

## 🐛 Common Issues & Fixes

### Issue 1: Missing `cryptoku_leaderboard` Table

**Symptoms:**
- Error: `relation "cryptoku_leaderboard" does not exist`
- Cryptoku submissions fail

**Fix:**
Run migration: `supabase/migrations/20260116094000_create_cryptoku_leaderboard_table.sql`

### Issue 2: Missing `cryptoku_hints` Table

**Symptoms:**
- Error: `relation "cryptoku_hints" does not exist`
- Hints system fails

**Fix:**
Run migration: `supabase/migrations/20260117010000_create_cryptoku_hints_table.sql`

### Issue 3: Missing `leaderboard` Table

**Symptoms:**
- Error: `relation "leaderboard" does not exist`
- Leaderboard updates fail
- High scores not saved

**Fix:**
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

CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON leaderboard(total_points DESC);
```

### Issue 4: Function Missing SECURITY DEFINER

**Symptoms:**
- Error: `relation "profiles" does not exist` (when function runs)
- Function can't access tables

**Fix:**
```sql
ALTER FUNCTION add_cryptoku_leaderboard_entry(TEXT, UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN) SECURITY DEFINER;
ALTER FUNCTION add_cryptoku_leaderboard_entry(TEXT, UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN) SET search_path = 'pg_catalog, public';
```

Or run the appropriate security fix migration.

### Issue 5: Wrong Parameter Name in `update_user_balance`

**Symptoms:**
- Error: `function update_user_balance(unknown, integer, integer, integer, text, text) does not exist`
- Points not awarded

**Check:**
```sql
SELECT pg_get_function_arguments(oid) 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'update_user_balance';
```

**Expected:** Should include `p_tickets_change` (plural), NOT `p_ticket_change` (singular)

**Fix:** If wrong, run migration: `20260116092321_fix_update_user_balance_security.sql`

### Issue 6: RLS Blocking Function Access

**Symptoms:**
- Functions fail with permission errors
- Even with SECURITY DEFINER

**Check:**
```sql
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'leaderboard';
```

**Fix Options:**

**Option A:** Disable RLS (if functions handle all access)
```sql
ALTER TABLE leaderboard DISABLE ROW LEVEL SECURITY;
```

**Option B:** Add policy for functions
```sql
CREATE POLICY "Functions can modify leaderboard"
  ON leaderboard FOR ALL
  TO postgres, service_role
  USING (true) WITH CHECK (true);
```

## 📊 Verification Results Template

After running the verification script, fill this out:

```
✅ Tables:
  [ ] cryptoku_leaderboard exists
  [ ] cryptoku_hints exists
  [ ] leaderboard exists
  [ ] profiles exists
  [ ] game_sessions exists

✅ Functions:
  [ ] add_cryptoku_leaderboard_entry exists
  [ ] update_user_balance exists
  [ ] ensure_cryptoku_hints exists
  [ ] reward_cryptoku_hint exists
  [ ] use_cryptoku_hint exists
  [ ] purchase_cryptoku_hints exists

✅ Security:
  [ ] All functions have SECURITY DEFINER
  [ ] All functions have search_path set

✅ RLS:
  [ ] RLS policies configured correctly
  [ ] Functions can bypass RLS (SECURITY DEFINER)

✅ Testing:
  [ ] ensure_cryptoku_hints can be called
  [ ] add_cryptoku_leaderboard_entry can be called
  [ ] update_user_balance can be called
```

## 🎯 Action Plan

1. **Run `SUPABASE_MIGRATION_VERIFICATION.sql`** in Supabase SQL Editor
2. **Review all results** - Look for ❌ errors
3. **Fix any missing tables** - Run the appropriate migration
4. **Fix any missing functions** - Run the appropriate migration
5. **Fix security issues** - Run security fix migrations
6. **Test function execution** - Use the test queries
7. **Verify in application** - Test actual game submissions

## 📝 Notes

- All migrations should be run in chronological order
- Some migrations are idempotent (safe to run multiple times)
- Always verify after running migrations
- Keep a backup before making changes
- Test in a development environment first if possible

## 🔗 Related Files

- `SUBMIT_RESULT_SANITY_CHECK.md` - Detailed function/parameter verification
- `SUBMIT_RESULT_ISSUES_FOUND.md` - Issues analysis
- `SUBMIT_RESULT_FIX_SUMMARY.md` - Fix recommendations
- `MIGRATION_CHECKLIST.md` - Step-by-step manual checks
- `SUPABASE_MIGRATION_VERIFICATION.sql` - Complete SQL verification script
