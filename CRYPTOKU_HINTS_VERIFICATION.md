# Cryptoku Hints Table - Verification Checklist

## ✅ Table Created
The `cryptoku_hints` table now exists in your Supabase database.

## Verification Steps

### 1. Verify Table Structure
Run this query to verify all columns exist:
```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cryptoku_hints'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id` (uuid, not null)
- `user_id` (uuid, not null, unique)
- `hint_balance` (integer, not null, default 3)
- `total_ranked_completed` (integer, not null, default 0)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

### 2. Verify Functions Have Correct Security Settings
```sql
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security,
  CASE WHEN pg_get_functiondef(p.oid) LIKE '%search_path%' THEN 'YES' ELSE 'NO' END as has_search_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('ensure_cryptoku_hints', 'use_cryptoku_hint', 'reward_cryptoku_hint', 'purchase_cryptoku_hints')
ORDER BY p.proname;
```

**Expected:**
- All functions should show `SECURITY DEFINER`
- All functions should show `has_search_path: YES`

### 3. Verify RLS Policies
```sql
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'cryptoku_hints'
ORDER BY policyname;
```

**Expected policies:**
- `Cryptoku hints are viewable by everyone (TEMP)` (SELECT, anon/authenticated)
- `Users can insert own hints (wallet auth)` (INSERT, anon/authenticated)
- `Authenticated users can update own hints` (UPDATE, authenticated)

### 4. Test Function Execution
```sql
-- Get a real user_id from your profiles table
SELECT id FROM profiles LIMIT 1;

-- Test ensure_cryptoku_hints (replace with real user_id)
SELECT ensure_cryptoku_hints('YOUR-USER-ID-HERE'::UUID);

-- Verify record was created
SELECT * FROM cryptoku_hints WHERE user_id = 'YOUR-USER-ID-HERE'::UUID;
```

**Expected:**
- Function executes without errors
- Record is created with `hint_balance = 3` and `total_ranked_completed = 0`

### 5. Test in Application
1. Play a Cryptoku game
2. Try to use a hint
3. Check browser console for errors
4. Verify hints are deducted correctly

## ✅ Success Criteria

- [x] Table `cryptoku_hints` exists
- [ ] All columns present and correct
- [ ] All functions have `SECURITY DEFINER`
- [ ] All functions have `search_path` set
- [ ] RLS policies are active
- [ ] Functions can create/read/update records
- [ ] No errors in Vercel deployment logs
- [ ] Hints work in Cryptoku game

## Next Steps

1. **Test the application** - Play Cryptoku and verify hints work
2. **Monitor Vercel logs** - Check for any remaining errors
3. **Verify hint balance** - Ensure hints are saved/loaded correctly

## If Issues Persist

If you still see errors:
1. Check Vercel deployment logs for the exact error message
2. Verify the function security settings (step 2 above)
3. Check RLS policies aren't blocking operations
4. Verify the `ensure_cryptoku_hints` function can find the table
