# Ape In PVP Mode - Comprehensive Implementation Plan

## 🔒 PLAN STATUS: FROZEN (SHIP-READY)

**Status**: ✅ **PRODUCTION-GRADE SPEC - GREEN LIGHT FOR IMPLEMENTATION**

This plan has been hardened and audited. It is:
- Internally consistent (no contradictions)
- Server-authoritative end-to-end
- Cheat-resistant (refresh, race conditions, grief loops addressed)
- Future-proof for multiplayer, tournaments, ranked
- Isolated from existing game modes (no regression risk)
- Operationally realistic (Node runtime, Supabase RLS, idempotency)

**⚠️ IMPORTANT**: This plan is **FROZEN**. Do not change during implementation except for:
- Typos
- Clarifying comments
- Implementation notes

Treat this document as a **contract** between design and implementation.

---

## 📋 Executive Summary

This document outlines the complete plan for implementing Player vs Player (PvP) mode in the Ape In game. The implementation will be built as a **separate, isolated module** to protect existing game logic and leaderboards, with minimal modifications to the existing codebase.

### 🔒 Critical Non-Negotiable Principles

1. **Server-Authoritative**: Clients can ONLY choose actions (Draw, Roll, Stack, Forfeit). Server generates ALL randomness, applies effects, validates transitions, and writes state. All API routes use service-role Supabase client.

2. **Refresh-Proof**: Match state stored in localStorage. On reload, resume from server state. Outcomes are committed immediately server-side - refreshing cannot undo actions.

3. **Strict State Schema**: JSONB `game_state` with `state_version`, `turn_number` (monotonic), `phase` enum, `seat_map` (NOT player1_id/player2_id), `action_counts` (for forfeit rules). Client ignores updates with `turn_number <= local.turn_number`.

4. **First Player Selection**: Server precomputes both d6 rolls. Players click to reveal. Higher roll becomes `seat_map.seat1` (goes first). UI labels based on `seat_map`, not join order.

5. **Forfeit vs Abandon**: Forfeit awards opponent 2 points ONLY if `total_actions >= 1`. Abandoned matches award 0 points. 5-minute inactivity timeout.

6. **Atomic Matchmaking**: Single Postgres RPC with `FOR UPDATE SKIP LOCKED` prevents double-join bugs.

7. **PvP-Only Tuning**: Copy card/dice logic to `pvp/logic/` folder. NO modifications to existing shared files.

8. **Idempotent Leaderboard**: Points awarded once per match (guard by `points_awarded_at`). Server-side writes only.

9. **RLS Security**: Clients can SELECT their matches, INSERT waiting matches. UPDATE blocked - all updates via server endpoints.

10. **Rematch Handshake**: Two-party confirmation. Always creates NEW match row (never reuses).

---

## 🎯 Core Requirements

### Game Rules
- **Turn Structure**: Player 1 completes their turn → Player 2 completes their turn → Round ends
- **Goal**: 150 sats (first to reach wins)
- **Rounds**: Unlimited (no round limit)
- **Game Rules**: Follow player's game rules (same as Sandy, Aida, etc.)
- **First Player Selection**: Highest d6 roll (evenly weighted, all 6 numbers equal probability)

### Scoring System
- **Win**: 2 points
- **Loss**: 1 point
- **Forfeit**: 0 points (forfeiting player only)
- **Winner of Forfeit**: Still receives 2 points **ONLY if total_actions >= 1** (prevents instant forfeit farming)

### Abandon vs Forfeit Rules
- **Forfeit**: Player explicitly presses forfeit button
  - Forfeiter gets 0 points
  - Opponent gets 2 points **ONLY if game_state.action_counts.total_actions >= 1**
  - If total_actions < 1, no points awarded (prevents grief loops)
- **Abandoned**: Match ended by server due to inactivity/connection loss
  - No points awarded to either player
  - Shows message: "Connection lost, returning to menu."
  - Timeout: 3-5 minutes of inactivity while match is in_progress

### Card System Adjustments
- **Bear -10 Sats Card**: Increase to 6 total copies (currently 4 for harder games, 1 for Sandy)
- **Bearish Card Percentage**: Slightly increase draw probability
- **Dice Roll**: Evenly weighted for all 6 numbers (1-6) for first player selection

### Player Display
- Show both players' **Names** and **Avatars** from profile
- Fallback to wallet ID (first 6 chars) and default image if no profile data

### Leaderboard Integration
- PVP leaderboard connects to arcade hub (single source of truth)
- Ape In homepage mirrors hub leaderboard data
- Separate PVP leaderboard from existing bot mode leaderboards

---

## 🔒 Non-Negotiable Architecture Principles

### A) Server-Authoritative PvP (CRITICAL)

**Client Permissions (ONLY)**:
- Clients can ONLY choose actions:
  - `Draw` - Request to draw a card
  - `Roll` - Request to roll dice
  - `Stack` / `Continue` - Bank turn score or continue rolling
  - `Forfeit` - Explicitly forfeit the match
  - `Roll-for-first` - Trigger reveal of precomputed first-player roll

**Server Authority (ALL)**:
- Server generates ALL randomness:
  - Card drawn (weighted random, server-side RNG)
  - Dice roll result (server-side RNG, crypto-safe preferred)
  - First player roll (precomputed server-side, revealed on player trigger)
- Server applies ALL effects:
  - Bearish card penalties
  - Ape In! doubling
  - Turn score calculations
  - Bust detection
- Server validates ALL transitions:
  - Turn order enforcement
  - Phase transitions (DRAW → ROLL → DECISION → TURN_END → ROUND_END)
  - Win condition detection
- Server writes ALL state:
  - `game_state` JSONB updates
  - Match status changes
  - Points and stats writes
  - Rematch handshake state

**Implementation Requirement**:
- All API routes MUST use Supabase service-role (admin) client
- Clients NEVER write to `game_state` directly
- All writes happen server-side via Next.js API routes
- RLS policies block client UPDATE on critical fields

### B) Refresh-Proof Resume (CRITICAL)

**Client-Side Storage**:
- When match starts: Store `active_pvp_match_id` in `localStorage` (or IndexedDB)
- Key: `ape_in_active_pvp_match_id`
- Value: `{ matchId: string, userId: string, timestamp: number }`

**Resume Flow on Page Load**:
1. Check `localStorage` for `active_pvp_match_id`
2. If exists:
   - Fetch match state from server: `GET /api/ape-in/pvp/game/[matchId]/state`
   - Server returns current `game_state` JSONB
3. If match status is `in_progress`:
   - Resume game board at current phase
   - Restore UI state from server `game_state`
   - Re-enable real-time sync
4. If match status is `completed` | `forfeited` | `abandoned`:
   - Clear `active_pvp_match_id` from localStorage
   - Show end modal with results
   - Option to rematch or return to menu

**Outcome Immutability**:
- When client clicks "Draw", server:
  1. Generates card (server-side RNG)
  2. Applies effects
  3. Writes updated `game_state` to database
  4. Returns new state to client
- **Refreshing does NOT undo outcomes** - server state is authoritative
- Client only displays what server returns

### C) Match State Model: Strict JSONB Schema (CRITICAL)

**Required `game_state` JSONB Structure**:
```typescript
interface PvPGameState {
  // Versioning
  state_version: number  // Start at 1, increment on schema changes
  
  // Ordering (anti-desync)
  turn_number: number  // Monotonically increments on every accepted action
  
  // Phase tracking
  phase: 
    | "WAITING_FOR_OPPONENT" // Match created, waiting for second player (match_status = 'waiting')
    | "FIRST_ROLL_P1"        // Waiting for seat1 to reveal roll
    | "FIRST_ROLL_P2"        // Waiting for seat2 to reveal roll
    | "DRAW"                 // Current player can draw card
    | "ROLL"                 // Current player can roll dice
    | "DECISION"             // Current player can stack or continue
    | "TURN_END"             // Turn ended, transitioning
    | "ROUND_END"            // Round ended, both players completed turns
    | "GAME_END"             // Game finished, winner determined
  
  // Round tracking
  round_number: number  // Visible in UI, increments each round
  
  // Seat mapping (solves "Player Y becomes Player 1" requirement)
  seat_map: {
    seat1: string  // userId who goes first (winner of first roll)
    seat2: string  // userId who goes second
  }
  
  // Current turn
  current_turn_seat: "seat1" | "seat2"  // Whose turn it is
  
  // Scores
  scores: {
    seat1_total: number  // Total score (stacked sats)
    seat2_total: number
    seat1_turn: number   // Current turn score (not yet stacked)
    seat2_turn: number
  }
  
  // Last action (for debugging/display)
  last_action: {
    type: "draw" | "roll" | "stack" | "forfeit" | "first_roll"
    by_user_id: string
    created_at: string  // ISO timestamp
    details?: any  // Card drawn, dice value, etc.
  }
  
  // Action counts (for forfeit point rules)
  action_counts: {
    seat1_actions: number  // Actions taken by seat1
    seat2_actions: number  // Actions taken by seat2
    total_actions: number  // seat1_actions + seat2_actions
  }
  
  // Deck configuration (PvP-specific tuning)
  deck_config: {
    bearish_weight: number      // Increased weight for PvP
    bear_minus_10_copies: number // 6 copies for PvP
    mode: "pvp_v1"
  }
  
  // Connection tracking (optional, helpful for abandonment)
  last_seen?: {
    seat1_at: string  // ISO timestamp
    seat2_at: string
  }
  
  // Rematch state (optional)
  rematch?: {
    requested_by: string  // userId
    status: "requested" | "accepted" | "declined" | "expired"
  }
}
```

**Client-Side Ordering Rule (Anti-Desync)**:
- Whenever client receives state update (via WebSocket/polling):
  ```typescript
  if (incoming.turn_number <= local.turn_number) {
    // Ignore - this is stale or duplicate
    return
  }
  // Apply update - this is newer
  setLocalState(incoming)
  ```
- This prevents out-of-order updates from causing desyncs

---

## 🏗️ Architecture Overview

### Separation Strategy

```
features/games/ape-in/
├── components/              # Existing components (UNTOUCHED)
├── pvp/                    # NEW: Isolated PVP module
│   ├── components/
│   │   ├── PvPMatchModal.tsx      # Match-making modal
│   │   ├── PvPWaitingRoom.tsx   # Waiting/searching UI
│   │   ├── PvPGameBoard.tsx      # PVP-specific game board
│   │   ├── PvPPlayerDisplay.tsx # Player info component
│   │   └── PvPMatchCode.tsx      # Private match code UI
│   ├── hooks/
│   │   ├── usePvPMatching.ts     # Match-making logic
│   │   ├── usePvPGameState.ts   # PVP game state management
│   │   └── usePvPWebSocket.ts    # Real-time sync
│   ├── services/
│   │   ├── pvp-match.service.ts  # Match creation/joining
│   │   ├── pvp-game.service.ts  # PVP game API calls
│   │   └── pvp-leaderboard.service.ts # PVP leaderboard
│   ├── types/
│   │   └── pvp.types.ts          # PVP-specific types
│   └── utils/
│       ├── pvp-dice.ts           # First player selection
│       └── pvp-scoring.ts        # PVP scoring logic
├── apeingame.tsx          # MODIFY: Add PVP button handler only
└── components/
    └── MainMenu.tsx        # MODIFY: Enable PVP button (currently disabled)
```

### Database Schema

**New Table: `ape_in_pvp_matches`**
```sql
CREATE TABLE IF NOT EXISTS ape_in_pvp_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Players (join order, NOT turn order)
  player1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  player1_address TEXT NOT NULL,
  player2_address TEXT NOT NULL,
  player1_name TEXT,
  player2_name TEXT,
  player1_avatar_url TEXT,
  player2_avatar_url TEXT,
  
  -- Match details
  match_code TEXT UNIQUE, -- For private matches (nullable)
  match_type TEXT DEFAULT 'public', -- 'public' or 'private'
  match_status TEXT DEFAULT 'waiting', -- 'waiting', 'rolling_for_first', 'in_progress', 'completed', 'forfeited', 'abandoned'
  
  -- First player selection (server precomputed, revealed on trigger)
  first_roll_seat1 INTEGER, -- Precomputed d6 roll for seat1 (revealed when player clicks)
  first_roll_seat2 INTEGER, -- Precomputed d6 roll for seat2 (revealed when player clicks)
  first_roll_revealed_seat1 BOOLEAN DEFAULT FALSE, -- Has seat1 revealed their roll?
  first_roll_revealed_seat2 BOOLEAN DEFAULT FALSE, -- Has seat2 revealed their roll?
  
  -- Game state (JSONB with strict schema - see Section C)
  game_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Results
  winner_id UUID REFERENCES profiles(id),
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  player1_points INTEGER DEFAULT 0, -- Leaderboard points (idempotent write guard)
  player2_points INTEGER DEFAULT 0,
  forfeited_by UUID REFERENCES profiles(id), -- If forfeited
  points_awarded_at TIMESTAMP WITH TIME ZONE, -- Idempotency guard
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  last_action_at TIMESTAMP WITH TIME ZONE, -- For abandonment timeout detection
  
  CHECK (player1_id != player2_id)
);

CREATE INDEX idx_ape_in_pvp_matches_status ON ape_in_pvp_matches(match_status);
CREATE INDEX idx_ape_in_pvp_matches_code ON ape_in_pvp_matches(match_code);
CREATE INDEX idx_ape_in_pvp_matches_players ON ape_in_pvp_matches(player1_id, player2_id);
```

**New Table: `ape_in_pvp_leaderboard`**
```sql
CREATE TABLE IF NOT EXISTS ape_in_pvp_leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Stats
  total_matches INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  forfeits INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0, -- Win=2, Loss=1, Forfeit=0
  
  -- Win rate
  win_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage
  
  -- Timestamps
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_played_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(user_id)
);

CREATE INDEX idx_ape_in_pvp_leaderboard_points ON ape_in_pvp_leaderboard(total_points DESC);
CREATE INDEX idx_ape_in_pvp_leaderboard_win_rate ON ape_in_pvp_leaderboard(win_rate DESC);
```

---

## 🔄 Implementation Phases

### Phase 1: Foundation & Matching System
**Goal**: Create matching modal and basic infrastructure

#### 1.1 PVP Button Activation
- **File**: `features/games/ape-in/components/MainMenu.tsx`
- **Change**: Remove "Coming Soon" overlay from PVP card, enable click handler
- **Action**: When PVP clicked, open `PvPMatchModal`

#### 1.2 PVP Match Modal Component
**File**: `features/games/ape-in/pvp/components/PvPMatchModal.tsx`

**UI Design**:
```
┌─────────────────────────────────────┐
│  ⚔️ Find a PVP Match                │
├─────────────────────────────────────┤
│                                     │
│  [🔍 Find Public Match]             │
│                                     │
│  ─────────── OR ───────────         │
│                                     │
│  [🔗 Create Private Match]          │
│  Match Code: [ABC123] [Copy]       │
│                                     │
│  ─────────── OR ───────────         │
│                                     │
│  [🔑 Join Private Match]            │
│  Enter Code: [______] [Join]       │
│                                     │
│  [Cancel]                           │
└─────────────────────────────────────┘
```

**Features**:
- Three match types: Public, Create Private, Join Private
- Match code generation (6-8 alphanumeric, case-insensitive)
- Copy to clipboard functionality
- Validation for private match codes

#### 1.3 Waiting Room Component
**File**: `features/games/ape-in/pvp/components/PvPWaitingRoom.tsx`

**States**:
1. **Searching for Match** (Public)
   - Animated spinner
   - "Searching for opponent..."
   - Cancel button
   - Timeout: 60 seconds (configurable)

2. **Waiting for Opponent** (Private - Host)
   - Match code displayed
   - "Waiting for opponent to join..."
   - Share code button
   - Cancel button

3. **Connecting** (Private - Joiner)
   - "Connecting to match..."
   - Cancel button

**Timeout Handling**:
- After 60 seconds: Show "No opponent found" message
- Option to retry or cancel
- Clean up match from database if abandoned

#### 1.4 Match-Making Service (Atomic Operations Required)

**File**: `features/games/ape-in/pvp/services/pvp-match.service.ts`

**Functions**:
```typescript
// Public match: Find waiting player or create new waiting match (ATOMIC)
async findPublicMatch(playerId: string, playerAddress: string): Promise<Match | null>

// Private match: Create match with code
async createPrivateMatch(playerId: string, playerAddress: string): Promise<Match>

// Private match: Join by code (ATOMIC)
async joinPrivateMatch(matchCode: string, playerId: string, playerAddress: string): Promise<Match>

// Cancel/abandon match
async cancelMatch(matchId: string, playerId: string): Promise<void>

// Poll for match status (until opponent joins)
async pollMatchStatus(matchId: string): Promise<Match>
```

**F) Matchmaking: Atomic Database RPC (CRITICAL - Prevents Double-Join)**

**REQUIRED**: Single atomic Postgres function with row locking

**Postgres Function**:
```sql
CREATE OR REPLACE FUNCTION pvp_find_or_create_public_match(
  p_user_id UUID,
  p_wallet_address TEXT,
  p_username TEXT,
  p_avatar_url TEXT
)
RETURNS UUID AS $$
DECLARE
  v_match_id UUID;
  v_waiting_match RECORD;
  v_roll_seat1 INTEGER;
  v_roll_seat2 INTEGER;
  v_initial_state JSONB;
BEGIN
  -- Lock and find one waiting match (SKIP LOCKED prevents blocking)
  SELECT id, player1_id INTO v_waiting_match
  FROM ape_in_pvp_matches
  WHERE match_status = 'waiting'
    AND match_type = 'public'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF v_waiting_match.id IS NOT NULL THEN
    -- Precompute first-player rolls (evenly weighted 1-6)
    -- Note: Postgres random() is sufficient for this use case
    -- For production, consider using pgcrypto extension for crypto-safe RNG if available
    v_roll_seat1 := floor(random() * 6) + 1;  -- 1-6, evenly weighted
    v_roll_seat2 := floor(random() * 6) + 1;
    
    -- Initialize game_state with strict schema
    v_initial_state := jsonb_build_object(
      'state_version', 1,
      'turn_number', 0,
      'phase', 'FIRST_ROLL_P1',
      'round_number', 0,
      'seat_map', jsonb_build_object(
        'seat1', v_waiting_match.player1_id::text,  -- Temporary: will be reassigned after rolls
        'seat2', p_user_id::text
      ),
      'current_turn_seat', NULL,
      'scores', jsonb_build_object(
        'seat1_total', 0,
        'seat2_total', 0,
        'seat1_turn', 0,
        'seat2_turn', 0
      ),
      'last_action', NULL,
      'action_counts', jsonb_build_object(
        'seat1_actions', 0,
        'seat2_actions', 0,
        'total_actions', 0
      ),
      'deck_config', jsonb_build_object(
        'bearish_weight', 3,
        'bear_minus_10_copies', 6,
        'mode', 'pvp_v1'
      )
    );
    
    -- Claim the waiting match as player2 and initialize for first-player roll
    UPDATE ape_in_pvp_matches
    SET 
      player2_id = p_user_id,
      player2_address = p_wallet_address,
      player2_name = p_username,
      player2_avatar_url = p_avatar_url,
      match_status = 'rolling_for_first',
      started_at = NOW(),
      last_action_at = NOW(),
      first_roll_seat1 = v_roll_seat1,
      first_roll_seat2 = v_roll_seat2,
      first_roll_revealed_seat1 = FALSE,
      first_roll_revealed_seat2 = FALSE,
      game_state = v_initial_state
    WHERE id = v_waiting_match.id;
    
    RETURN v_waiting_match.id;
  ELSE
    -- Create new waiting match as player1
    v_initial_state := jsonb_build_object(
      'state_version', 1,
      'turn_number', 0,
      'phase', 'WAITING_FOR_OPPONENT',
      'round_number', 0,
      'seat_map', jsonb_build_object(
        'seat1', NULL,
        'seat2', NULL
      ),
      'current_turn_seat', NULL,
      'scores', jsonb_build_object(
        'seat1_total', 0,
        'seat2_total', 0,
        'seat1_turn', 0,
        'seat2_turn', 0
      ),
      'last_action', NULL,
      'action_counts', jsonb_build_object(
        'seat1_actions', 0,
        'seat2_actions', 0,
        'total_actions', 0
      ),
      'deck_config', jsonb_build_object(
        'bearish_weight', 3,
        'bear_minus_10_copies', 6,
        'mode', 'pvp_v1'
      )
    );
    
    INSERT INTO ape_in_pvp_matches (
      player1_id,
      player1_address,
      player1_name,
      player1_avatar_url,
      match_type,
      match_status,
      game_state,
      last_action_at
    )
    VALUES (
      p_user_id,
      p_wallet_address,
      p_username,
      p_avatar_url,
      'public',
      'waiting',
      v_initial_state,
      NOW()
    )
    RETURNING id INTO v_match_id;
    
    RETURN v_match_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

**Why This Works**:
- `FOR UPDATE SKIP LOCKED` ensures only one transaction can claim a waiting match
- Atomic operation prevents race conditions
- No "check then insert" pattern that can fail under concurrency
- When second player joins, immediately precomputes first-player rolls and initializes `game_state` with strict schema
- `seat_map` initially set to join order, then reassigned after first-player roll resolution

**API Endpoint Implementation**:
- Client calls: `POST /api/ape-in/pvp/match/public`
- **Server-only**: API route uses **service-role client** (bypasses RLS)
- Server calls: `supabase.rpc('pvp_find_or_create_public_match', {...})` using **service-role client**
- Returns match_id immediately
- **CRITICAL**: Clients NEVER insert matches directly - all match creation via server API routes

**Matching Logic**:
- **Public**: 
  - Client calls API → **Server-only** (service-role client)
  - Server calls atomic RPC → RPC finds waiting match OR creates new one
  - When second player joins → RPC precomputes rolls, initializes `game_state`, sets match status → 'rolling_for_first'
  
- **Private**: 
  - Host calls API → **Server-only** creates match with unique code
  - Joiner calls API → Server validates code → Joins match (atomic update)
  - When second player joins → Server precomputes rolls, initializes `game_state`, sets match status → 'rolling_for_first'
  
**CRITICAL**: All match creation/joining happens server-side via API routes. Clients NEVER insert into `ape_in_pvp_matches` directly.

---

### Phase 2: Game State & Real-Time Sync
**Goal**: Implement PVP game state management and synchronization

#### 2.1 PVP Game State Hook
**File**: `features/games/ape-in/pvp/hooks/usePvPGameState.ts`

**Responsibilities**:
- Manage local game state (scores, turn, round)
- Sync with server on each action
- Handle turn transitions
- Detect game end conditions

**State Structure**:
```typescript
interface PvPGameState {
  matchId: string
  player1: { id: string, name: string, avatar: string, score: number, turnScore: number }
  player2: { id: string, name: string, avatar: string, score: number, turnScore: number }
  currentPlayerId: string // Who's turn it is
  roundCount: number
  isPlayer1Turn: boolean
  gameStatus: 'waiting' | 'in_progress' | 'completed' | 'forfeited'
  winnerId: string | null
  firstPlayerId: string // Who went first
}
```

#### 2.2 WebSocket/Real-Time Sync
**File**: `features/games/ape-in/pvp/hooks/usePvPWebSocket.ts`

**Options**:
1. **Supabase Realtime** (Recommended)
   - Subscribe to `ape_in_pvp_matches` table changes
   - Real-time updates when opponent makes move
   - Automatic reconnection

2. **Polling Fallback**
   - Poll every 2-3 seconds if WebSocket unavailable
   - Less efficient but more reliable

**Events**:
- `match_started`: Both players ready
- `player_action`: Opponent made move (draw, roll, stack)
- `turn_changed`: Turn switched
- `round_ended`: Round completed
- `game_ended`: Game finished
- `player_forfeited`: Opponent forfeited

#### 2.3 First Player Selection (D) Server Precomputed, Player-Triggered Reveal

**File**: `features/games/ape-in/pvp/utils/pvp-dice.ts`

**D) First-Player Roll UX (CRITICAL - Server Precomputed, Player-Triggered Reveal)**

**Flow**:
1. **Match Status**: When both players join → `match_status = 'rolling_for_first'`
2. **Server Precomputation**: Server immediately generates two d6 rolls (evenly weighted, crypto-safe RNG)
   - Stores in: `first_roll_seat1`, `first_roll_seat2`
   - Sets: `first_roll_revealed_seat1 = FALSE`, `first_roll_revealed_seat2 = FALSE`
   - Sets: `game_state.phase = "FIRST_ROLL_P1"`
3. **UI Prompt Seat1**: Client shows "Roll to determine who goes first" button
4. **Seat1 Clicks "Roll"**: 
   - Client calls: `POST /api/ape-in/pvp/game/[matchId]/reveal-first-roll`
   - Server reveals `first_roll_seat1` (already decided)
   - Sets: `first_roll_revealed_seat1 = TRUE`
   - Sets: `game_state.phase = "FIRST_ROLL_P2"`
   - Returns: `{ roll: first_roll_seat1, revealed: true }`
5. **UI Prompt Seat2**: Client shows "Roll to determine who goes first" button
6. **Seat2 Clicks "Roll"**:
   - Client calls: `POST /api/ape-in/pvp/game/[matchId]/reveal-first-roll`
   - Server reveals `first_roll_seat2` (already decided)
   - Sets: `first_roll_revealed_seat2 = TRUE`
   - Server compares rolls:
     - If `first_roll_seat1 > first_roll_seat2`: 
       - `seat_map.seat1 = player1_id` (if player1_id rolled higher)
       - `seat_map.seat2 = player2_id`
     - If `first_roll_seat2 > first_roll_seat1`:
       - `seat_map.seat1 = player2_id` (if player2_id rolled higher)
       - `seat_map.seat2 = player1_id`
     - If tie:
       - Server precomputes NEW pair of rolls
       - Resets `first_roll_revealed_seat1/seat2 = FALSE`
       - Repeats from step 3
7. **Resolution**:
   - Sets: `game_state.phase = "DRAW"`
   - Sets: `game_state.current_turn_seat = "seat1"`
   - Sets: `match_status = 'in_progress'`
   - Returns result to both clients

**UI Labeling Based on `seat_map`**:
- **NOT** based on `player1_id` / `player2_id` (join order)
- **Based on** `game_state.seat_map.seat1` / `seat_map.seat2` (turn order)
- Example:
  ```typescript
  const isPlayer1 = gameState.seat_map.seat1 === currentUserId
  const opponentId = isPlayer1 ? gameState.seat_map.seat2 : gameState.seat_map.seat1
  const displayLabel = isPlayer1 ? "Player 1 (You)" : "Player 2 (You)"
  ```

**Dice Roll Implementation (Server-Side)**:
```typescript
// Server-side: Evenly weighted d6 (all numbers equal probability)
function rollFairD6(): number {
  // Use crypto-safe RNG (Node.js crypto.randomInt or similar)
  return crypto.randomInt(1, 7) // 1-6, equal probability
}
```

---

### Phase 3: PVP Game Board
**Goal**: Create PVP-specific game board with turn management

#### 3.1 PVP Game Board Component
**File**: `features/games/ape-in/pvp/components/PvPGameBoard.tsx`

**Key Differences from Regular GameBoard**:
- Shows **both players** (not player vs bot)
- **Turn indicator**: Clear visual showing whose turn it is
- **Opponent's turn**: Disabled buttons, show "Waiting for opponent..."
- **Real-time updates**: Display opponent's actions (cards drawn, dice rolled)
- **Round indicator**: Show current round number
- **Player displays**: Names, avatars, scores prominently shown

**Layout**:
```
┌─────────────────────────────────────────┐
│  Round 1                                │
├─────────────────────────────────────────┤
│  Player 1 (You)          Player 2        │
│  [Avatar] [Name]        [Avatar] [Name] │
│  Score: 45               Score: 32       │
│  Turn: 12                Turn: 8        │
├─────────────────────────────────────────┤
│                                         │
│  [Card Display Area]                    │
│                                         │
│  [Dice Display]                         │
│                                         │
├─────────────────────────────────────────┤
│  [Draw] [Roll] [Stack]  [Forfeit]      │
│  (Disabled if not your turn)            │
└─────────────────────────────────────────┘
```

#### 3.2 Turn Management
**Flow**:
1. Player 1's turn:
   - Player 1 can: Draw, Roll, Stack
   - Player 2 sees: "Waiting for Player 1..."
   - When Player 1 stacks or busts → Turn ends

2. Player 2's turn:
   - Player 2 can: Draw, Roll, Stack
   - Player 1 sees: "Waiting for Player 2..."
   - When Player 2 stacks or busts → Turn ends

3. Round ends:
   - Both players completed their turn
   - Check win condition (150 sats)
   - If no winner → Next round
   - If winner → Game ends

#### 3.3 Player Display Component
**File**: `features/games/ape-in/pvp/components/PvPPlayerDisplay.tsx`

**Shows**:
- Avatar (from profile or default)
- Name (from profile or wallet ID)
- Current score
- Turn score
- Turn indicator (if active turn)

**Fallback Logic**:
```typescript
const displayName = player.name || `Player ${player.address.slice(0, 6)}`
const displayAvatar = player.avatar_url || '/default-avatar.png'
```

---

### Phase 4: Card System Adjustments
**Goal**: Update card distribution for PVP mode

#### 4.1 Bearish Card Updates (G) PvP-Only Tuning - NO Shared Code Changes

**G) PvP-Only Tuning (CRITICAL - Do NOT Modify Existing Files)**

**REQUIRED**: Copy/rename existing logic into PVP folder

**New Files** (isolated PVP logic):
- `features/games/ape-in/pvp/logic/pvp_card_logic.ts` (copied from `lib/ape-in/game-logic-cards.ts`)
- `features/games/ape-in/pvp/logic/pvp_dice_logic.ts` (copied from `lib/ape-in/game-logic-dice.ts`)

**Changes in PVP-Only Files**:
- **Bear -10 Sats**: Set to 6 total copies (PvP-specific)
- **Bearish Weight**: Increase from 2 to 3 (PvP-specific)
- **Bearish Distribution**: Ensure all 3 types available in PVP

**Updated Weights** (PvP-only):
```typescript
// features/games/ape-in/pvp/logic/pvp_card_logic.ts
const PVP_CARD_WEIGHTS = {
  "Cipher_1pt": 6,
  "Cipher_2pt": 8,
  "Cipher_3pt": 9,
  "Cipher_5pt": 15,
  "Cipher_8pt": 15,
  "Oracle": 10,
  "Historacle": 4,
  "Bearish": 3, // Increased from 2 (PvP-only)
  "Special": 15,
}

// PVP mode: 6 copies of Bear -10 (PvP-only)
const bearMinus10Count = 6  // Always 6 for PvP
```

**Existing Files Remain Untouched**:
- `lib/ape-in/game-logic-cards.ts` - NO CHANGES
- `lib/ape-in/game-logic-dice.ts` - NO CHANGES
- All bot modes (Sandy, Aida, etc.) use original logic

---

### Phase 5: API Endpoints
**Goal**: Create backend API for PVP functionality

#### 5.1 Match Endpoints
**File**: `app/api/ape-in/pvp/match/route.ts`

**Runtime**: **Node runtime** (not Edge) - Required for service-role Supabase client

**Endpoints**:
- `POST /api/ape-in/pvp/match/public` - Find/create public match (server-only, calls atomic RPC)
- `POST /api/ape-in/pvp/match/private` - Create private match (server-only)
- `POST /api/ape-in/pvp/match/join` - Join private match (server-only, atomic)
- `GET /api/ape-in/pvp/match/[matchId]` - Get match status (client can call)
- `POST /api/ape-in/pvp/match/[matchId]/cancel` - Cancel match (server-only)

#### 5.2 Game Action Endpoints (Server-Authoritative)

**Runtime**: **Node runtime** (not Edge) - Required for `crypto.randomInt()` and service-role Supabase client

**File**: `app/api/ape-in/pvp/game/[matchId]/draw/route.ts`
- `POST /api/ape-in/pvp/game/[matchId]/draw`
- **Server**: Generates card (PvP card logic using `crypto.randomInt()`), applies effects, updates `game_state`, increments `turn_number`
- **Client**: Receives new state, displays card

**File**: `app/api/ape-in/pvp/game/[matchId]/roll/route.ts`
- `POST /api/ape-in/pvp/game/[matchId]/roll`
- **Server**: Generates dice roll (using `crypto.randomInt(1, 7)`), applies bust/effects, updates `game_state`, increments `turn_number`
- **Client**: Receives new state, displays dice animation

**File**: `app/api/ape-in/pvp/game/[matchId]/stack/route.ts`
- `POST /api/ape-in/pvp/game/[matchId]/stack`
- **Server**: Banks turn score, transitions to opponent turn, updates `game_state`, increments `turn_number`
- **Client**: Receives new state, shows turn transition

**File**: `app/api/ape-in/pvp/game/[matchId]/forfeit/route.ts`
- `POST /api/ape-in/pvp/game/[matchId]/forfeit`
- **Server**: Validates forfeit allowed, calculates points (see Section E), updates match status
- **Client**: Receives forfeit result, shows end modal

**File**: `app/api/ape-in/pvp/game/[matchId]/state/route.ts`
- `GET /api/ape-in/pvp/game/[matchId]/state`
- **Server**: Returns current `game_state` JSONB (for resume on refresh)
- **Client**: Uses for refresh-proof resume

#### 5.3 First Player Selection (Reveal Endpoint)

**File**: `app/api/ape-in/pvp/game/[matchId]/reveal-first-roll/route.ts`
- **Runtime**: **Node runtime** (not Edge)
- `POST /api/ape-in/pvp/game/[matchId]/reveal-first-roll`
- **Server**: 
  1. Checks if roll already precomputed
  2. Reveals precomputed roll for requesting player (from `first_roll_seat1` or `first_roll_seat2`)
  3. Sets `first_roll_revealed_seat1` or `first_roll_revealed_seat2` = TRUE
  4. If both revealed, compares rolls:
     - If tie: Precomputes new pair using `crypto.randomInt(1, 7)`, resets revealed flags
     - If not tie: Sets `seat_map.seat1` = winner's userId, `seat_map.seat2` = other userId
  5. Updates `game_state.phase = 'DRAW'`, `current_turn_seat = 'seat1'`, `match_status = 'in_progress'`
- **Client**: Receives revealed roll, shows in UI

---

### Phase 6: Scoring & Leaderboard
**Goal**: Implement PVP scoring and leaderboard integration

#### 6.1 PVP Scoring Service (E) Abandon vs Forfeit Rules)

**File**: `features/games/ape-in/pvp/utils/pvp-scoring.ts`

**E) Abandon vs Forfeit Rules (CRITICAL)**

**Forfeit Scoring Logic**:
```typescript
function calculatePvPPoints(
  result: 'win' | 'loss' | 'forfeit' | 'abandoned',
  isForfeitingPlayer: boolean,
  totalActions: number  // From game_state.action_counts.total_actions
): number {
  if (result === 'win') return 2
  if (result === 'loss' && !isForfeitingPlayer) return 1
  if (result === 'forfeit' && isForfeitingPlayer) return 0
  // Winner of forfeit gets 2 points ONLY if total_actions >= 1
  if (result === 'forfeit' && !isForfeitingPlayer) {
    return totalActions >= 1 ? 2 : 0  // Prevents instant forfeit farming
  }
  // Abandoned: no points for anyone
  if (result === 'abandoned') return 0
  return 0
}
```

**Forfeit Rules**:
- Allowed only if `match_status = 'in_progress'`
- On forfeit:
  - If `game_state.action_counts.total_actions >= 1`:
    - Forfeiter gets 0 points
    - Opponent gets 2 points
  - Else (total_actions < 1):
    - No points awarded (prevents instant forfeit farming/grief loops)
  - Match status → `'forfeited'`
  - Set `forfeited_by` to forfeiting player's ID

**Abandoned Rules** (Time-Based Server Decision):
- **Definition**: Abandonment is a **server-side time-based rule**
  - Server checks: `NOW() - last_action_at > 5 minutes` AND `match_status = 'in_progress'`
  - If condition met → Server sets `match_status = 'abandoned'`
- **Points**: **0 for both players** (no points awarded)
- **Processing Guard**: Server sets `points_awarded_at = NOW()` to prevent double-processing
  - Note: `points_awarded_at` means "results processed", not "points awarded"
  - For abandoned matches, it prevents re-processing but points remain 0
- **Client UX Behavior** (deterministic):
  - Client receives realtime update or polls and sees `match_status = 'abandoned'`
  - Client immediately:
    1. Clears `active_pvp_match_id` from localStorage
    2. Shows modal message: **"Connection lost, returning to menu."**
    3. Redirects to main menu after 2-3 seconds
- **Edge Case**: If one player is idle but the other is active
  - Server still checks `last_action_at` (last action by either player)
  - If no actions for 5 minutes → Abandoned (no points)
  - Keeps it simple: time-based only, no complex "who's connected" logic

**Timeout Windows**:
- **Waiting Room**: 60 seconds (no opponent found)
- **In-Progress Abandonment**: **5 minutes** of inactivity (server-side check)

#### 6.2 Leaderboard Service (H) Server-Side Only, Idempotent

**File**: `features/games/ape-in/pvp/services/pvp-leaderboard.service.ts`

**H) Leaderboard + Profile Stats (CRITICAL - Server-Side Only, Idempotent)**

**Functions**:
```typescript
// Update leaderboard after match (SERVER-SIDE ONLY, via API endpoint)
async updateLeaderboard(
  matchId: string,
  player1Id: string,
  player2Id: string,
  player1Result: 'win' | 'loss' | 'forfeit',
  player2Result: 'win' | 'loss' | 'forfeit',
  player1Points: number,
  player2Points: number
): Promise<void>

// Get PVP leaderboard (READ-ONLY, client can call)
async getPvPLeaderboard(limit: number = 100): Promise<PvPLeaderboardEntry[]>
```

**Idempotency Guard**:
- Match completion/forfeit/abandonment endpoints check:
  ```typescript
  if (match.points_awarded_at !== null) {
    // Already processed, skip (idempotent)
    return { success: true, already_processed: true }
  }
  ```
- After processing match result:
  - Set `points_awarded_at = NOW()` (means "results processed", not necessarily "points awarded")
  - For completed/forfeited: Update `ape_in_pvp_leaderboard` with calculated points
  - For abandoned: Set points to 0, still set `points_awarded_at` to prevent re-processing
  - Update profile stats (if extended)

**New Database Fields/Tables**:
- `ape_in_pvp_leaderboard` table (see Database Schema section)
- Profile stats extension (optional):
  ```sql
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pvp_matches INTEGER DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pvp_wins INTEGER DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pvp_losses INTEGER DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pvp_forfeits INTEGER DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pvp_points INTEGER DEFAULT 0;
  ```

**Arcade Hub Mirroring**:
- Arcade hub reads from `ape_in_pvp_leaderboard` (Supabase)
- Ape In homepage mirrors hub data (same pattern as existing leaderboards)
- Single source of truth: Supabase

**Leaderboard Entry**:
```typescript
interface PvPLeaderboardEntry {
  rank: number
  user_id: string
  username: string | null
  wallet_address: string
  avatar_url: string | null
  total_matches: number
  wins: number
  losses: number
  forfeits: number
  total_points: number
  win_rate: number
}
```

#### 6.3 Leaderboard Provider Integration
**File**: `components/leaderboard-provider.tsx`

**Changes**:
- Add `pvp` to `apeInLeaderboards` type
- Add `refreshPvP()` function
- Fetch PVP leaderboard from Supabase

**File**: `features/games/ape-in/components/LeaderboardModal.tsx`

**Changes**:
- Enable PVP tab (remove "Coming Soon")
- Display PVP leaderboard when selected
- Show: Rank, Name, Avatar, Wins, Losses, Points, Win Rate

---

### Phase 7: Game Result Submission
**Goal**: Submit PVP match results to database

#### 7.1 Match Completion (Server-Side, Idempotent)
**File**: `app/api/ape-in/pvp/game/[matchId]/complete/route.ts`

**Process**:
1. **Idempotency Check**: If `points_awarded_at IS NOT NULL`, return early (already completed)
2. Validate match is `in_progress`
3. Determine winner from `game_state.scores`:
   - Check if `seat1_total >= 150` or `seat2_total >= 150`
   - Higher score wins (if both >= 150)
4. Calculate points using `calculatePvPPoints()` (see Section E)
5. Update `ape_in_pvp_matches`:
   - `match_status = 'completed'`
   - `winner_id` (from `seat_map`)
   - `player1_score`, `player2_score` (from `game_state.scores`)
   - `player1_points`, `player2_points` (calculated)
   - `points_awarded_at = NOW()` (idempotency guard)
   - `ended_at = NOW()`
6. Update `ape_in_pvp_leaderboard` for both players (server-side)
7. Update profile stats (if extended)
8. Return results to clients

#### 7.2 Forfeit Handling (Server-Side)
**File**: `app/api/ape-in/pvp/game/[matchId]/forfeit/route.ts`

**Process**:
1. Validate match is `in_progress`
2. Validate requesting user is a participant
3. Get `game_state.action_counts.total_actions`
4. Calculate points:
   - Forfeiting player: 0 points
   - Opponent: 2 points **ONLY if total_actions >= 1** (see Section E)
5. Update `ape_in_pvp_matches`:
   - `forfeited_by` = forfeiting player ID
   - `match_status = 'forfeited'`
   - `player1_points`, `player2_points` (calculated)
   - `points_awarded_at = NOW()`
   - `ended_at = NOW()`
6. Update `ape_in_pvp_leaderboard` (server-side)
7. Notify opponent via WebSocket/polling
8. Return result to both clients

#### 7.3 Abandonment Detection (Server-Side Background Job)
**File**: `app/api/ape-in/pvp/abandonment-check/route.ts` (or cron job)

**Runtime**: Must run in **Node runtime** (not Edge)

**Process**:
1. Find matches where:
   - `match_status = 'in_progress'`
   - `last_action_at < NOW() - INTERVAL '5 minutes'`
   - `points_awarded_at IS NULL` (not already processed)
2. For each abandoned match:
   - Set `match_status = 'abandoned'`
   - Set `player1_points = 0`, `player2_points = 0`
   - Set `points_awarded_at = NOW()` (prevents double-processing, even though points are 0)
   - Set `ended_at = NOW()`
   - Update `game_state.phase = 'GAME_END'`
   - Notify both clients via WebSocket/polling
3. Clients receive update and show: **"Connection lost, returning to menu."**
   - Clear `active_pvp_match_id` from localStorage
   - Redirect to main menu

### Phase 8: Security & RLS Policies
**Goal**: Implement security measures and Row Level Security

#### 8.1 RLS Policies (I) Security/RLS Recommendations

**I) Security/RLS (CRITICAL - Clients Never Insert/Update game_state)**

**RLS Policies for `ape_in_pvp_matches`**:

```sql
-- Enable RLS
ALTER TABLE ape_in_pvp_matches ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view matches where they are participants
-- NOTE: Permissions always based on player1_id/player2_id (join order)
-- seat_map is NEVER used for authentication/permissions
CREATE POLICY "Users can view own matches"
ON ape_in_pvp_matches FOR SELECT
USING (
  auth.uid()::text = player1_id::text OR 
  auth.uid()::text = player2_id::text
);

-- INSERT: BLOCKED for clients (all inserts via server API routes with service-role)
CREATE POLICY "Clients cannot insert matches"
ON ape_in_pvp_matches FOR INSERT
USING (false);  -- Blocks all client inserts

-- UPDATE: BLOCKED for clients (all updates via server API routes with service-role)
CREATE POLICY "Clients cannot update match state"
ON ape_in_pvp_matches FOR UPDATE
USING (false);  -- Blocks all client updates

-- DELETE: BLOCKED for clients (matches archived, not deleted)
CREATE POLICY "Clients cannot delete matches"
ON ape_in_pvp_matches FOR DELETE
USING (false);  -- Blocks all client deletes
```

**Permission Model Clarification**:
- `player1_id` / `player2_id` = **Join order** (used for permissions/ownership)
- `game_state.seat_map` = **Turn order** (used for UI labeling and game logic)
- **Permissions are ALWAYS based on `player1_id`/`player2_id`, never on `seat_map`**

**Server Endpoints Use Service-Role Client**:
- All API routes use `createClient({ serviceRoleKey })` (admin client)
- Bypasses RLS policies
- Ensures server has full control
- **Runtime Requirement**: All PvP API routes MUST run in **Node runtime** (not Edge) to safely use:
  - `crypto.randomInt()` for RNG
  - Service-role Supabase client
  - Full Node.js APIs

**Client Permissions Summary**:
- ✅ SELECT: Can view their own matches (based on `player1_id`/`player2_id`)
- ❌ INSERT: Blocked (all match creation via server API routes)
- ❌ UPDATE: Blocked (all updates via server endpoints)
- ❌ DELETE: Blocked (matches archived, not deleted)

#### 8.2 RLS Policies for `ape_in_pvp_leaderboard`

```sql
-- Enable RLS
ALTER TABLE ape_in_pvp_leaderboard ENABLE ROW LEVEL SECURITY;

-- SELECT: Public read (anyone can view leaderboard)
CREATE POLICY "Public can view leaderboard"
ON ape_in_pvp_leaderboard FOR SELECT
USING (true);

-- INSERT/UPDATE: Server-only (via service-role)
CREATE POLICY "Server only writes leaderboard"
ON ape_in_pvp_leaderboard FOR ALL
USING (false);  -- Blocks all client writes
```

---

### Phase 9: Rematch Handshake
**Goal**: Implement two-party rematch confirmation

#### 9.1 Rematch Flow (J) Two-Party Handshake

**J) Rematch Handshake (CRITICAL - Always Create New Match)**

**End Modal UI**:
```
┌─────────────────────────────────────┐
│  Game Ended!                        │
│  Winner: Player 1                   │
│  Score: 150 - 120                    │
├─────────────────────────────────────┤
│  [Rematch] [Return to Menu]         │
└─────────────────────────────────────┘
```

**Rematch Flow**:
1. **Player 1 Clicks "Rematch"**:
   - Client calls: `POST /api/ape-in/pvp/game/[matchId]/request-rematch`
   - Server updates `game_state.rematch`:
     ```json
     {
       "requested_by": "player1_user_id",
       "status": "requested"
     }
     ```
   - Player 2's UI shows: "Rematch requested" with "Accept Rematch" button
   - Player 1's UI shows: "Waiting for opponent to accept..."

2. **Player 2 Clicks "Accept Rematch"**:
   - Client calls: `POST /api/ape-in/pvp/game/[matchId]/accept-rematch`
   - Server:
     - Validates rematch request exists
     - Creates **NEW match record** (fresh `id`, fresh `game_state`)
     - Copies `match_type` (public/private) from original match
     - Sets `match_status = 'rolling_for_first'`
     - Precomputes first-player rolls
     - Returns new `match_id` to both clients
   - Both clients:
     - Clear old `active_pvp_match_id` from localStorage
     - Set new `active_pvp_match_id`
     - Redirect to new match (first-player roll phase)

3. **Player 2 Declines or Timeout**:
   - If Player 2 clicks "Return to Menu" or timeout (30-60s):
   - Server updates `game_state.rematch.status = "declined"` or `"expired"`
   - Both clients show: "Rematch declined" or "Rematch request expired"
   - Both stay at end screen, can return to menu

**Important**:
- **NEVER reuse the same match row** for rematch
- Always create a new match record with fresh state
- Original match remains in database (for history/stats)

**Rematch State in `game_state`**:
```typescript
rematch?: {
  requested_by: string  // userId who requested
  status: "requested" | "accepted" | "declined" | "expired"
  new_match_id?: string  // Set when accepted
}
```

---

## 🎨 UI/UX Design Decisions

### Matching Modal
- **Public Match**: Single button, clear "Searching..." state
- **Private Match**: Two-step (Create/Join), match code prominently displayed
- **Timeout**: Clear messaging, retry option

### Game Board
- **Turn Indicator**: Prominent banner showing whose turn
- **Opponent Actions**: Show cards drawn, dice rolled (with animation)
- **Score Display**: Large, clear scores for both players
- **Round Counter**: Top of screen, always visible

### Player Display
- **Avatar**: Circular, 48x48px minimum
- **Name**: Bold, readable font
- **Score**: Large numbers, color-coded (green for leader)
- **Turn Indicator**: Pulsing border or glow effect

---

## 🔒 Protection Strategy

### Code Isolation
1. **Separate Folder**: All PVP code in `features/games/ape-in/pvp/`
2. **No Shared State**: PVP uses its own game state management
3. **Separate API Routes**: All PVP endpoints under `/api/ape-in/pvp/`
4. **Separate Database Tables**: `ape_in_pvp_matches`, `ape_in_pvp_leaderboard`

### Minimal Modifications
1. **MainMenu.tsx**: Only enable PVP button (remove disabled state)
2. **LeaderboardModal.tsx**: Add PVP tab (already has placeholder)
3. **leaderboard-provider.tsx**: Add PVP leaderboard fetch

### Testing Strategy
1. **Unit Tests**: Test PVP logic in isolation
2. **Integration Tests**: Test matching, game flow, scoring
3. **E2E Tests**: Full match from start to finish
4. **Regression Tests**: Ensure existing bot modes still work

---

## 📊 Database Migration Plan

### Step 1: Create Tables
```sql
-- Run migration script
-- Creates: ape_in_pvp_matches, ape_in_pvp_leaderboard
-- Adds indexes, constraints
```

### Step 2: RLS Policies
```sql
-- Row Level Security for PVP tables
-- Players can view their own matches
-- Players can create/join matches
-- Players can update their own match actions
```

### Step 3: Functions
```sql
-- Function: update_pvp_leaderboard()
-- Function: calculate_pvp_points()
-- Function: cleanup_abandoned_matches() -- For timeout cleanup
```

---

## 🚀 Deployment Strategy

### Stage 1: Matching System
- Deploy matching modal
- Deploy matching API
- Test public/private matching

### Stage 2: Game Board
- Deploy PVP game board
- Test turn management
- Test real-time sync

### Stage 3: Full Game Flow
- Deploy complete game logic
- Test scoring
- Test leaderboard updates

### Stage 4: Polish & Optimization
- UI/UX improvements
- Performance optimization
- Error handling

---

## ❓ Remaining Decisions Needed

### 1. Matching Modal Design
**Decision**: ✅ **LOCKED** - **A) Full-screen modal overlay** - Clear separation, easy to dismiss

### 2. Match Code Format
**Decision**: ✅ **LOCKED** - **B) 6-character alphanumeric (ABC123)** - Easy to share, type, remember

### 3. Waiting Timeout
**Decision**: ✅ **LOCKED** - **B) 60 seconds** - Balance between patience and efficiency

### 4. Real-Time Sync Method
**Decision**: ✅ **LOCKED** - **C) Hybrid (Realtime + polling fallback)** - Best reliability, graceful degradation

### 5. Bearish Card Percentage
**Decision**: ✅ **LOCKED** - **A) Weight 3, Bear -10 copies 6** - Noticeable but not overwhelming

### 6. Card Distribution Display
**Decision**: ✅ **LOCKED** - **B) Show in match start screen** - Transparency, sets expectations

### 7. Abandonment Timeout
**Question**: How long should inactivity timeout be for in-progress matches?
- A) 3 minutes
- B) 5 minutes ✅ **LOCKED**
- C) 7 minutes

**Decision**: **B) 5 minutes** - Balance between connection issues and preventing stalling

### 8. Rematch Timeout
**Question**: How long should rematch request wait before expiring?
- A) 30 seconds
- B) 60 seconds (recommended)
- C) 90 seconds

**Recommendation**: **B) 60 seconds** - Reasonable time to respond

---

## 📝 Implementation Checklist

### Phase 1: Foundation
- [ ] Create `pvp/` folder structure
- [ ] Create database tables (`ape_in_pvp_matches`, `ape_in_pvp_leaderboard`)
- [ ] Create Postgres function `pvp_find_or_create_public_match` (atomic, with SKIP LOCKED, precomputes rolls, initializes game_state)
- [ ] Set up RLS policies (SELECT allowed for participants, INSERT/UPDATE/DELETE blocked for clients)
- [ ] Configure API routes to use Node runtime (not Edge) for crypto.randomInt and service-role client
- [ ] Enable PVP button in MainMenu
- [ ] Create PvPMatchModal component
- [ ] Create PvPWaitingRoom component
- [ ] Implement match-making service (calls server API, which calls atomic RPC)
- [ ] Create API endpoints for matching (server-only, use service-role client, Node runtime)

### Phase 2: Game State
- [ ] Create usePvPGameState hook (with turn_number ordering rule)
- [ ] Implement refresh-proof resume (localStorage active_pvp_match_id)
- [ ] Implement WebSocket/polling sync (hybrid approach)
- [ ] Create first player selection logic (server precomputed, player-triggered reveal)
- [ ] Implement seat_map-based UI labeling (NOT player1_id/player2_id)
- [ ] Test turn management

### Phase 3: Game Board
- [ ] Create PvPGameBoard component
- [ ] Create PvPPlayerDisplay component
- [ ] Implement turn indicators
- [ ] Add opponent action display
- [ ] Test full game flow

### Phase 4: Card System
- [ ] Copy existing card logic to `pvp/logic/pvp_card_logic.ts` (NO changes to original)
- [ ] Copy existing dice logic to `pvp/logic/pvp_dice_logic.ts` (NO changes to original)
- [ ] Update bearish card weights in PVP-only file (2 → 3)
- [ ] Increase Bear -10 to 6 copies in PVP-only file
- [ ] Test card distribution
- [ ] Verify game balance
- [ ] Verify existing bot modes still work (no regressions)

### Phase 5: API
- [ ] Create all game action endpoints (server-authoritative, service-role client, Node runtime)
- [ ] Implement reveal-first-roll endpoint (server precomputed, updates seat_map)
- [ ] Add match completion endpoint (idempotent, checks points_awarded_at)
- [ ] Add forfeit endpoint (validates total_actions >= 1 for points)
- [ ] Add abandonment detection (background job/cron, Node runtime, time-based rule)
- [ ] Ensure all endpoints use service-role client (bypass RLS)
- [ ] Ensure all endpoints configured for Node runtime (not Edge)

### Phase 6: Scoring & Leaderboard
- [ ] Implement PVP scoring logic (forfeit rules: total_actions >= 1)
- [ ] Create leaderboard service (server-side only writes)
- [ ] Implement idempotency guard (points_awarded_at check)
- [ ] Update leaderboard provider (add PVP leaderboard fetch)
- [ ] Enable PVP tab in LeaderboardModal
- [ ] Test leaderboard updates (verify idempotency)
- [ ] Test forfeit scoring (with and without actions)

### Phase 7: Rematch & Polish
- [ ] Implement rematch handshake (two-party confirmation)
- [ ] Add rematch request/accept endpoints (always create new match, Node runtime)
- [ ] Add error handling
- [ ] Add loading states
- [ ] Add animations
- [ ] Add sound effects (optional)
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Test refresh-proof resume (verify outcomes not undone)
- [ ] Test abandonment timeout (5 minutes, verify points_awarded_at set, points remain 0)
- [ ] Test client UX on abandonment (clear localStorage, show message, redirect)

---

## 🧪 Testing Plan

### Unit Tests
- Dice roll (evenly weighted)
- Scoring calculation
- Turn management logic
- Match code generation

### Integration Tests
- Public match creation/joining
- Private match creation/joining
- Full game flow (start to finish)
- Forfeit handling
- Leaderboard updates

### E2E Tests
- Complete match from matching to completion
- Forfeit scenario
- Timeout scenario
- Multiple concurrent matches

---

## 📚 Documentation Requirements

1. **API Documentation**: All PVP endpoints
2. **Component Documentation**: PVP components usage
3. **Database Schema**: Table structures, relationships
4. **Game Rules**: PVP-specific rules and differences
5. **Troubleshooting Guide**: Common issues and solutions

---

## 🎯 Success Criteria

1. ✅ Players can find and join matches (public and private)
2. ✅ Games play correctly with turn-based structure
3. ✅ Scoring works as specified (Win=2, Loss=1, Forfeit=0)
4. ✅ Leaderboard updates correctly
5. ✅ No breaking changes to existing bot modes
6. ✅ Real-time sync works reliably
7. ✅ Mobile-friendly UI
8. ✅ Error handling for all edge cases

---

## 🔄 Future Enhancements (Post-MVP)

1. **Ranked Matchmaking**: Skill-based matching
2. **Tournament Mode**: Bracket-style competitions
3. **Spectator Mode**: Watch ongoing matches
4. **Replay System**: Review past matches
5. **Chat System**: In-game communication
6. **Achievements**: PVP-specific achievements
7. **Seasonal Leaderboards**: Reset periodically

---

## 📞 Implementation Approach

**CRITICAL**: Follow this exact sequence:

### Step 1: Freeze the Plan ✅
- This plan is FROZEN (see top of document)
- Do not change during implementation except for typos/clarifications
- Treat as a contract

### Step 2: Implement Phase 1 ONLY
**Deliverables**:
- Tables + indexes
- RLS policies
- `pvp_find_or_create_public_match` RPC
- `/match/public` API route
- Minimal waiting room UI
- LocalStorage `active_pvp_match_id`
- **NO game logic yet**

**Resist the urge to jump ahead.**

### Step 3: Test Phase 1 in Isolation
**Before Phase 2, test**:
- Two browsers, two wallets
- Spam "Find Match"
- Refresh mid-wait
- Cancel match
- Let timeout trigger

**If Phase 1 is rock-solid, everything else becomes easy.**

### Step 4: Review Before Phase 2
**Before implementing**:
- `usePvPGameState`
- WebSockets
- First-roll reveal

**Send for review**:
- Phase 1 implementation notes
- Any friction encountered
- Any temptation to "just tweak" logic

---

## 🎯 Architecture Highlights (What Makes This Plan Production-Grade)

### ⭐ Seat Map Decoupling
- `player1_id`/`player2_id` = ownership/permissions
- `seat_map` = turn order/UI
- Enables: first-roll reassignment, rematches, spectators, tournaments, replays

### ⭐ Abandonment Semantics
- Time-based, server-decided, zero points, deterministic UX
- Avoids "who disconnected first?" complexity

### ⭐ Atomic Matchmaking
- `FOR UPDATE SKIP LOCKED` with single RPC
- Eliminates: double joins, phantom matches, race bugs, queue corruption

### ⭐ PvP Logic Isolation
- Copied logic (not parameterized shared logic)
- Prevents: bot regressions, balance bugs, refactor paralysis
