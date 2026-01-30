-- =====================================================
-- REPAIR: UNIFIED PVP (pvp_matches) APE IN ACTION RPCs
-- =====================================================
-- Purpose:
-- - Force the *final* CREATE OR REPLACE winners for Ape In PvP action RPCs
-- - Eliminate any split-brain caused by older/legacy definitions that still reference ape_in_pvp_matches
--
-- This migration intentionally runs "last" and overwrites:
-- - public.pvp_ensure_game_state_v1
-- - public.pvp_action_draw
-- - public.pvp_action_roll
-- - public.pvp_action_stack
-- - public.pvp_action_forfeit
--
-- All functions in this file operate on:
--   public.pvp_matches
-- with:
--   game_code = 'ape_in'
--
-- NOTE: These functions assume the following helper functions already exist:
-- - public.pvp_build_initial_game_state_v1(uuid, uuid, integer)
-- - public.pvp_weighted_choice_index(numeric[])
-- - public.pvp_roll_die_balanced()

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
  FROM public.pvp_matches
  WHERE id = p_match_id
    AND game_code = 'ape_in'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF (v_match.game_state->>'state_version') = '1'
     AND (v_match.game_state->>'phase') IN ('WAITING_FOR_OPPONENT','TURN_START','DRAW','ROLL','DECISION','GAME_END')
     AND (v_match.game_state->'seat_map') IS NOT NULL THEN
    RETURN v_match.game_state;
  END IF;

  IF v_match.player2_id IS NULL THEN
    RETURN v_match.game_state;
  END IF;

  v_state := public.pvp_build_initial_game_state_v1(v_match.player1_id, v_match.player2_id, 1);
  v_state := jsonb_set(v_state, '{phase}', to_jsonb('TURN_START'::text), true);

  UPDATE public.pvp_matches
  SET game_state = v_state
  WHERE id = p_match_id
    AND game_code = 'ape_in';

  RETURN v_state;
END;
$$;

-- ======================================================
-- Draw action (Sandy-parity deck + Ape In)
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
  FROM public.pvp_matches
  WHERE id = p_match_id
    AND game_code = 'ape_in'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.player1_id <> p_actor_user_id AND v_match.player2_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Access denied: not a participant';
  END IF;

  IF v_match.match_status NOT IN ('in_progress', 'active') THEN
    RAISE EXCEPTION 'Match not in progress';
  END IF;

  v_state := public.pvp_ensure_game_state_v1(p_match_id);
  v_phase := COALESCE(v_state->>'phase', '');

  IF v_phase <> 'DRAW' AND v_phase <> 'DECISION' AND v_phase <> 'TURN_START' THEN
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

  v_bearish := ARRAY[]::jsonb[];
  v_bearish_weights := ARRAY[]::numeric[];

  IF c_minus10 < v_minus10_max THEN
    v_bearish := v_bearish || jsonb_build_object('name','Bear -10','type','Bearish','value',0,'penalty','Minus10','image_url','/features/games/ape-in/assets/images/cards/Bear_Minus_10.jpg');
    v_bearish_weights := v_bearish_weights || 6;
  END IF;
  IF c_half < v_half_max THEN
    v_bearish := v_bearish || jsonb_build_object('name','Bear Half','type','Bearish','value',0,'penalty','Half','image_url','/features/games/ape-in/assets/images/cards/Bear_Half.jpg');
    v_bearish_weights := v_bearish_weights || 1;
  END IF;
  IF c_reset < v_reset_max THEN
    v_bearish := v_bearish || jsonb_build_object('name','Bear Reset','type','Bearish','value',0,'penalty','Reset','image_url','/features/games/ape-in/assets/images/cards/Bear_Reset.jpg');
    v_bearish_weights := v_bearish_weights || 1;
  END IF;

  v_groups := ARRAY['CIPHER1','CIPHER2','CIPHER3','CIPHER5','CIPHER8','ORACLE','HISTORACLE','BEARISH'];
  v_group_weights := ARRAY[
    w_cipher1::numeric, w_cipher2::numeric, w_cipher3::numeric, w_cipher5::numeric, w_cipher8::numeric,
    w_oracle::numeric, w_historacle::numeric, v_bearish_weight::numeric
  ];

  IF NOT v_exclude_ape_in THEN
    v_groups := v_groups || 'SPECIAL';
    v_group_weights := v_group_weights || w_special::numeric;
  END IF;

  IF array_length(v_bearish, 1) IS NULL THEN
    FOR v_group_idx IN 1..array_length(v_groups,1) LOOP
      IF v_groups[v_group_idx] = 'BEARISH' THEN
        v_group_weights[v_group_idx] := 0;
      END IF;
    END LOOP;
  END IF;

  v_group_idx := public.pvp_weighted_choice_index(v_group_weights);
  v_group := v_groups[v_group_idx];

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
    v_idx := public.pvp_weighted_choice_index(v_bearish_weights);
    v_card := v_bearish[v_idx];
  END IF;

  v_card_id := encode(gen_random_bytes(8), 'hex');

  v_state := jsonb_set(v_state, '{turn_number}', to_jsonb(v_turn_number), true);
  v_state := jsonb_set(v_state, '{phase}', to_jsonb('DRAW'::text), true);
  v_state := jsonb_set(v_state, '{last_draw_name}', to_jsonb((v_card->>'name')), true);
  v_state := jsonb_set(v_state, '{last_draw}', jsonb_build_object('card_id', v_card_id, 'card', v_card, 'created_at', v_now::text), true);
  v_state := jsonb_set(v_state, '{last_action}', jsonb_build_object('type','draw','by_user_id',p_actor_user_id::text,'created_at',v_now::text,'details',jsonb_build_object('card', v_card)), true);
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

  v_flags := COALESCE(v_state->'seat_flags', jsonb_build_object('seat1_ape_in_active',false,'seat2_ape_in_active',false));
  v_ape_key := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat1_ape_in_active' ELSE 'seat2_ape_in_active' END;

  IF (v_card->>'type') = 'Special' AND (v_card->>'name') = 'Ape In!' THEN
    v_flags := jsonb_set(v_flags, ARRAY[v_ape_key], to_jsonb(true), true);
    v_state := jsonb_set(v_state, '{seat_flags}', v_flags, true);
    v_state := jsonb_set(v_state, '{pending_card}', 'null'::jsonb, true);
    v_state := jsonb_set(v_state, '{phase}', to_jsonb('DRAW'::text), true);
  ELSE
    v_state := jsonb_set(v_state, '{pending_card}', v_card, true);
    v_state := jsonb_set(v_state, '{phase}', to_jsonb('ROLL'::text), true);
  END IF;

  UPDATE public.pvp_matches
  SET
    game_state = v_state,
    last_action_at = v_now,
    match_status = CASE WHEN match_status = 'active' THEN 'in_progress' ELSE match_status END
  WHERE id = p_match_id
    AND game_code = 'ape_in';

  RETURN QUERY
  SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state
  FROM public.pvp_matches m
  WHERE m.id = p_match_id
    AND m.game_code = 'ape_in';
END;
$$;

-- ======================================================
-- Roll action (Sandy-parity dice + bust + bearish + Ape In)
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
  FROM public.pvp_matches
  WHERE id = p_match_id
    AND game_code = 'ape_in'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.player1_id <> p_actor_user_id AND v_match.player2_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Access denied: not a participant';
  END IF;

  IF v_match.match_status NOT IN ('in_progress', 'active') THEN
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

  v_die := public.pvp_roll_die_balanced();
  IF v_die = 1 THEN v_is_bust := true; END IF;

  v_scores := COALESCE(v_state->'scores', jsonb_build_object());
  v_total_key := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat1_total' ELSE 'seat2_total' END;
  v_turn_key := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat1_turn' ELSE 'seat2_turn' END;

  v_total := COALESCE((v_scores->>v_total_key)::int, 0);
  v_turn := COALESCE((v_scores->>v_turn_key)::int, 0);

  v_flags := COALESCE(v_state->'seat_flags', jsonb_build_object('seat1_ape_in_active',false,'seat2_ape_in_active',false));
  v_ape_key := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat1_ape_in_active' ELSE 'seat2_ape_in_active' END;
  v_ape_active := COALESCE((v_flags->>v_ape_key)::boolean, false);

  v_state := jsonb_set(v_state, '{turn_number}', to_jsonb(v_turn_number), true);
  v_state := jsonb_set(v_state, '{last_roll}', jsonb_build_object('value', v_die, 'created_at', v_now::text), true);
  v_state := jsonb_set(
    v_state,
    '{last_action}',
    jsonb_build_object('type','roll','by_user_id',p_actor_user_id::text,'created_at',v_now::text,'details',jsonb_build_object('die',v_die,'pending_card',v_pending,'bust',v_is_bust)),
    true
  );

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

  IF v_is_bust THEN
    v_scores := jsonb_set(v_scores, ARRAY[v_turn_key], to_jsonb(0), true);
    v_state := jsonb_set(v_state, '{scores}', v_scores, true);
    v_state := jsonb_set(v_state, '{pending_card}', 'null'::jsonb, true);
    v_flags := jsonb_set(v_flags, ARRAY[v_ape_key], to_jsonb(false), true);
    v_state := jsonb_set(v_state, '{seat_flags}', v_flags, true);
    v_next_seat := CASE WHEN v_current_turn_seat = 'seat1' THEN 'seat2' ELSE 'seat1' END;
    v_state := jsonb_set(v_state, '{current_turn_seat}', to_jsonb(v_next_seat), true);
    v_state := jsonb_set(v_state, '{phase}', to_jsonb('DRAW'::text), true);
    IF v_current_turn_seat = 'seat2' THEN
      v_state := jsonb_set(v_state, '{round_number}', to_jsonb(v_round_number + 1), true);
    END IF;
    UPDATE public.pvp_matches
    SET game_state = v_state,
        last_action_at = v_now,
        match_status = CASE WHEN match_status = 'active' THEN 'in_progress' ELSE match_status END
    WHERE id = p_match_id
      AND game_code = 'ape_in';
    RETURN QUERY SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state FROM public.pvp_matches m WHERE m.id = p_match_id AND m.game_code = 'ape_in';
    RETURN;
  END IF;

  IF v_type = 'Bearish' THEN
    v_bearish_counts := COALESCE(v_state->'bearish_counts', jsonb_build_object('Reset',0,'Half',0,'Minus10',0));
    IF v_penalty IS NOT NULL THEN
      v_count := COALESCE((v_bearish_counts->>v_penalty)::int, 0) + 1;
      v_bearish_counts := jsonb_set(v_bearish_counts, ARRAY[v_penalty], to_jsonb(v_count), true);
      v_state := jsonb_set(v_state, '{bearish_counts}', v_bearish_counts, true);
    END IF;

    v_flags := jsonb_set(v_flags, ARRAY[v_ape_key], to_jsonb(false), true);
    v_state := jsonb_set(v_state, '{seat_flags}', v_flags, true);
    v_state := jsonb_set(v_state, '{pending_card}', 'null'::jsonb, true);

    IF (v_die % 2) = 0 THEN
      v_state := jsonb_set(v_state, '{phase}', to_jsonb('DECISION'::text), true);
      UPDATE public.pvp_matches
      SET game_state = v_state,
          last_action_at = v_now,
          match_status = CASE WHEN match_status = 'active' THEN 'in_progress' ELSE match_status END
      WHERE id = p_match_id
        AND game_code = 'ape_in';
      RETURN QUERY SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state FROM public.pvp_matches m WHERE m.id = p_match_id AND m.game_code = 'ape_in';
      RETURN;
    ELSE
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
      IF v_current_turn_seat = 'seat2' THEN
        v_state := jsonb_set(v_state, '{round_number}', to_jsonb(v_round_number + 1), true);
      END IF;
      UPDATE public.pvp_matches
      SET game_state = v_state,
          last_action_at = v_now,
          match_status = CASE WHEN match_status = 'active' THEN 'in_progress' ELSE match_status END
      WHERE id = p_match_id
        AND game_code = 'ape_in';
      RETURN QUERY SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state FROM public.pvp_matches m WHERE m.id = p_match_id AND m.game_code = 'ape_in';
      RETURN;
    END IF;
  END IF;

  IF v_ape_active THEN
    v_value := v_value * 2;
    v_flags := jsonb_set(v_flags, ARRAY[v_ape_key], to_jsonb(false), true);
    v_state := jsonb_set(v_state, '{seat_flags}', v_flags, true);
  END IF;

  v_turn := v_turn + v_value;
  v_scores := jsonb_set(v_scores, ARRAY[v_turn_key], to_jsonb(v_turn), true);
  v_state := jsonb_set(v_state, '{scores}', v_scores, true);
  v_state := jsonb_set(v_state, '{pending_card}', 'null'::jsonb, true);
  v_state := jsonb_set(v_state, '{phase}', to_jsonb('DECISION'::text), true);

  UPDATE public.pvp_matches
  SET game_state = v_state,
      last_action_at = v_now,
      match_status = CASE WHEN match_status = 'active' THEN 'in_progress' ELSE match_status END
  WHERE id = p_match_id
    AND game_code = 'ape_in';

  RETURN QUERY SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state FROM public.pvp_matches m WHERE m.id = p_match_id AND m.game_code = 'ape_in';
END;
$$;

-- ======================================================
-- Stack action (bank sats, win at 150 => ended)
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
  FROM public.pvp_matches
  WHERE id = p_match_id
    AND game_code = 'ape_in'
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.player1_id <> p_actor_user_id AND v_match.player2_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Access denied: not a participant';
  END IF;
  IF v_match.match_status NOT IN ('in_progress','active') THEN
    RAISE EXCEPTION 'Match not in progress';
  END IF;

  v_state := public.pvp_ensure_game_state_v1(p_match_id);
  v_phase := COALESCE(v_state->>'phase','');
  IF v_phase <> 'DECISION' THEN
    RAISE EXCEPTION 'Invalid phase for stack: %', v_phase;
  END IF;

  v_current_turn_seat := COALESCE(v_state->>'current_turn_seat','');
  v_seat_map := v_state->'seat_map';
  v_current_user_id := (v_seat_map->>v_current_turn_seat)::uuid;
  IF v_current_user_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;

  v_turn_number := COALESCE((v_state->>'turn_number')::int, 0) + 1;
  v_round_number := COALESCE((v_state->>'round_number')::int, 1);

  v_scores := v_state->'scores';
  v_total_key := CASE WHEN v_current_turn_seat='seat1' THEN 'seat1_total' ELSE 'seat2_total' END;
  v_turn_key := CASE WHEN v_current_turn_seat='seat1' THEN 'seat1_turn' ELSE 'seat2_turn' END;
  v_total := COALESCE((v_scores->>v_total_key)::int, 0);
  v_turn := COALESCE((v_scores->>v_turn_key)::int, 0);
  v_new_total := v_total + v_turn;

  v_scores := jsonb_set(v_scores, ARRAY[v_total_key], to_jsonb(v_new_total), true);
  v_scores := jsonb_set(v_scores, ARRAY[v_turn_key], to_jsonb(0), true);
  v_state := jsonb_set(v_state, '{scores}', v_scores, true);
  v_state := jsonb_set(v_state, '{turn_number}', to_jsonb(v_turn_number), true);
  v_state := jsonb_set(v_state, '{last_action}', jsonb_build_object('type','stack','by_user_id',p_actor_user_id::text,'created_at',v_now::text,'details',jsonb_build_object('banked',v_turn,'new_total',v_new_total)), true);
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

  IF v_new_total >= 150 THEN
    v_state := jsonb_set(v_state, '{phase}', to_jsonb('GAME_END'::text), true);
    UPDATE public.pvp_matches
    SET game_state = v_state,
        last_action_at = v_now,
        match_status = 'ended',
        winner_id = p_actor_user_id,
        ended_at = v_now
    WHERE id = p_match_id
      AND game_code = 'ape_in';
  ELSE
    v_next_seat := CASE WHEN v_current_turn_seat='seat1' THEN 'seat2' ELSE 'seat1' END;
    v_state := jsonb_set(v_state, '{current_turn_seat}', to_jsonb(v_next_seat), true);
    v_state := jsonb_set(v_state, '{phase}', to_jsonb('DRAW'::text), true);
    IF v_current_turn_seat='seat2' THEN
      v_state := jsonb_set(v_state, '{round_number}', to_jsonb(v_round_number + 1), true);
    END IF;
    UPDATE public.pvp_matches
    SET game_state = v_state,
        last_action_at = v_now,
        match_status = CASE WHEN match_status = 'active' THEN 'in_progress' ELSE match_status END
    WHERE id = p_match_id
      AND game_code = 'ape_in';
  END IF;

  RETURN QUERY SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state FROM public.pvp_matches m WHERE m.id = p_match_id AND m.game_code = 'ape_in';
END;
$$;

-- ======================================================
-- Forfeit action
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
  FROM public.pvp_matches
  WHERE id = p_match_id
    AND game_code = 'ape_in'
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.player1_id <> p_actor_user_id AND v_match.player2_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'Access denied: not a participant';
  END IF;
  IF v_match.match_status NOT IN ('in_progress','active') THEN
    RAISE EXCEPTION 'Match not in progress';
  END IF;

  IF v_match.player2_id IS NULL THEN
    RAISE EXCEPTION 'Opponent not joined';
  END IF;

  v_opponent := CASE WHEN v_match.player1_id = p_actor_user_id THEN v_match.player2_id ELSE v_match.player1_id END;
  v_state := public.pvp_ensure_game_state_v1(p_match_id);
  v_state := jsonb_set(v_state, '{phase}', to_jsonb('GAME_END'::text), true);
  v_state := jsonb_set(v_state, '{last_action}', jsonb_build_object('type','forfeit','by_user_id',p_actor_user_id::text,'created_at',v_now::text,'details',jsonb_build_object()), true);

  UPDATE public.pvp_matches
  SET match_status = 'forfeited',
      forfeited_by = p_actor_user_id,
      winner_id = v_opponent,
      ended_at = v_now,
      last_action_at = v_now,
      game_state = v_state
  WHERE id = p_match_id
    AND game_code = 'ape_in';

  RETURN QUERY SELECT m.id, m.match_status, m.winner_id, m.forfeited_by, m.last_action_at, m.game_state FROM public.pvp_matches m WHERE m.id = p_match_id AND m.game_code = 'ape_in';
END;
$$;

-- =====================================================
-- Permissions (repeat here so this migration is self-healing)
-- =====================================================
REVOKE EXECUTE ON FUNCTION public.pvp_ensure_game_state_v1(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pvp_action_draw(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pvp_action_roll(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pvp_action_stack(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pvp_action_forfeit(uuid, uuid) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.pvp_ensure_game_state_v1(uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.pvp_action_draw(uuid, uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.pvp_action_roll(uuid, uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.pvp_action_stack(uuid, uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.pvp_action_forfeit(uuid, uuid) FROM anon';
  END IF;
END$$;

GRANT EXECUTE ON FUNCTION public.pvp_ensure_game_state_v1(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pvp_action_draw(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pvp_action_roll(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pvp_action_stack(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pvp_action_forfeit(uuid, uuid) TO authenticated, service_role;

