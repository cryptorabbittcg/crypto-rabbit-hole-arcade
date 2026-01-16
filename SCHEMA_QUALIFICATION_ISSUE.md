# Schema Qualification Issue - All Functions Need Fixing

## 🔴 Problem

Multiple functions can't find tables even though they exist. This is a **systematic schema qualification issue**.

**Affected Functions:**
- ❌ `update_user_balance` - Can't find `profiles` table
- ⚠️ `add_cryptoku_leaderboard_entry` - May have same issue
- ✅ `ensure_cryptoku_hints` - FIXED (uses explicit schema)
- ✅ `use_cryptoku_hint` - FIXED (uses explicit schema)
- ✅ `reward_cryptoku_hint` - FIXED (uses explicit schema)
- ✅ `purchase_cryptoku_hints` - FIXED (uses explicit schema)

## 🔧 Solution

### Fix update_user_balance

**Run:** `FIX_UPDATE_USER_BALANCE.sql`

This recreates `update_user_balance` with explicit `public.` schema for:
- `public.profiles`
- `public.transactions`
- `public.leaderboard`

### Check All Functions

**Run:** `FIX_ALL_REMAINING_FUNCTIONS.sql`

This will:
1. ✅ Fix `update_user_balance`
2. ✅ Check `add_cryptoku_leaderboard_entry`
3. ✅ Verify all functions use explicit schema
4. ✅ Test `update_user_balance`

## 🎯 Root Cause

PostgreSQL functions with `SECURITY DEFINER` and `search_path` sometimes can't resolve table names, especially when:
- Functions were created before tables
- Multiple schemas exist
- search_path resolution is cached

**Solution:** Use explicit `public.` schema qualification for ALL table references.

## ✅ After Fixing

All functions should:
- ✅ Be able to find tables
- ✅ Execute without errors
- ✅ Work in your application

## 🚀 Next Steps

1. **Run `FIX_UPDATE_USER_BALANCE.sql`** - Fixes the immediate issue
2. **Run `FIX_ALL_REMAINING_FUNCTIONS.sql`** - Checks and fixes all functions
3. **Test in application** - Verify everything works

This should fix the `update_user_balance` issue and prevent similar issues with other functions!
