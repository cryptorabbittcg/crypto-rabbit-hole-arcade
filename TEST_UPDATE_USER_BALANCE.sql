-- =====================================================
-- TEST update_user_balance Function
-- =====================================================
-- Verify it can find profiles table and works correctly
-- =====================================================

-- Test update_user_balance
SELECT 
  'update_user_balance test' as test_name,
  public.update_user_balance(
    (SELECT id FROM profiles LIMIT 1),
    0,   -- ape_change
    0,   -- tickets_change
    5,   -- points_change (small test amount)
    'test',
    'Testing update_user_balance function'
  ) as result,
  '✅ Should return: (no error)' as expected;

-- Verify points were updated in profiles
SELECT 
  'Profiles points' as check_name,
  id,
  wallet_address,
  points,
  ape_balance,
  tickets
FROM public.profiles
WHERE id = (SELECT id FROM profiles LIMIT 1);

-- Verify leaderboard was updated
SELECT 
  'Leaderboard total_points' as check_name,
  user_id,
  total_points,
  cryptoku_high_score,
  ape_in_high_score
FROM public.leaderboard
WHERE user_id = (SELECT id FROM profiles LIMIT 1);

-- Check if transaction was recorded
SELECT 
  'Transaction recorded' as check_name,
  COUNT(*) as transaction_count,
  MAX(amount) as last_amount,
  MAX(currency) as last_currency
FROM public.transactions
WHERE user_id = (SELECT id FROM profiles LIMIT 1)
  AND transaction_type = 'test';
