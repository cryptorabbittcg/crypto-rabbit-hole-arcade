# Fix Transactions RLS Issue

## 🔍 Root Cause

The `transactions` table has RLS enabled with a policy that requires:
```sql
WITH CHECK (user_id::text = current_setting('app.current_user_id', true))
```

When `update_user_balance` runs with `SECURITY DEFINER`, it should bypass RLS, but the policy check still requires the session variable to be set. If the variable isn't set, the INSERT fails silently.

## ✅ Solution

**Option 1 (Recommended):** Add a policy allowing service role inserts
- Allows admin client (using `service_role_key`) to insert transactions
- More secure than Option 2

**Option 3 (Also Recommended):** Modify function to set session variable
- Function now sets `app.current_user_id` before INSERT
- Ensures RLS policy passes
- Works with existing policies

## 🚀 Apply the Fix

Run `FIX_TRANSACTIONS_RLS.sql` which:
1. ✅ Adds service role policy (Option 1)
2. ✅ Updates function to set session variable (Option 3)
3. ✅ Verifies the fix

## 🧪 Test

After applying, run:
```sql
SELECT public.update_user_balance(
  (SELECT id FROM profiles LIMIT 1),
  0, 0, 10, 'test', 'Test transaction'
);

-- Check if transaction was created
SELECT * FROM transactions 
WHERE transaction_type = 'test' 
ORDER BY created_at DESC LIMIT 1;
```

## 📝 Notes

- Both Option 1 and Option 3 are applied for maximum compatibility
- Option 2 (permissive policy) is commented out - only use if needed
- The function now explicitly sets the session variable, ensuring RLS passes
