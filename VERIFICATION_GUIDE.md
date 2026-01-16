# Complete Supabase Verification Guide

## 🎯 Purpose

This comprehensive verification script checks **everything** in your Supabase database to ensure all components are properly set up and working.

## 📋 What It Checks

### 1. **Core Tables** (12 tables)
- ✅ `profiles` - User profiles
- ✅ `card_inventory` - Card collections
- ✅ `upgrades_inventory` - Purchased upgrades
- ✅ `game_sessions` - Game session records
- ✅ `pvp_matches` - PvP matches
- ✅ `match_history` - Match history
- ✅ `transactions` - Currency transactions
- ✅ `leaderboard` - Player rankings
- ✅ `achievements` - User achievements
- ✅ `social_raids` - Social raid tasks
- ✅ `raid_participation` - Raid participation
- ✅ `pack_openings` - Pack opening history

### 2. **Game-Specific Tables** (4 tables)
- ✅ `cryptoku_hints` - Cryptoku hint balances
- ✅ `cryptoku_leaderboard` - Cryptoku leaderboard
- ✅ `ape_in_game_states` - Ape In active games
- ✅ `ape_in_daily_free_plays` - Ape In free plays (if exists)

### 3. **Core Functions** (7 functions)
- ✅ `get_or_create_profile` - Profile management
- ✅ `add_card_to_inventory` - Card management
- ✅ `update_user_balance` - Balance updates (with transactions)
- ✅ `record_game_session` - Game session recording
- ✅ `purchase_upgrade` - Upgrade purchases
- ✅ `get_leaderboard` - Leaderboard retrieval
- ✅ `find_pvp_opponent` - PvP matchmaking

### 4. **Cryptoku Functions** (6 functions)
- ✅ `ensure_cryptoku_hints` - Ensure hints record exists
- ✅ `use_cryptoku_hint` - Use a hint
- ✅ `reward_cryptoku_hint` - Reward hints for completion
- ✅ `purchase_cryptoku_hints` - Purchase hints
- ✅ `add_cryptoku_leaderboard_entry` - Add leaderboard entry
- ✅ `get_cryptoku_leaderboard` - Get leaderboard

### 5. **Function Security**
- ✅ Checks for `SECURITY DEFINER` on critical functions
- ✅ Checks for `search_path` configuration
- ✅ Verifies proper security settings

### 6. **RLS Policies**
- ✅ Checks RLS status on critical tables
- ✅ Verifies policy existence
- ✅ Checks for function bypass policies (transactions)

### 7. **Indexes & Triggers**
- ✅ Verifies indexes exist
- ✅ Checks trigger functions

### 8. **Function Tests**
- ✅ Tests `update_user_balance` (transaction recording)
- ✅ Tests `ensure_cryptoku_hints` (hint system)

## 🚀 How to Use

1. **Open Supabase SQL Editor**
   - Go to your Supabase dashboard
   - Click "SQL Editor" in the left sidebar

2. **Run the Verification Script**
   - Copy the entire contents of `COMPLETE_SUPABASE_VERIFICATION.sql`
   - Paste into the SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter

3. **Review Results**
   - Check each section for ✅ (success) or ⚠️/❌ (issues)
   - The final summary will show overall status

## ✅ Expected Results

### All Systems Operational
- **Tables Found:** 15+
- **Functions Found:** 4+ (core functions)
- **Secure Functions:** 3+ (with SECURITY DEFINER)
- **Final Status:** ✅ ALL SYSTEMS OPERATIONAL

## ⚠️ Common Issues

### Missing Tables
- **Issue:** Some tables don't exist
- **Fix:** Run the appropriate migration or script
- **Files:** `scripts/01-create-tables.sql`, migration files

### Missing Functions
- **Issue:** Functions not found
- **Fix:** Run `scripts/03-functions.sql` or migration files
- **Check:** Function security settings

### RLS Issues
- **Issue:** Policies missing or incorrect
- **Fix:** Run `scripts/02-rls-policies.sql` or `FIX_TRANSACTIONS_RLS_V2.sql`
- **Check:** Function bypass policies for transactions

### Function Security
- **Issue:** Functions missing SECURITY DEFINER
- **Fix:** Run `COMPLETE_SCHEMA_FIX.sql` or `FIX_TRANSACTIONS_RLS.sql`
- **Check:** All functions that access tables should have SECURITY DEFINER

## 📝 After Verification

If everything passes:
- ✅ Your database is fully configured
- ✅ All systems are operational
- ✅ Ready for production use

If issues are found:
- Review the specific section with issues
- Apply the recommended fixes
- Re-run verification to confirm

## 🔍 Quick Checks

### Test Transaction Recording
```sql
SELECT public.update_user_balance(
  (SELECT id FROM profiles LIMIT 1),
  0, 0, 10, 'test', 'Test'
);
-- Check transactions table for new entry
```

### Test Cryptoku Hints
```sql
SELECT public.ensure_cryptoku_hints((SELECT id FROM profiles LIMIT 1));
-- Check cryptoku_hints table
```

### Check Function Security
```sql
SELECT proname, prosecdef, pg_get_functiondef(oid) LIKE '%search_path%'
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname = 'update_user_balance';
```

## 🎉 Success Criteria

All of these should be ✅:
1. All 15+ expected tables exist
2. All core functions exist with SECURITY DEFINER
3. RLS policies are in place
4. Function tests pass (transactions recorded)
5. No critical errors in verification

Run the script and review the results!
