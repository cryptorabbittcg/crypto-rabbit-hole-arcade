-- =====================================================
-- FINAL VERIFICATION - Transaction Recording
-- =====================================================
-- Verify that update_user_balance is working correctly
-- for all currency types
-- =====================================================

-- =====================================================
-- STEP 1: Test All Currency Types
-- =====================================================
DO $$
DECLARE
  test_user_id UUID;
  points_before INTEGER;
  ape_before INTEGER;
  tickets_before INTEGER;
  points_after INTEGER;
  ape_after INTEGER;
  tickets_after INTEGER;
BEGIN
  -- Get test user
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  -- Get current balances
  SELECT points, ape_balance, tickets 
  INTO points_before, ape_before, tickets_before
  FROM public.profiles 
  WHERE id = test_user_id;
  
  -- Test POINTS
  PERFORM public.update_user_balance(
    test_user_id, 0, 0, 30, 'final_test', 'Final verification - points'
  );
  
  -- Test APE
  PERFORM public.update_user_balance(
    test_user_id, 10, 0, 0, 'final_test', 'Final verification - ape'
  );
  
  -- Test TICKETS
  PERFORM public.update_user_balance(
    test_user_id, 0, 5, 0, 'final_test', 'Final verification - tickets'
  );
  
  -- Get new balances
  SELECT points, ape_balance, tickets 
  INTO points_after, ape_after, tickets_after
  FROM public.profiles 
  WHERE id = test_user_id;
  
  -- Report results
  RAISE NOTICE '=== BALANCE CHANGES ===';
  RAISE NOTICE 'Points: % -> % (change: %)', points_before, points_after, points_after - points_before;
  RAISE NOTICE 'APE: % -> % (change: %)', ape_before, ape_after, ape_after - ape_before;
  RAISE NOTICE 'Tickets: % -> % (change: %)', tickets_before, tickets_after, tickets_after - tickets_before;
END $$;

-- =====================================================
-- STEP 2: Verify All Transactions Were Recorded
-- =====================================================
SELECT 
  'Transaction verification' as check_name,
  currency,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  CASE 
    WHEN currency = 'points' AND COUNT(*) = 1 AND SUM(amount) = 30 THEN '✅ Points transaction OK'
    WHEN currency = 'ape' AND COUNT(*) = 1 AND SUM(amount) = 10 THEN '✅ APE transaction OK'
    WHEN currency = 'tickets' AND COUNT(*) = 1 AND SUM(amount) = 5 THEN '✅ Tickets transaction OK'
    ELSE '⚠️ Check manually'
  END as status
FROM public.transactions
WHERE transaction_type = 'final_test'
GROUP BY currency
ORDER BY currency;

-- =====================================================
-- STEP 3: Show All Test Transactions
-- =====================================================
SELECT 
  'All test transactions' as check_name,
  id,
  transaction_type,
  amount,
  currency,
  description,
  created_at
FROM public.transactions
WHERE transaction_type = 'final_test'
ORDER BY created_at DESC;

-- =====================================================
-- STEP 4: Final Summary
-- =====================================================
SELECT 
  '=== FINAL SUMMARY ===' as summary,
  (SELECT COUNT(*) FROM public.transactions WHERE transaction_type = 'final_test') as total_transactions,
  (SELECT COUNT(DISTINCT currency) FROM public.transactions WHERE transaction_type = 'final_test') as currencies_tested,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.transactions WHERE transaction_type = 'final_test') = 3
      AND (SELECT COUNT(DISTINCT currency) FROM public.transactions WHERE transaction_type = 'final_test') = 3
    THEN '✅ ALL TRANSACTIONS RECORDED - SYSTEM WORKING!'
    ELSE '⚠️ Some transactions missing - check above'
  END as final_status;
