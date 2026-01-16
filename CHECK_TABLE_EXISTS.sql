-- =====================================================
-- CHECK IF TABLE EXISTS
-- =====================================================
-- Run this to verify the table actually exists
-- =====================================================

-- Check 1: Does table exist in information_schema?
SELECT 
  'information_schema check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'cryptoku_hints'
    ) THEN '✅ EXISTS'
    ELSE '❌ DOES NOT EXIST'
  END as status;

-- Check 2: Does table exist in pg_tables?
SELECT 
  'pg_tables check' as check_type,
  schemaname,
  tablename,
  CASE 
    WHEN schemaname = 'public' AND tablename = 'cryptoku_hints' THEN '✅ FOUND'
    ELSE '❌ NOT FOUND'
  END as status
FROM pg_tables
WHERE tablename = 'cryptoku_hints';

-- Check 3: Try to query the table directly
SELECT 
  'Direct query test' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.cryptoku_hints LIMIT 1) THEN '✅ CAN QUERY'
    ELSE '⚠️ TABLE EXISTS BUT EMPTY OR CANNOT QUERY'
  END as status;

-- Check 4: List all tables in public schema
SELECT 
  'All tables in public schema' as check_type,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%cryptoku%'
ORDER BY table_name;

-- Check 5: Check if table exists in a different schema
SELECT 
  'Tables in all schemas' as check_type,
  schemaname,
  tablename
FROM pg_tables
WHERE tablename = 'cryptoku_hints';
