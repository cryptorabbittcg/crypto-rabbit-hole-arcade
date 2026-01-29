-- =====================================================
-- APE IN PVP MODE - PHASE 3 (SANDY-PARITY):
-- Full Sandy deck + Ape In + Bearish caps + balanced dice
-- =====================================================
--
-- NOTE:
-- This migration exists to keep the repo in sync with SQL that was applied
-- in Supabase. It replaces the Phase 3 PvP helper + action RPCs with
-- Sandy-parity implementations (two-human turn ownership, server-authoritative).
--
-- ----------------------------
-- Helper: weighted random int
-- ----------------------------
CREATE OR REPLACE FUNCTION public.pvp_weighted_choice_index(p_weights numeric[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
IMMUTABLE
AS $$
DECLARE
  v_total numeric := 0;
  v_r numeric;
  i integer;
BEGIN
  IF p_weights IS NULL OR array_length(p_weights, 1) IS NULL THEN
    RAISE EXCEPTION 'weights required';
  END IF;

  FOR i IN 1..array_length(p_weights, 1) LOOP
    v_total := v_total + GREATEST(p_weights[i], 0);
  END LOOP;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'total weight must be > 0';
  END IF;

  v_r := random() * v_total;

  FOR i IN 1..array_length(p_weights, 1) LOOP
    v_r := v_r - GREATEST(p_weights[i], 0);
    IF v_r <= 0 THEN
      RETURN i;
    END IF;
  END LOOP;

  RETURN array_length(p_weights, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_weighted_choice_index(numeric[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.pvp_weighted_choice_index(numeric[]) TO authenticated;

-- -----------------------------------------
-- Helper: Sandy "balanced" dice (1 less likely)
-- Weights: 1=0.7, others=1.0
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.pvp_roll_die_balanced()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
VOLATILE
AS $$
DECLARE
  v_idx int;
  v_faces int[] := ARRAY[1,2,3,4,5,6];
  v_weights numeric[] := ARRAY[0.7,1.0,1.0,1.0,1.0,1.0];
BEGIN
  v_idx := public.pvp_weighted_choice_index(v_weights);
  RETURN v_faces[v_idx];
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_roll_die_balanced() TO service_role;
GRANT EXECUTE ON FUNCTION public.pvp_roll_die_balanced() TO authenticated;

-- ---------------------------------------------------------
-- Build initial game_state v1 (Sandy-parity PvP schema)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pvp_build_initial_game_state_v1(
  p_player1_id uuid,
  p_player2_id uuid,
  p_first_turn_player integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
STABLE
AS $$
DECLARE
  v_seat1 uuid;
  v_seat2 uuid;
BEGIN
  IF p_player2_id IS NULL THEN
    RETURN jsonb_build_object(
      'state_version', 1,
      'turn_number', 0,
      'phase', 'WAITING_FOR_OPPONENT',
      'round_number', 0,
      'seat_map', jsonb_build_object('seat1', NULL, 'seat2', NULL),
      'current_turn_seat', NULL,

      'scores', jsonb_build_object(
        'seat1_total', 0,
        'seat2_total', 0,
        'seat1_turn', 0,
        'seat2_turn', 0
      ),

      -- Per-seat status flags
      'seat_flags', jsonb_build_object(
        'seat1_ape_in_active', false,
        'seat2_ape_in_active', false
      ),

      -- Bearish usage caps (Sandy-parity for PvP request)
      'bearish_counts', jsonb_build_object(
        'Reset', 0,
        'Half', 0,
        'Minus10', 0
      ),

      -- Last draw name (for "no consecutive Ape In")
      'last_draw_name', NULL,

      -- Pending card (what roll will resolve)
      'pending_card', NULL,

      'last_draw', NULL,
      'last_roll', NULL,
      'last_action', NULL,
      'action_counts', jsonb_build_object('seat1_actions', 0, 'seat2_actions', 0, 'total_actions', 0),

      -- Deck config: same Sandy weights, but bearish_weight bumped slightly (Sandy=2; PvP=3)
      'deck_config', jsonb_build_object(
        'bearish_weight', 3,
        'bear_reset_max', 1,
        'bear_half_max', 1,
        'bear_minus10_max', 6,
        'mode', 'pvp_sandy_parity_v1'
      )
    );
  END IF;

  IF p_first_turn_player = 1 THEN
    v_seat1 := p_player1_id;
    v_seat2 := p_player2_id;
  ELSE
    v_seat1 := p_player2_id;
    v_seat2 := p_player1_id;
  END IF;

  RETURN jsonb_build_object(
    'state_version', 1,
    'turn_number', 0,
    'phase', 'DRAW',
    'round_number', 1,

    'seat_map', jsonb_build_object(
      'seat1', v_seat1::text,
      'seat2', v_seat2::text
    ),
    'current_turn_seat', 'seat1',

    'scores', jsonb_build_object(
      'seat1_total', 0,
      'seat2_total', 0,
      'seat1_turn', 0,
      'seat2_turn', 0
    ),

    'seat_flags', jsonb_build_object(
      'seat1_ape_in_active', false,
      'seat2_ape_in_active', false
    ),

    'bearish_counts', jsonb_build_object(
      'Reset', 0,
      'Half', 0,
      'Minus10', 0
    ),

    'last_draw_name', NULL,
    'pending_card', NULL,

    'last_draw', NULL,
    'last_roll', NULL,
    'last_action', NULL,
    'action_counts', jsonb_build_object('seat1_actions', 0, 'seat2_actions', 0, 'total_actions', 0),

    'deck_config', jsonb_build_object(
      'bearish_weight', 3,
      'bear_reset_max', 1,
      'bear_half_max', 1,
      'bear_minus10_max', 6,
      'mode', 'pvp_sandy_parity_v1'
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_build_initial_game_state_v1(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.pvp_build_initial_game_state_v1(uuid, uuid, integer) TO authenticated;

-- ---------------------------------------
-- Ensure game_state initialized to v1
-- ---------------------------------------
CREATE OR REPLACE FUNCTION public.pvp_ensure_game_state_v1(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
VOLATILE
AS $$
DECLARE
  v_match record;
  v_state jsonb;
BEGIN
  SELECT *
  INTO v_match
  FROM public.ape_in_pvp_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF (v_match.game_state->>'state_version') = '1'
     AND (v_match.game_state->>'phase') IN ('WAITING_FOR_OPPONENT','DRAW','ROLL','DECISION','GAME_END')
     AND (v_match.game_state->'seat_map') IS NOT NULL THEN
    RETURN v_match.game_state;
  END IF;

  IF v_match.player2_id IS NULL OR v_match.rolled_at IS NULL OR v_match.first_turn_player IS NULL THEN
    RETURN v_match.game_state;
  END IF;

  v_state := public.pvp_build_initial_game_state_v1(v_match.player1_id, v_match.player2_id, v_match.first_turn_player);

  UPDATE public.ape_in_pvp_matches
  SET game_state = v_state
  WHERE id = p_match_id;

  RETURN v_state;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_ensure_game_state_v1(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pvp_ensure_game_state_v1(uuid) TO authenticated;

-- ======================================================
-- Phase 3: Draw action (Sandy-parity deck + Ape In)
-- ======================================================
CREATE OR REPLACE FUNCTION public.pvp_action_draw(
  p_match_id uuid,
  p_actor_user_id uuid
)
RETURNS TABLE (
  id uuid,
  match_status text,
  winner_id uuid,
  forfeited_by uuid,
  last_action_at timestamptz,
  game_state jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
VOLATILE
AS $$
DECLARE
  v_match record;
  v_state jsonb;
  v_phase text;
  v_current_turn_seat text;
  v_seat_map jsonb;
  v_current_user_id uuid;
  v_now timestamptz := now();
  v_turn_number int;
  v_round_number int;

  v_last_draw_name text;

  -- Weights (Sandy)
  w_cipher1 int := 6;
  w_cipher2 int := 8;
  w_cipher3 int := 9;
  w_cipher5 int := 15;
  w_cipher8 int := 15;
  w_oracle int := 10;
  w_historacle int := 4;
  w_special int := 15;

  v_bearish_weight int;

  -- Bearish caps
  v_reset_max int;
  v_half_max int;
  v_minus10_max int;

  v_bearish_counts jsonb;
  c_reset int;
  c_half int;
  c_minus10 int;

  -- Candidate group selection
  v_groups text[];
  v_group_weights numeric[];
  v_group_idx int;
  v_group text;

  -- Card within group
  v_card jsonb;
  v_card_id text;

  -- Seat flag keys
  v_flags jsonb;
  v_ape_key text;

  -- Pools
  v_cipher1 jsonb[];
  v_cipher2 jsonb[];
  v_cipher3 jsonb[];
  v_cipher5 jsonb[];
  v_cipher8 jsonb[];
  v_oracles jsonb[];
  v_historacles jsonb[];
  v_specials jsonb[];
  v_bearish jsonb[];
  v_bearish_weights numeric[];
  v_idx int;

  v_exclude_ape_in boolean := false;
BEGIN
  SELECT *
  INTO v_match
  FROM public.ape_in_pvp_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.player1_id <> p_actor_user_id AND v_match.player2_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Access denied: not a participant';
  END IF;

  IF v_match.match_status <> 'in_progress' THEN
    RAISE EXCEPTION 'Match not in progress';
  END IF;

  v_state := public.pvp_ensure_game_state_v1(p_match_id);
  v_phase := COALESCE(v_state->>'phase', '');

  IF v_phase <> 'DRAW' AND v_phase <> 'DECISION' THEN
    RAISE EXCEPTION 'Invalid phase for draw: %', v_phase;
  END IF;

  v_current_turn_seat := COALESCE(v_state->>'current_turn_seat', '');
  v_seat_map := v_state->'seat_map';
  v_current_user_id := (v_seat_map->>v_current_turn_seat)::uuid;

  IF v_current_user_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;

  v_turn_number := COALESCE((v_state->>'turn_number')::int, 0) + 1;
  v_round_number := COALESCE((v_state->>'round_number')::int, 1);

  v_last_draw_name := COALESCE(v_state->>'last_draw_name', NULL);

  -- Exclude consecutive Ape In (Sandy rule)
  IF v_last_draw_name = 'Ape In!' THEN
    v_exclude_ape_in := true;
  END IF;

  v_bearish_weight := COALESCE((v_state->'deck_config'->>'bearish_weight')::int, 3);
  v_reset_max := COALESCE((v_state->'deck_config'->>'bear_reset_max')::int, 1);
  v_half_max := COALESCE((v_state->'deck_config'->>'bear_half_max')::int, 1);
  v_minus10_max := COALESCE((v_state->'deck_config'->>'bear_minus10_max')::int, 6);

  v_bearish_counts := COALESCE(v_state->'bearish_counts', jsonb_build_object('Reset',0,'Half',0,'Minus10',0));
  c_reset := COALESCE((v_bearish_counts->>'Reset')::int, 0);
  c_half := COALESCE((v_bearish_counts->>'Half')::int, 0);
  c_minus10 := COALESCE((v_bearish_counts->>'Minus10')::int, 0);

  -- Define full Sandy pools (names/images match your TS paths)
  v_cipher1 := ARRAY[
    jsonb_build_object('name','Abbie','type','Cipher','value',1,'image_url','/features/games/ape-in/assets/images/cards/Cipher_1pt_Abbie.jpg'),
    jsonb_build_object('name','Alita','type','Cipher','value',1,'image_url','/features/games/ape-in/assets/images/cards/Cipher_1pt_Alita.jpg'),
    jsonb_build_object('name','EnJ1n','type','Cipher','value',1,'image_url','/features/games/ape-in/assets/images/cards/Cipher_1pt_EnJ1n.jpg'),
    jsonb_build_object('name','Jakey','type','Cipher','value',1,'image_url','/features/games/ape-in/assets/images/cards/Cipher_1pt_Jakey.jpg')
  ];
  v_cipher2 := ARRAY[
    jsonb_build_object('name','Ace','type','Cipher','value',2,'image_url','/features/games/ape-in/assets/images/cards/Cipher_2pt_Ace.jpg'),
    jsonb_build_object('name','Beats','type','Cipher','value',2,'image_url','/features/games/ape-in/assets/images/cards/Cipher_2pt_Beats.jpg'),
    jsonb_build_object('name','Dash','type','Cipher','value',2,'image_url','/features/games/ape-in/assets/images/cards/Cipher_2pt_Dash.jpg'),
    jsonb_build_object('name','Ray','type','Cipher','value',2,'image_url','/features/games/ape-in/assets/images/cards/Cipher_2pt_Ray.jpg')
  ];
  v_cipher3 := ARRAY[
    jsonb_build_object('name','Jazzy','type','Cipher','value',3,'image_url','/features/games/ape-in/assets/images/cards/Cipher_3pt_Jazzy.jpg'),
    jsonb_build_object('name','Meemo','type','Cipher','value',3,'image_url','/features/games/ape-in/assets/images/cards/Cipher_3pt_Meemo.jpg'),
    jsonb_build_object('name','Sabrina','type','Cipher','value',3,'image_url','/features/games/ape-in/assets/images/cards/Cipher_3pt_Sabrina.jpg'),
    jsonb_build_object('name','Thea','type','Cipher','value',3,'image_url','/features/games/ape-in/assets/images/cards/Cipher_3pt_Thea.jpg')
  ];
  v_cipher5 := ARRAY[
    jsonb_build_object('name','Nero','type','Cipher','value',5,'image_url','/features/games/ape-in/assets/images/cards/Cipher_5pt_Nero.jpg'),
    jsonb_build_object('name','Saul','type','Cipher','value',5,'image_url','/features/games/ape-in/assets/images/cards/Cipher_5pt_Saul.jpg'),
    jsonb_build_object('name','Somi','type','Cipher','value',5,'image_url','/features/games/ape-in/assets/images/cards/Cipher_5pt_Somi.jpg'),
    jsonb_build_object('name','Wick','type','Cipher','value',5,'image_url','/features/games/ape-in/assets/images/cards/Cipher_5pt_Wick.jpg')
  ];
  v_cipher8 := ARRAY[
    jsonb_build_object('name','Sandy','type','Cipher','value',8,'image_url','/features/games/ape-in/assets/images/cards/Cipher_8pt_Sandy.jpg'),
    jsonb_build_object('name','Tala','type','Cipher','value',8,'image_url','/features/games/ape-in/assets/images/cards/Cipher_8pt_Tala.jpg'),
    jsonb_build_object('name','Tulip','type','Cipher','value',8,'image_url','/features/games/ape-in/assets/images/cards/Cipher_8pt_Tulip.jpg'),
    jsonb_build_object('name','Zacky','type','Cipher','value',8,'image_url','/features/games/ape-in/assets/images/cards/Cipher_8pt_Zacky.jpg')
  ];
  v_oracles := ARRAY[
    jsonb_build_object('name','Aida 1','type','Oracle','value',13,'image_url','/features/games/ape-in/assets/images/cards/Oracle_Aida_1.jpg'),
    jsonb_build_object('name','Aida 2','type','Oracle','value',13,'image_url','/features/games/ape-in/assets/images/cards/Oracle_Aida_2.jpg'),
    jsonb_build_object('name','Aida 3','type','Oracle','value',13,'image_url','/features/games/ape-in/assets/images/cards/Oracle_Aida_3.jpg'),
    jsonb_build_object('name','Lana 1','type','Oracle','value',13,'image_url','/features/games/ape-in/assets/images/cards/Oracle_Lana_1.jpg'),
    jsonb_build_object('name','Lana 2','type','Oracle','value',13,'image_url','/features/games/ape-in/assets/images/cards/Oracle_Lana_2.jpg'),
    jsonb_build_object('name','Lana 3','type','Oracle','value',13,'image_url','/features/games/ape-in/assets/images/cards/Oracle_Lana_3.jpg'),
    jsonb_build_object('name','Nifty 1','type','Oracle','value',13,'image_url','/features/games/ape-in/assets/images/cards/Oracle_Nifty_1.jpg'),
    jsonb_build_object('name','Nifty 2','type','Oracle','value',13,'image_url','/features/games/ape-in/assets/images/cards/Oracle_Nifty_2.jpg'),
    jsonb_build_object('name','Nifty 3','type','Oracle','value',13,'image_url','/features/games/ape-in/assets/images/cards/Oracle_Nifty_3.jpg'),
    jsonb_build_object('name','Sats 1','type','Oracle','value',13,'image_url','/features/games/ape-in/assets/images/cards/Oracle_Sats_1.jpg'),
    jsonb_build_object('name','Sats 2','type','Oracle','value',13,'image_url','/features/games/ape-in/assets/images/cards/Oracle_Sats_2.jpg'),
    jsonb_build_object('name','Sats 3','type','Oracle','value',13,'image_url','/features/games/ape-in/assets/images/cards/Oracle_Sats_3.jpg')
  ];
  v_historacles := ARRAY[
    jsonb_build_object('name','Sats','type','Historacle','value',21,'image_url','/features/games/ape-in/assets/images/cards/Historacle_1_Sats.jpg'),
    jsonb_build_object('name','Fibonacci','type','Historacle','value',21,'image_url','/features/games/ape-in/assets/images/cards/Historacle_2_Fibonacci.jpg'),
    jsonb_build_object('name','Gann','type','Historacle','value',21,'image_url','/features/games/ape-in/assets/images/cards/Historacle_3_Gann.jpg'),
    jsonb_build_object('name','Dow','type','Historacle','value',21,'image_url','/features/games/ape-in/assets/images/cards/Historacle_4_Dow.jpg'),
    jsonb_build_object('name','Elliott','type','Historacle','value',21,'image_url','/features/games/ape-in/assets/images/cards/Historacle_5_Elliott.jpg')
  ];
  v_specials := ARRAY[
    jsonb_build_object('name','Ape In!','type','Special','value',0,'image_url','/features/games/ape-in/assets/images/cards/Ape_In.jpg'),
    jsonb_build_object('name','Ape In!','type','Special','value',0,'image_url','/features/games/ape-in/assets/images/cards/Ape_In_MAYC.jpg')
  ];

  -- Build bearish pool with caps: Reset(1), Half(1), Minus10(6)
  v_bearish := ARRAY[]::jsonb[];
  v_bearish_weights := ARRAY[]::numeric[];

  IF c_minus10 < v_minus10_max THEN
    v_bearish := v_bearish || jsonb_build_object('name','Bear -10','type','Bearish','value',0,'penalty','Minus10','image_url','/features/games/ape-in/assets/images/cards/Bear_Minus_10.jpg');
    v_bearish_weights := v_bearish_weights || 6; -- relative within-bearish weight (copies)
  END IF;

  IF c_half < v_half_max THEN
    v_bearish := v_bearish || jsonb_build_object('name','Bear Half','type','Bearish','value',0,'penalty','Half','image_url','/features/games/ape-in/assets/images/cards/Bear_Half.jpg');
    v_bearish_weights := v_bearish_weights || 1;
  END IF;

  IF c_reset < v_reset_max THEN
    v_bearish := v_bearish || jsonb_build_object('name','Bear Reset','type','Bearish','value',0,'penalty','Reset','image_url','/features/games/ape-in/assets/images/cards/Bear_Reset.jpg');
    v_bearish_weights := v_bearish_weights || 1;
  END IF;

  -- Build group list + weights (Sandy weights; bearish bumped slightly via config)
  v_groups := ARRAY[
    'CIPHER1','CIPHER2','CIPHER3','CIPHER5','CIPHER8','ORACLE','HISTORACLE','BEARISH'
  ];
  v_group_weights := ARRAY[
    w_cipher1::numeric, w_cipher2::numeric, w_cipher3::numeric, w_cipher5::numeric, w_cipher8::numeric,
    w_oracle::numeric, w_historacle::numeric, v_bearish_weight::numeric
  ];

  -- Add Special group unless excluded or would allow consecutive Ape In
  IF NOT v_exclude_ape_in THEN
    v_groups := v_groups || 'SPECIAL';
    v_group_weights := v_group_weights || w_special::numeric;
  END IF;

  -- If bearish pool is empty due to caps, set bearish group weight = 0
  IF array_length(v_bearish, 1) IS NULL THEN
    FOR v_group_idx IN 1..array_length(v_groups,1) LOOP
      IF v_groups[v_group_idx] = 'BEARISH' THEN
        v_group_weights[v_group_idx] := 0;
      END IF;
    END LOOP;
  END IF;

  -- Choose group
  v_group_idx := public.pvp_weighted_choice_index(v_group_weights);
  v_group := v_groups[v_group_idx];

  -- Choose card inside group
  IF v_group = 'CIPHER1' THEN
    v_idx := floor(random() * array_length(v_cipher1,1))::int + 1;
    v_card := v_cipher1[v_idx];
  ELSIF v_group = 'CIPHER2' THEN
    v_idx := floor(random() * array_length(v_cipher2,1))::int + 1;
    v_card := v_cipher2[v_idx];
  ELSIF v_group = 'CIPHER3' THEN
    v_idx := floor(random() * array_length(v_cipher3,1))::int + 1;
    v_card := v_cipher3[v_idx];
  ELSIF v_group = 'CIPHER5' THEN
    v_idx := floor(random() * array_length(v_cipher5,1))::int + 1;
    v_card := v_cipher5[v_idx];
  ELSIF v_group = 'CIPHER8' THEN
    v_idx := floor(random() * array_length(v_cipher8,1))::int + 1;
    v_card := v_cipher8[v_idx];
  ELSIF v_group = 'ORACLE' THEN
    v_idx := floor(random() * array_length(v_oracles,1))::int + 1;
    v_card := v_oracles[v_idx];
  ELSIF v_group = 'HISTORACLE' THEN
    v_idx := floor(random() * array_length(v_historacles,1))::int + 1;
    v_card := v_historacles[v_idx];
  ELSIF v_group = 'SPECIAL' THEN
    v_idx := floor(random() * array_length(v_specials,1))::int + 1;
    v_card := v_specials[v_idx];
  ELSE
    -- BEARISH with internal weights
    v_idx := public.pvp_weighted_choice_index(v_bearish_weights);
    v_card := v_bearish[v_idx];
  END IF;

  v_card_id := encode(gen_random_bytes(8), 'hex');

  v_state := jsonb_set(v_state, '{turn_number}', to_jsonb(v_turn_number), true);
  v_state := jsonb_set(v_state, '{phase}', to_jsonb('DRAW'::text), true); -- default, may change below
  v_state := jsonb_set(v_state, '{last_draw_name}', to_jsonb((v_card->>'name')), true);

  v_state := jsonb_set(
    v_state,
    '{last_draw}',
    jsonb_build_object('card_id', v_card_id, 'card', v_card, 'created_at', v_now::text),
    true
  );

  v_state := jsonb_set(
    v_state,
    '{last_action}',
    jsonb_build_object(
      'type', 'draw',
      'by_user_id', p_actor_user_id::text,
      'created_at', v_now::text,
      'details', jsonb_build_object('card', v_card)
    ),
    true
  );

  -- increment action_counts
  v_state := jsonb_set(
    v_state,
    '{action_counts}',
    jsonb_build_object(
      'seat1_actions', COALESCE((v_state->'action_counts'->>'seat1_actions')::int, 0) + CASE WHEN v_current_turn_seat = 'seat1' THEN 1 ELSE 0 END,
      'seat2_actions', COALESCE((v_state->'action_counts'->>'seat2_actions')::int, 0) + CASE WHEN v_current_turn_seat = 'seat2' THEN 1 ELSE 0 END,
      'total_actions', COALESCE((v_state->'action_counts'->>'total_actions')::int, 0) + 1
    ),
    true
  );

  -- Handle Ape In! special: activates seat flag and allows immediate redraw (no roll)
  v_flags := COALESCE(v_state->'seat_flags', jsonb_build_object('seat1_ape_in_active',false,'seat2_ape_in_active',false));
  v_ape_key := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat1_ape_in_active' ELSE 'seat2_ape_in_active' END;

  IF (v_card->>'type') = 'Special' AND (v_card->>'name') = 'Ape In!' THEN
    v_flags := jsonb_set(v_flags, ARRAY[v_ape_key], to_jsonb(true), true);
    v_state := jsonb_set(v_state, '{seat_flags}', v_flags, true);

    -- Keep phase DRAW (draw again). pending_card stays NULL.
    v_state := jsonb_set(v_state, '{pending_card}', 'null'::jsonb, true);
    v_state := jsonb_set(v_state, '{phase}', to_jsonb('DRAW'::text), true);
  ELSE
    -- Normal card: store as pending and go to ROLL
    v_state := jsonb_set(v_state, '{pending_card}', v_card, true);
    v_state := jsonb_set(v_state, '{phase}', to_jsonb('ROLL'::text), true);
  END IF;

  UPDATE public.ape_in_pvp_matches
  SET
    game_state = v_state,
    last_action_at = v_now
  WHERE id = p_match_id;

  RETURN QUERY
  SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state
  FROM public.ape_in_pvp_matches m
  WHERE m.id = p_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_action_draw(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pvp_action_draw(uuid, uuid) TO authenticated;

-- ======================================================
-- Phase 3: Roll action (Sandy-parity bust/bearish/ApeIn)
-- ======================================================
CREATE OR REPLACE FUNCTION public.pvp_action_roll(
  p_match_id uuid,
  p_actor_user_id uuid
)
RETURNS TABLE (
  id uuid,
  match_status text,
  winner_id uuid,
  forfeited_by uuid,
  last_action_at timestamptz,
  game_state jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
VOLATILE
AS $$
DECLARE
  v_match record;
  v_state jsonb;
  v_phase text;
  v_current_turn_seat text;
  v_seat_map jsonb;
  v_current_user_id uuid;
  v_now timestamptz := now();

  v_turn_number int;
  v_round_number int;

  v_die int;
  v_is_bust boolean := false;

  v_pending jsonb;
  v_type text;
  v_value int;
  v_penalty text;

  v_scores jsonb;
  v_total_key text;
  v_turn_key text;
  v_total int;
  v_turn int;

  v_flags jsonb;
  v_ape_key text;
  v_ape_active boolean := false;

  v_bearish_counts jsonb;
  v_count int;

  v_next_seat text;
BEGIN
  SELECT *
  INTO v_match
  FROM public.ape_in_pvp_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.player1_id <> p_actor_user_id AND v_match.player2_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Access denied: not a participant';
  END IF;

  IF v_match.match_status <> 'in_progress' THEN
    RAISE EXCEPTION 'Match not in progress';
  END IF;

  v_state := public.pvp_ensure_game_state_v1(p_match_id);
  v_phase := COALESCE(v_state->>'phase', '');

  IF v_phase <> 'ROLL' THEN
    RAISE EXCEPTION 'Invalid phase for roll: %', v_phase;
  END IF;

  v_current_turn_seat := COALESCE(v_state->>'current_turn_seat', '');
  v_seat_map := v_state->'seat_map';
  v_current_user_id := (v_seat_map->>v_current_turn_seat)::uuid;

  IF v_current_user_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;

  v_pending := v_state->'pending_card';
  IF v_pending IS NULL OR v_pending = 'null'::jsonb THEN
    RAISE EXCEPTION 'No pending card. Draw first.';
  END IF;

  v_type := COALESCE(v_pending->>'type', '');
  v_value := COALESCE((v_pending->>'value')::int, 0);
  v_penalty := COALESCE(v_pending->>'penalty', NULL);

  v_turn_number := COALESCE((v_state->>'turn_number')::int, 0) + 1;
  v_round_number := COALESCE((v_state->>'round_number')::int, 1);

  -- Sandy balanced die
  v_die := public.pvp_roll_die_balanced();

  IF v_die = 1 THEN
    v_is_bust := true;
  END IF;

  v_scores := COALESCE(v_state->'scores', jsonb_build_object());
  v_total_key := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat1_total' ELSE 'seat2_total' END;
  v_turn_key := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat1_turn' ELSE 'seat2_turn' END;

  v_total := COALESCE((v_scores->>v_total_key)::int, 0);
  v_turn := COALESCE((v_scores->>v_turn_key)::int, 0);

  v_flags := COALESCE(v_state->'seat_flags', jsonb_build_object('seat1_ape_in_active',false,'seat2_ape_in_active',false));
  v_ape_key := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat1_ape_in_active' ELSE 'seat2_ape_in_active' END;
  v_ape_active := COALESCE((v_flags->>v_ape_key)::boolean, false);

  -- Record roll + action first
  v_state := jsonb_set(v_state, '{turn_number}', to_jsonb(v_turn_number), true);
  v_state := jsonb_set(
    v_state,
    '{last_roll}',
    jsonb_build_object('value', v_die, 'created_at', v_now::text),
    true
  );

  v_state := jsonb_set(
    v_state,
    '{last_action}',
    jsonb_build_object(
      'type', 'roll',
      'by_user_id', p_actor_user_id::text,
      'created_at', v_now::text,
      'details', jsonb_build_object('die', v_die, 'pending_card', v_pending, 'bust', v_is_bust)
    ),
    true
  );

  -- increment action_counts
  v_state := jsonb_set(
    v_state,
    '{action_counts}',
    jsonb_build_object(
      'seat1_actions', COALESCE((v_state->'action_counts'->>'seat1_actions')::int, 0) + CASE WHEN v_current_turn_seat = 'seat1' THEN 1 ELSE 0 END,
      'seat2_actions', COALESCE((v_state->'action_counts'->>'seat2_actions')::int, 0) + CASE WHEN v_current_turn_seat = 'seat2' THEN 1 ELSE 0 END,
      'total_actions', COALESCE((v_state->'action_counts'->>'total_actions')::int, 0) + 1
    ),
    true
  );

  -- Bust: reset turn to 0, clear pending, negate Ape In, switch seat, phase DRAW
  IF v_is_bust THEN
    v_scores := jsonb_set(v_scores, ARRAY[v_turn_key], to_jsonb(0), true);
    v_state := jsonb_set(v_state, '{scores}', v_scores, true);

    -- clear pending + negate ape in
    v_state := jsonb_set(v_state, '{pending_card}', 'null'::jsonb, true);
    v_flags := jsonb_set(v_flags, ARRAY[v_ape_key], to_jsonb(false), true);
    v_state := jsonb_set(v_state, '{seat_flags}', v_flags, true);

    v_next_seat := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat2' ELSE 'seat1' END;
    v_state := jsonb_set(v_state, '{current_turn_seat}', to_jsonb(v_next_seat), true);
    v_state := jsonb_set(v_state, '{phase}', to_jsonb('DRAW'::text), true);

    -- Full-round semantics: increment round_number only when seat2 finishes a turn (seat2 -> seat1).
    IF v_current_turn_seat = 'seat2' THEN
      v_state := jsonb_set(v_state, '{round_number}', to_jsonb(v_round_number + 1), true);
    END IF;

    UPDATE public.ape_in_pvp_matches
    SET game_state = v_state,
        last_action_at = v_now
    WHERE id = p_match_id;

    RETURN QUERY
    SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state
    FROM public.ape_in_pvp_matches m
    WHERE m.id = p_match_id;
    RETURN;
  END IF;

  -- Bearish handling (Sandy-parity):
  -- even roll dodges (consume count anyway, negate Ape In, continue turn)
  -- odd roll applies penalty to TOTAL score, resets turn to 0, ends turn
  IF v_type = 'Bearish' THEN
    v_bearish_counts := COALESCE(v_state->'bearish_counts', jsonb_build_object('Reset',0,'Half',0,'Minus10',0));

    -- consume the bearish count regardless (Sandy consumes flags even when dodged)
    IF v_penalty IS NOT NULL THEN
      v_count := COALESCE((v_bearish_counts->>v_penalty)::int, 0) + 1;
      v_bearish_counts := jsonb_set(v_bearish_counts, ARRAY[v_penalty], to_jsonb(v_count), true);
      v_state := jsonb_set(v_state, '{bearish_counts}', v_bearish_counts, true);
    END IF;

    -- negate Ape In on bearish interaction (Sandy behavior)
    v_flags := jsonb_set(v_flags, ARRAY[v_ape_key], to_jsonb(false), true);
    v_state := jsonb_set(v_state, '{seat_flags}', v_flags, true);

    -- clear pending card
    v_state := jsonb_set(v_state, '{pending_card}', 'null'::jsonb, true);

    IF (v_die % 2) = 0 THEN
      -- DODGED: continue turn, go to DECISION (draw/stack)
      v_state := jsonb_set(v_state, '{phase}', to_jsonb('DECISION'::text), true);

      UPDATE public.ape_in_pvp_matches
      SET game_state = v_state,
          last_action_at = v_now
      WHERE id = p_match_id;

      RETURN QUERY
      SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state
      FROM public.ape_in_pvp_matches m
      WHERE m.id = p_match_id;
      RETURN;
    ELSE
      -- HIT: apply penalty to TOTAL, reset TURN to 0, end turn
      IF v_penalty = 'Reset' THEN
        v_total := 0;
      ELSIF v_penalty = 'Half' THEN
        v_total := floor(v_total / 2);
      ELSIF v_penalty = 'Minus10' THEN
        v_total := GREATEST(v_total - 10, 0);
      END IF;

      v_scores := jsonb_set(v_scores, ARRAY[v_total_key], to_jsonb(v_total), true);
      v_scores := jsonb_set(v_scores, ARRAY[v_turn_key], to_jsonb(0), true);
      v_state := jsonb_set(v_state, '{scores}', v_scores, true);

      v_next_seat := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat2' ELSE 'seat1' END;
      v_state := jsonb_set(v_state, '{current_turn_seat}', to_jsonb(v_next_seat), true);
      v_state := jsonb_set(v_state, '{phase}', to_jsonb('DRAW'::text), true);

      -- Full-round semantics: increment round_number only when seat2 finishes a turn (seat2 -> seat1).
      IF v_current_turn_seat = 'seat2' THEN
        v_state := jsonb_set(v_state, '{round_number}', to_jsonb(v_round_number + 1), true);
      END IF;

      UPDATE public.ape_in_pvp_matches
      SET game_state = v_state,
          last_action_at = v_now
      WHERE id = p_match_id;

      RETURN QUERY
      SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state
      FROM public.ape_in_pvp_matches m
      WHERE m.id = p_match_id;
      RETURN;
    END IF;
  END IF;

  -- Normal success: add card value to turn score, doubled if Ape In active
  IF v_ape_active THEN
    v_value := v_value * 2;
    v_flags := jsonb_set(v_flags, ARRAY[v_ape_key], to_jsonb(false), true);
    v_state := jsonb_set(v_state, '{seat_flags}', v_flags, true);
  END IF;

  v_turn := v_turn + v_value;
  v_scores := jsonb_set(v_scores, ARRAY[v_turn_key], to_jsonb(v_turn), true);
  v_state := jsonb_set(v_state, '{scores}', v_scores, true);

  -- clear pending and go to DECISION
  v_state := jsonb_set(v_state, '{pending_card}', 'null'::jsonb, true);
  v_state := jsonb_set(v_state, '{phase}', to_jsonb('DECISION'::text), true);

  UPDATE public.ape_in_pvp_matches
  SET game_state = v_state,
      last_action_at = v_now
  WHERE id = p_match_id;

  RETURN QUERY
  SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state
  FROM public.ape_in_pvp_matches m
  WHERE m.id = p_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_action_roll(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pvp_action_roll(uuid, uuid) TO authenticated;

-- ======================================================
-- Phase 3: Stack action (bank turn -> total, 150 wins)
-- ======================================================
CREATE OR REPLACE FUNCTION public.pvp_action_stack(
  p_match_id uuid,
  p_actor_user_id uuid
)
RETURNS TABLE (
  id uuid,
  match_status text,
  winner_id uuid,
  forfeited_by uuid,
  last_action_at timestamptz,
  game_state jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
VOLATILE
AS $$
DECLARE
  v_match record;
  v_state jsonb;
  v_phase text;
  v_current_turn_seat text;
  v_seat_map jsonb;
  v_current_user_id uuid;
  v_now timestamptz := now();
  v_turn_number int;
  v_round_number int;

  v_scores jsonb;
  v_total_key text;
  v_turn_key text;
  v_total int;
  v_turn int;
  v_new_total int;

  v_next_seat text;
BEGIN
  SELECT *
  INTO v_match
  FROM public.ape_in_pvp_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.player1_id <> p_actor_user_id AND v_match.player2_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Access denied: not a participant';
  END IF;

  IF v_match.match_status <> 'in_progress' THEN
    RAISE EXCEPTION 'Match not in progress';
  END IF;

  v_state := public.pvp_ensure_game_state_v1(p_match_id);
  v_phase := COALESCE(v_state->>'phase', '');

  IF v_phase <> 'DECISION' THEN
    RAISE EXCEPTION 'Invalid phase for stack: %', v_phase;
  END IF;

  v_current_turn_seat := COALESCE(v_state->>'current_turn_seat', '');
  v_seat_map := v_state->'seat_map';
  v_current_user_id := (v_seat_map->>v_current_turn_seat)::uuid;

  IF v_current_user_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;

  v_turn_number := COALESCE((v_state->>'turn_number')::int, 0) + 1;
  v_round_number := COALESCE((v_state->>'round_number')::int, 1);

  v_scores := v_state->'scores';
  v_total_key := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat1_total' ELSE 'seat2_total' END;
  v_turn_key := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat1_turn' ELSE 'seat2_turn' END;

  v_total := COALESCE((v_scores->>v_total_key)::int, 0);
  v_turn := COALESCE((v_scores->>v_turn_key)::int, 0);
  v_new_total := v_total + v_turn;

  v_scores := jsonb_set(v_scores, ARRAY[v_total_key], to_jsonb(v_new_total), true);
  v_scores := jsonb_set(v_scores, ARRAY[v_turn_key], to_jsonb(0), true);
  v_state := jsonb_set(v_state, '{scores}', v_scores, true);

  v_state := jsonb_set(v_state, '{turn_number}', to_jsonb(v_turn_number), true);

  v_state := jsonb_set(
    v_state,
    '{last_action}',
    jsonb_build_object(
      'type', 'stack',
      'by_user_id', p_actor_user_id::text,
      'created_at', v_now::text,
      'details', jsonb_build_object('banked', v_turn, 'new_total', v_new_total)
    ),
    true
  );

  -- increment action_counts
  v_state := jsonb_set(
    v_state,
    '{action_counts}',
    jsonb_build_object(
      'seat1_actions', COALESCE((v_state->'action_counts'->>'seat1_actions')::int, 0) + CASE WHEN v_current_turn_seat = 'seat1' THEN 1 ELSE 0 END,
      'seat2_actions', COALESCE((v_state->'action_counts'->>'seat2_actions')::int, 0) + CASE WHEN v_current_turn_seat = 'seat2' THEN 1 ELSE 0 END,
      'total_actions', COALESCE((v_state->'action_counts'->>'total_actions')::int, 0) + 1
    ),
    true
  );

  -- Win condition: first to 150 on stack (Sandy-parity)
  IF v_new_total >= 150 THEN
    v_state := jsonb_set(v_state, '{phase}', to_jsonb('GAME_END'::text), true);

    UPDATE public.ape_in_pvp_matches
    SET game_state = v_state,
        last_action_at = v_now,
        match_status = 'completed',
        winner_id = p_actor_user_id,
        ended_at = v_now
    WHERE id = p_match_id;
  ELSE
    -- Switch turn
    v_next_seat := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat2' ELSE 'seat1' END;
    v_state := jsonb_set(v_state, '{current_turn_seat}', to_jsonb(v_next_seat), true);
    v_state := jsonb_set(v_state, '{phase}', to_jsonb('DRAW'::text), true);

    -- Full-round semantics: increment round_number only when seat2 finishes a turn (seat2 -> seat1).
    IF v_current_turn_seat = 'seat2' THEN
      v_state := jsonb_set(v_state, '{round_number}', to_jsonb(v_round_number + 1), true);
    END IF;

    UPDATE public.ape_in_pvp_matches
    SET game_state = v_state,
        last_action_at = v_now
    WHERE id = p_match_id;
  END IF;

  RETURN QUERY
  SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state
  FROM public.ape_in_pvp_matches m
  WHERE m.id = p_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_action_stack(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pvp_action_stack(uuid, uuid) TO authenticated;

-- ======================================================
-- Phase 3: Forfeit action (unchanged)
-- ======================================================
CREATE OR REPLACE FUNCTION public.pvp_action_forfeit(
  p_match_id uuid,
  p_actor_user_id uuid
)
RETURNS TABLE (
  id uuid,
  match_status text,
  winner_id uuid,
  forfeited_by uuid,
  last_action_at timestamptz,
  game_state jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog, public'
VOLATILE
AS $$
DECLARE
  v_match record;
  v_state jsonb;
  v_now timestamptz := now();
  v_opponent uuid;
BEGIN
  SELECT *
  INTO v_match
  FROM public.ape_in_pvp_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.player1_id <> p_actor_user_id AND v_match.player2_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Access denied: not a participant';
  END IF;

  IF v_match.match_status <> 'in_progress' THEN
    RAISE EXCEPTION 'Match not in progress';
  END IF;

  v_opponent := CASE WHEN v_match.player1_id = p_actor_user_id THEN v_match.player2_id ELSE v_match.player1_id END;

  v_state := public.pvp_ensure_game_state_v1(p_match_id);
  v_state := jsonb_set(v_state, '{phase}', to_jsonb('GAME_END'::text), true);
  v_state := jsonb_set(
    v_state,
    '{last_action}',
    jsonb_build_object('type', 'forfeit', 'by_user_id', p_actor_user_id::text, 'created_at', v_now::text, 'details', jsonb_build_object()),
    true
  );

  UPDATE public.ape_in_pvp_matches
  SET
    match_status = 'forfeited',
    forfeited_by = p_actor_user_id,
    winner_id = v_opponent,
    ended_at = v_now,
    last_action_at = v_now,
    game_state = v_state
  WHERE id = p_match_id;

  RETURN QUERY
  SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state
  FROM public.ape_in_pvp_matches m
  WHERE m.id = p_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_action_forfeit(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pvp_action_forfeit(uuid, uuid) TO authenticated;

