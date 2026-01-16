-- =====================================================
-- DIAGNOSE: Why Function Can't Find Table
-- =====================================================
-- Run this to diagnose the issue
-- =====================================================

-- Check 1: Does table exist?
SELECT 
  'Table exists check' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'cryptoku_hints'
    ) THEN '✅ YES'
    ELSE '❌ NO'
  END as result;

-- Check 2: What schema is it in?
SELECT 
  'Table schema' as check_name,
  schemaname,
  tablename
FROM pg_tables
WHERE tablename = 'cryptoku_hints';

-- Check 3: Can we query it directly?
SELECT 
  'Direct query test' as check_name,
  COUNT(*) as row_count
FROM public.cryptoku_hints;

-- Check 4: Function search_path
SELECT 
  'Function search_path' as check_name,
  p.proname,
  pg_get_functiondef(p.oid) LIKE '%search_path%' as has_search_path,
  pg_get_functiondef(p.oid) LIKE '%public.cryptoku_hints%' as uses_public_schema,
  pg_get_functiondef(p.oid) LIKE '%cryptoku_hints%' as references_table
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'ensure_cryptoku_hints';

-- Check 5: Current search_path
SHOW search_path;

-- Check 6: Function owner permissions
SELECT 
  'Function owner' as check_name,
  p.proname,
  pg_get_userbyid(p.proowner) as owner,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'ensure_cryptoku_hints';
