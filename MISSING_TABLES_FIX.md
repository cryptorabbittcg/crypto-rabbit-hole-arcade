# Missing Tables Fix

## 🔴 Problem

The `transactions` table may be missing, which is why `update_user_balance` isn't recording transactions.

## ✅ Solution

### Step 1: Check What Tables Are Missing

**Run:** `CHECK_ALL_TABLES.sql`

This will show which tables exist and which are missing.

### Step 2: Create Missing Tables

**Run:** `CREATE_MISSING_TABLES.sql`

This will:
- ✅ Create `transactions` table (if missing)
- ✅ Create `leaderboard` table (if missing)
- ✅ Create indexes
- ✅ Test `update_user_balance` again

## 🎯 Expected Tables

All of these should exist:
- ✅ `profiles` - User profiles
- ✅ `cryptoku_leaderboard` - Cryptoku game results
- ✅ `cryptoku_hints` - Hint balances
- ✅ `leaderboard` - Main leaderboard
- ✅ `game_sessions` - Game session records
- ⚠️ `transactions` - Transaction history (may be missing)

## 🔧 Quick Fix

If `transactions` table is missing, run this:

```sql
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  description TEXT,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
```

## ✅ After Creating Tables

1. **Run `CHECK_ALL_TABLES.sql`** - Verify all tables exist
2. **Test `update_user_balance`** - Should now record transactions
3. **Verify transactions** - Check that records are created

## 🎯 Why Transactions Weren't Recorded

The `update_user_balance` function tries to INSERT into `transactions` table, but if the table doesn't exist, the INSERT fails silently (or the function fails). Creating the table will fix this.
