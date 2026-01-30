-- =====================================================
-- APE IN PVP MODE - RPC PERMISSIONS LOCKDOWN
-- =====================================================
-- After verifying end-to-end, lock down RPC execution so PUBLIC/anon cannot spam actions.

REVOKE EXECUTE ON FUNCTION public.ape_in_pvp_action_draw(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ape_in_pvp_action_roll(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ape_in_pvp_action_stack(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ape_in_pvp_action_forfeit(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ape_in_pvp_join_match_v1(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ape_in_pvp_ensure_game_state_v1(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ape_in_pvp_build_initial_game_state_v1(uuid, uuid, integer) FROM PUBLIC;

-- If anon role exists, explicitly revoke (harmless if role doesn't exist in a given env)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.ape_in_pvp_action_draw(uuid, uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.ape_in_pvp_action_roll(uuid, uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.ape_in_pvp_action_stack(uuid, uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.ape_in_pvp_action_forfeit(uuid, uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.ape_in_pvp_join_match_v1(uuid, uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.ape_in_pvp_ensure_game_state_v1(uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.ape_in_pvp_build_initial_game_state_v1(uuid, uuid, integer) FROM anon';
  END IF;
END$$;

GRANT EXECUTE ON FUNCTION public.ape_in_pvp_action_draw(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ape_in_pvp_action_roll(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ape_in_pvp_action_stack(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ape_in_pvp_action_forfeit(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ape_in_pvp_join_match_v1(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ape_in_pvp_ensure_game_state_v1(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ape_in_pvp_build_initial_game_state_v1(uuid, uuid, integer) TO authenticated, service_role;

