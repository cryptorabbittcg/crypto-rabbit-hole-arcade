-- =====================================================
-- GUARD: DROP LEGACY APE IN NAMESPACED ACTION RPCs
-- =====================================================
-- We keep old migrations for history, but ensure legacy function names
-- cannot persist (or be reintroduced by earlier migrations) after a full replay.

-- Drop legacy namespaced RPCs if they exist (safety guard)
DROP FUNCTION IF EXISTS public.ape_in_pvp_action_draw(uuid, uuid);
DROP FUNCTION IF EXISTS public.ape_in_pvp_action_roll(uuid, uuid);
DROP FUNCTION IF EXISTS public.ape_in_pvp_action_stack(uuid, uuid);
DROP FUNCTION IF EXISTS public.ape_in_pvp_action_forfeit(uuid, uuid);

