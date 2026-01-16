# Complete Setup Guide - cryptoku_hints Table

## ✅ Step 1: COMPLETE - Table Created

The `cryptoku_hints` table has been created successfully with 6 columns.

## 🔄 Step 2: Complete the Setup

Now you need to:
1. **Add RLS Policies** - So functions can access the table
2. **Create Trigger** - For automatic `updated_at` timestamp
3. **Test Functions** - Verify everything works

### Quick Way: Run Complete Setup Script

**File:** `VERIFY_AND_COMPLETE_SETUP.sql`

This script will:
- ✅ Verify table structure
- ✅ Create RLS policies
- ✅ Create trigger
- ✅ Test all functions
- ✅ Verify everything works

### Manual Way: Step by Step

#### Step 2a: Add RLS Policies
Run: `CREATE_CRYPTOKU_HINTS_POLICIES.sql`

#### Step 2b: Create Trigger
Run: `CREATE_CRYPTOKU_HINTS_TRIGGER.sql`

#### Step 2c: Test Functions
Run: `QUICK_TEST_FUNCTIONS.sql`

## 🎯 Recommended Next Steps

1. **Run `VERIFY_AND_COMPLETE_SETUP.sql`** - This does everything at once
2. **Verify all tests pass** - Check the output
3. **Test in your application** - Try submitting a Cryptoku game result

## ✅ Success Criteria

After completing setup, you should see:
- ✅ Table has 6 columns
- ✅ 3 RLS policies created
- ✅ 1 trigger created
- ✅ `ensure_cryptoku_hints` function works
- ✅ `use_cryptoku_hint` function works
- ✅ `reward_cryptoku_hint` function works

## 🔍 What Each Component Does

### RLS Policies
- **SELECT policy**: Allows anyone to read hints (for leaderboards/stats)
- **INSERT policy**: Allows functions to create hint records
- **UPDATE policy**: Allows functions to update hint records

### Trigger
- Automatically updates `updated_at` timestamp when records are modified

### Functions
- `ensure_cryptoku_hints`: Creates default hint record for a user
- `use_cryptoku_hint`: Uses one hint (atomic operation)
- `reward_cryptoku_hint`: Rewards hint on game completion
- `purchase_cryptoku_hints`: Purchases additional hints

## 🐛 If You Get Errors

### Error: "permission denied"
- **Cause:** RLS policies not set up
- **Fix:** Run `CREATE_CRYPTOKU_HINTS_POLICIES.sql`

### Error: "function does not exist"
- **Cause:** Functions not created
- **Fix:** Run the full migration `20260117010000_create_cryptoku_hints_table.sql`

### Error: "relation cryptoku_hints does not exist"
- **Cause:** Table creation failed (unlikely now)
- **Fix:** Run `SIMPLE_FIX.sql` again

## 📊 Current Status

- ✅ Table created (6 columns)
- ⏳ RLS policies (need to be added)
- ⏳ Trigger (needs to be created)
- ⏳ Functions tested (need to verify)

## 🚀 Next Action

**Run `VERIFY_AND_COMPLETE_SETUP.sql`** to finish the setup!
