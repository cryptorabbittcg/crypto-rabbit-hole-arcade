-- =====================================================
-- FIX RLS PERFORMANCE ISSUES (auth_rls_initplan)
-- =====================================================
-- This migration fixes Supabase linter WARN auth_rls_initplan by rewriting
-- RLS policies to avoid per-row auth/current_setting evaluation.
--
-- The issue: Calls to current_setting() and auth.<function>() in RLS policies
-- are being re-evaluated for each row, causing suboptimal query performance.
--
-- The fix: Wrap these calls in (select ...) to evaluate once per query instead
-- of once per row.
-- =====================================================

DO $$
DECLARE
  r RECORD;
  new_qual TEXT;
  new_with_check TEXT;
  roles_sql TEXT;
  cmd_sql TEXT;
  restrictive_sql TEXT;
  temp_expr TEXT;

BEGIN
  -- Loop through all target policies
  FOR r IN
    SELECT *
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (tablename = 'card_inventory' AND policyname IN ('Users can view own cards', 'Users can insert own cards', 'Users can update own cards')) OR
        (tablename = 'upgrades_inventory' AND policyname IN ('Users can view own upgrades', 'Users can insert own upgrades', 'Users can update own upgrades')) OR
        (tablename = 'game_sessions' AND policyname IN ('Users can view own game sessions', 'Users can insert own game sessions', 'Users can update own game sessions')) OR
        (tablename = 'pvp_matches' AND policyname IN ('Users can view own matches', 'Users can create matches', 'Users can update own matches')) OR
        (tablename = 'match_history' AND policyname IN ('Users can view own match history', 'Users can insert own match history')) OR
        (tablename = 'transactions' AND policyname IN ('Users can view own transactions', 'Users can insert own transactions')) OR
        (tablename = 'leaderboard' AND policyname IN ('Users can insert own leaderboard entry', 'Users can update own leaderboard entry')) OR
        (tablename = 'achievements' AND policyname IN ('Users can view own achievements', 'Users can insert own achievements')) OR
        (tablename = 'raid_participation' AND policyname IN ('Users can view own raid participation', 'Users can insert own raid participation', 'Users can update own raid participation')) OR
        (tablename = 'pack_openings' AND policyname IN ('Users can view own pack openings', 'Users can insert own pack openings'))
      )
  LOOP
    -- Apply initplan fixes to policy expressions
    -- Fix USING clause
    IF r.qual IS NULL THEN
      new_qual := NULL;
    ELSE
      temp_expr := r.qual;
      -- Wrap common auth calls
      temp_expr := REPLACE(temp_expr, 'auth.uid()', '(select auth.uid())');
      temp_expr := REPLACE(temp_expr, 'auth.role()', '(select auth.role())');
      -- Wrap current_setting(...) calls
      temp_expr := regexp_replace(temp_expr, 'current_setting\(([^)]*)\)', '(select current_setting(\1))', 'gi');
      new_qual := temp_expr;
    END IF;

    -- Fix WITH CHECK clause
    IF r.with_check IS NULL THEN
      new_with_check := NULL;
    ELSE
      temp_expr := r.with_check;
      -- Wrap common auth calls
      temp_expr := REPLACE(temp_expr, 'auth.uid()', '(select auth.uid())');
      temp_expr := REPLACE(temp_expr, 'auth.role()', '(select auth.role())');
      -- Wrap current_setting(...) calls
      temp_expr := regexp_replace(temp_expr, 'current_setting\(([^)]*)\)', '(select current_setting(\1))', 'gi');
      new_with_check := temp_expr;
    END IF;

    -- Build roles clause
    -- r.roles is a text[] in pg_policies; when null/empty, policy defaults to PUBLIC
    IF r.roles IS NULL OR array_length(r.roles, 1) IS NULL THEN
      roles_sql := 'TO public';
    ELSE
      roles_sql := 'TO ' || array_to_string(r.roles, ', ');
    END IF;

    -- Build command clause
    -- pg_policies.cmd values are: SELECT, INSERT, UPDATE, DELETE, ALL
    cmd_sql := 'FOR ' || r.cmd;

    -- Build permissive/restrictive clause
    -- pg_policies.permissive can be boolean or text depending on PostgreSQL version
    -- CREATE POLICY supports "as restrictive" for restrictive policies
    -- Cast to text for safe comparison (handles both boolean and text types)
    IF COALESCE(r.permissive::text, '') IN ('RESTRICTIVE', 'f', 'false') THEN
      restrictive_sql := 'AS restrictive';
    ELSE
      restrictive_sql := '';
    END IF;

    -- Drop existing policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename
    );

    -- Recreate policy with optimized expressions
    EXECUTE
      'CREATE POLICY ' || quote_ident(r.policyname) ||
      ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename) ||
      CASE WHEN restrictive_sql != '' THEN ' ' || restrictive_sql ELSE '' END ||
      ' ' || cmd_sql ||
      ' ' || roles_sql ||
      CASE WHEN new_qual IS NOT NULL THEN ' USING (' || new_qual || ')' ELSE '' END ||
      CASE WHEN new_with_check IS NOT NULL THEN ' WITH CHECK (' || new_with_check || ')' ELSE '' END ||
      ';';
  END LOOP;
END $$;

-- =====================================================
-- ROLLBACK SECTION (COMMENTED)
-- =====================================================
-- To rollback this migration, you would need to:
--
-- 1. Re-run the original policy creation statements from scripts/02-rls-policies.sql
--    which use unwrapped current_setting() calls.
--
-- NOTE: Rolling back this performance fix is NOT RECOMMENDED as it will reintroduce
--       the performance issues. Only rollback if absolutely necessary for troubleshooting.
-- =====================================================

