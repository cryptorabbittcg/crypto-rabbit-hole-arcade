# Submit Result & Leaderboard - Complete Fix Summary

## ✅ What's Correct

1. **Function Names** - All match between code and database ✅
2. **Parameter Names** - All match between code and functions ✅
3. **Function Security** - All have SECURITY DEFINER + search_path ✅
4. **Admin Client Usage** - Both routes use admin client ✅
5. **Idempotency** - Both routes handle duplicate `run_id` ✅

## 🔴 CRITICAL ISSUES FOUND

### Issue #1: `leaderboard` Table May Not Exist
**Status:** ⚠️ NEEDS VERIFICATION

The `leaderboard` table is defined in `scripts/01-create-tables.sql` but may not have been run as a migration. 

**Check:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'leaderboard';
```

**Fix if missing:** Create migration to ensure table exists.

### Issue #2: RLS Policies May Block Function Access
**Status:** ⚠️ NEEDS VERIFICATION

The `leaderboard` table has RLS enabled with policies that require `app.current_user_id` session variable. Functions with SECURITY DEFINER should bypass RLS, but we need to verify.

**Check:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'leaderboard';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'leaderboard';
```

**Current Policies:**
- SELECT: ✅ "Leaderboard is viewable by everyone" (allows reads)
- INSERT: ⚠️ "Users can insert own leaderboard entry" (requires session var)
- UPDATE: ⚠️ "Users can update own leaderboard entry" (requires session var)

**Functions that need access:**
- `add_cryptoku_leaderboard_entry` - Updates `leaderboard.cryptoku_high_score`
- `update_user_balance` - Updates `leaderboard.total_points`
- Ape In submit-result - Updates `leaderboard.ape_in_high_score`

**Fix Options:**
1. **Option A:** Disable RLS on `leaderboard` (functions handle all access)
2. **Option B:** Add policy allowing `postgres`/`service_role` to modify
3. **Option C:** Verify SECURITY DEFINER functions bypass RLS correctly

### Issue #3: Non-Atomic Leaderboard Update in Ape In
**Status:** ⚠️ MINOR (works but not optimal)

The Ape In submit-result uses SELECT then INSERT/UPDATE pattern instead of a single UPSERT.

**Current Code:**
```typescript
// SELECT first
const { data: leaderboardData } = await adminClient
  .from('leaderboard')
  .select('ape_in_high_score')
  .eq('user_id', profile.id)
  .single()

// Then UPDATE or INSERT
if (leaderboardData) {
  // UPDATE
} else {
  // INSERT
}
```

**Better Approach:**
```typescript
// Single UPSERT
const { error } = await adminClient
  .from('leaderboard')
  .upsert({
    user_id: profile.id,
    ape_in_high_score: score,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'user_id',
    ignoreDuplicates: false
  })
```

## 🔧 Recommended Actions

### 1. Verify `leaderboard` Table Exists
Run in Supabase SQL Editor:
```sql
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'leaderboard') as column_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'leaderboard';
```

### 2. Check RLS Status
```sql
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'leaderboard') as policy_count
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'leaderboard';
```

### 3. Test Function Access
```sql
-- Test if function can update leaderboard
-- Replace with a real user_id from your profiles table
SELECT add_cryptoku_leaderboard_entry(
  'test-run-id-123',
  '00000000-0000-0000-0000-000000000000'::UUID,
  'DEGEN',
  100,
  60,
  0,
  0,
  true,
  false
);
```

### 4. Check Function Owner
```sql
SELECT 
  p.proname,
  pg_get_userbyid(p.proowner) as owner,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('add_cryptoku_leaderboard_entry', 'update_user_balance');
```

## 📋 Migration to Fix Issues

If `leaderboard` table doesn't exist or RLS is blocking, create this migration:

```sql
-- Ensure leaderboard table exists
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

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON leaderboard(total_points DESC);

-- Option 1: Disable RLS (functions handle all access)
ALTER TABLE leaderboard DISABLE ROW LEVEL SECURITY;

-- OR Option 2: Add policy for functions
-- DROP POLICY IF EXISTS "Functions can modify leaderboard" ON leaderboard;
-- CREATE POLICY "Functions can modify leaderboard"
--   ON leaderboard
--   FOR ALL
--   TO postgres, service_role
--   USING (true)
--   WITH CHECK (true);
```

## 🎯 Next Steps

1. **Run verification queries** - Check if `leaderboard` table exists and RLS status
2. **Test function execution** - Try calling functions directly
3. **Check error logs** - Look for specific errors in Vercel logs
4. **Create migration if needed** - Use the migration above if issues found
5. **Improve Ape In code** - Consider using UPSERT pattern

## 📝 Files to Check

1. `app/api/cryptoku/submit-result/route.ts` - Line 235 (update_user_balance call)
2. `app/api/cryptoku/submit-result/route.ts` - Line 192 (add_cryptoku_leaderboard_entry call)
3. `app/api/ape-in/submit-result/route.ts` - Line 142 (update_user_balance call)
4. `app/api/ape-in/submit-result/route.ts` - Line 164-204 (leaderboard update)
5. `supabase/migrations/20260116094000_create_cryptoku_leaderboard_table.sql` - Line 147-163 (leaderboard update in function)
