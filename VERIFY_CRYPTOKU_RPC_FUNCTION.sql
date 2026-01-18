-- =====================================================
-- VERIFY CRYPTOKU LEADERBOARD RPC FUNCTION IN PRODUCTION
-- =====================================================
-- Run this in Supabase SQL Editor to verify function signature,
-- permissions, and test the function directly.
-- =====================================================

-- =====================================================
-- 1. GET FUNCTION DEFINITION
-- =====================================================
-- This shows the complete function definition including parameters,
-- return type, SECURITY DEFINER status, and search_path
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.proname = 'add_cryptoku_leaderboard_entry';

-- =====================================================
-- 2. VERIFY FUNCTION PARAMETERS
-- =====================================================
-- This shows the parameter names and types in order
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  pg_get_function_result(p.oid) as return_type,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type,
  p.proconfig as config_settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.proname = 'add_cryptoku_leaderboard_entry';

-- =====================================================
-- 3. CHECK FUNCTION PERMISSIONS AND CONFIG
-- =====================================================
SELECT 
  p.proname as function_name,
  CASE WHEN p.prosecdef THEN 'YES' ELSE 'NO' END as is_security_definer,
  CASE 
    WHEN p.proconfig IS NULL THEN 'No search_path set'
    ELSE array_to_string(p.proconfig, ', ')
  END as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.proname = 'add_cryptoku_leaderboard_entry';

-- =====================================================
-- 4. MANUAL TEST CALL
-- =====================================================
-- Replace the user_id with your actual user_id from profiles table
-- Use a unique run_id that doesn't exist yet
SELECT add_cryptoku_leaderboard_entry(
  'run_test_123' as p_run_id,
  '389424f2-a6f2-4d11-bd33-70bda05c56de'::uuid as p_user_id,
  'DEGEN' as p_mode,
  486 as p_score,
  318 as p_time_seconds,
  0 as p_hints_used,
  0 as p_errors,
  true as p_completed,
  false as p_forfeited
) as returned_entry_id;

-- =====================================================
-- 5. VERIFY TABLE EXISTS AND CHECK CONSTRAINTS
-- =====================================================
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cryptoku_leaderboard'
ORDER BY ordinal_position;

-- Check constraints on the table
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE n.nspname = 'public'
  AND cl.relname = 'cryptoku_leaderboard';

-- =====================================================
-- 6. CHECK RLS POLICIES
-- =====================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'cryptoku_leaderboard';

-- =====================================================
-- EXPECTED RESULTS
-- =====================================================
-- Function should have:
-- - Parameters: p_run_id TEXT, p_user_id UUID, p_mode TEXT, p_score INTEGER, 
--   p_time_seconds INTEGER, p_hints_used INTEGER, p_errors INTEGER, 
--   p_completed BOOLEAN DEFAULT TRUE, p_forfeited BOOLEAN DEFAULT FALSE
-- - Return type: UUID
-- - SECURITY DEFINER: YES
-- - search_path: should include 'public' or be 'pg_catalog, public'
--
-- If any of these don't match, the function needs to be recreated using
-- the SQL from: supabase/migrations/20260116094000_create_cryptoku_leaderboard_table.sql
-- =====================================================
