-- =====================================================
-- UNIFIED PVP - RPC PERMISSIONS LOCKDOWN
-- =====================================================
-- Lock down the unified PvP RPCs so PUBLIC/anon cannot spam actions.

REVOKE EXECUTE ON FUNCTION public.pvp_action_draw(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pvp_action_roll(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pvp_action_stack(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pvp_action_forfeit(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pvp_join_match_v1(uuid, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pvp_join_match_v1(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pvp_find_or_create_public_match(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pvp_ensure_game_state_v1(uuid) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.pvp_action_draw(uuid, uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.pvp_action_roll(uuid, uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.pvp_action_stack(uuid, uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.pvp_action_forfeit(uuid, uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.pvp_join_match_v1(uuid, text, uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.pvp_join_match_v1(uuid, uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.pvp_find_or_create_public_match(text, uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.pvp_ensure_game_state_v1(uuid) FROM anon';
  END IF;
END$$;

GRANT EXECUTE ON FUNCTION public.pvp_action_draw(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pvp_action_roll(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pvp_action_stack(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pvp_action_forfeit(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pvp_join_match_v1(uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pvp_join_match_v1(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pvp_find_or_create_public_match(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pvp_ensure_game_state_v1(uuid) TO authenticated, service_role;

