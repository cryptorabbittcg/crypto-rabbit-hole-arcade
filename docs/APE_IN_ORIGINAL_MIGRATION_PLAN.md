# Ape In Game - Original Source Migration Plan

**Date:** 2025-01-XX  
**Objective:** Replace current Ape In implementation with exact functionality from `ape-in-source`  
**Focus:** Layout, styling, menus, functionality, gameplay access, game modes (NO tokens, thirdweb, zkverify for now)

---

## Executive Summary

The original functional Ape In game is in `features/games/ape-in-source/` with:
- **Frontend:** React + Vite (React Router) → Convert to Next.js component
- **Backend:** Python FastAPI (Render.com) → Convert to Next.js API routes
- **Database:** SQLite (SQLAlchemy) → Convert to in-memory store (can upgrade to Vercel KV later)

**Key Difference:** Original uses **weighted card drawing** and **bot turn replay animations** which current implementation lacks.

---

## 1. Analysis of Original Source Structure

### Frontend Structure (ape-in-source/frontend/src/)
```
src/
├── App.tsx                    # React Router entry (Routes: /, /game/:mode, /leaderboard)
├── pages/
│   ├── HomePage.tsx          # ✅ Already restored (main menu with all modes)
│   ├── GamePage.tsx          # Game initialization & flow (358 lines)
│   └── LeaderboardPage.tsx   # Leaderboard display
├── components/
│   ├── GameBoard.tsx         # Core game component (1086 lines) ⭐ CRITICAL
│   ├── Card.tsx              # Card display component
│   ├── Dice.tsx              # Dice component
│   ├── SmartBotIntro.tsx     # Bot intro animations
│   ├── BotIntro.tsx          # Bot intro
│   ├── WelcomeSplash.tsx     # Splash screen ✅ Already restored
│   ├── ParticleBackground.tsx # Background particles ✅ Already exists
│   └── [Header components]   # Various header versions
├── services/
│   ├── api.ts                # API client (calls Render backend)
│   ├── pointsService.ts      # Points calculation
│   ├── paymentService.ts     # Payment validation
│   ├── playBalanceService.ts # Free plays tracking
│   └── resultSubmissionService.ts # Result submission
├── store/
│   └── gameStore.ts          # Zustand store (already identical)
├── config/
│   ├── botConfig.ts          # Bot configurations
│   └── gameModes.ts          # Mode definitions
└── types/
    └── game.ts               # TypeScript types
```

### Backend Structure (ape-in-source/backend/app/)
```
app/
├── main.py                   # FastAPI app entry
├── api/
│   ├── game.py              # Game endpoints (create, draw, roll, stack, forfeit)
│   ├── leaderboard.py       # Leaderboard endpoints
│   └── rewards.py           # Rewards endpoints
├── services/
│   ├── game_service.py      # Game logic service (588 lines) ⭐ CRITICAL
│   ├── leaderboard_service.py
│   └── rewards_service.py
├── game_logic/
│   ├── cards.py             # Weighted card drawing ⭐ DIFFERENT FROM CURRENT
│   └── dice.py              # Dice rolling with profiles
├── models/
│   ├── game.py              # SQLAlchemy models (Game, Player, GameState)
│   └── rewards.py           # Rewards models
└── database/
    └── database.py          # SQLite database setup
```

---

## 2. Key Differences: Original vs Current Implementation

### ⚠️ CRITICAL DIFFERENCES FOUND

#### A. Card Drawing System
**Current Implementation (WRONG):**
- Uses fixed deck with specific card counts
- No weighted probability system
- Cards drawn sequentially from shuffled deck

**Original Implementation (CORRECT):**
- Uses **weighted random card drawing** based on card types
- Different weights: Cipher (6-15), Oracle (10), Historacle (4), Bearish (2-4), Special (15)
- Mode-specific bearish card counts (En-J1n/Nifty get 3 Bear Half, Aida excludes Bear Reset)
- Prevents consecutive Ape In! cards via `exclude_ape_in` parameter
- Card values: Oracle = 13, Historacle = 21 (NOT 1-3 as in current implementation!)

#### B. Dice System
**Current Implementation:**
- Simple `Math.floor(Math.random() * 6) + 1`
- No dice profiles

**Original Implementation:**
- Dice profiles for different AI opponents
- Balanced profile: 30% chance of rolling 1 (player advantage)
- Bot profiles can be "balanced", "aggressive", etc.
- Different weights per face (1: 0.7, 2-6: 1.0 for balanced)

#### C. Bot Turn Replay System
**Current Implementation:**
- Simplified bot turn (one action per stack)
- No replay animations

**Original Implementation:**
- **Full bot turn replay** with sequential animations
- Bot actions array: `[{type: 'draw', card}, {type: 'roll', value, success}, ...]`
- Slow, clear animations (1 second per step)
- Shows bot drawing card → rolling dice → outcomes
- Proper Ape In! card handling (stays visible)

#### D. Game State Structure
**Current Implementation:**
- In-memory store with simple structure
- No `used_bearish_flags` tracking
- No `game_log` array

**Original Implementation:**
- Tracks `used_bearish_flags` (prevents same bearish card type from appearing)
- Maintains `game_log` for debugging/history
- More detailed state tracking

#### E. API Response Format
**Original Roll Response:**
```typescript
{
  value: number,
  success: boolean,
  message?: string,
  satsGained?: number,      // Points gained this roll
  turnScore?: number,        // Current turn score after roll
  botActions?: Array<{       // Full bot turn if player busted
    type: 'draw' | 'roll' | 'ape_in',
    card?: Card,
    value?: number,
    success?: boolean,
    turnScore?: number,
    message?: string
  }>
}
```

#### F. Card Values (CRITICAL - VERIFIED!)
**Original Card Values (CONFIRMED from cards.py):**
- Cipher 1pt: 1
- Cipher 2pt: 2
- Cipher 3pt: 3
- Cipher 5pt: 5
- Cipher 8pt: 8
- **Oracle: 13** (ALL Oracle cards = 13, NOT 1-3! Names: "Aida 1", "Lana 1", "Nifty 1", etc.)
- **Historacle: 21** (ALL Historacle cards = 21, NOT 1-5! Names: "Sats", "Fibonacci", "Gann", "Dow", "Elliott")
- Bearish: 0 (with penalties: "Reset", "Half", "Minus10")
- Special (Ape In!): 0 (Names: "Ape In!", "Ape In!" - two variants)

**Current Implementation Error:**
- Oracle cards incorrectly set to 1, 2, 3 (should all be 13)
- Historacle cards incorrectly set to 1-5 (should all be 21)
- This **significantly affects game balance** and must be fixed!

---

## 3. Migration Strategy: Render Backend → Next.js API Routes

### Phase 1: Port Backend Game Logic to TypeScript

#### 3.1 Port Card Logic (`backend/app/game_logic/cards.py` → `lib/ape-in/game-logic-cards.ts`)
**Replace:** `lib/ape-in/game-logic.ts` (current simplified version)

**New File:** `lib/ape-in/game-logic-cards.ts`
- Port `draw_weighted_card()` function exactly as-is
- Port card definitions with **CORRECT values:**
  - Oracle cards: **ALL = 13** (names: "Aida 1", "Lana 1", "Nifty 1", "Sats 1", etc.)
  - Historacle cards: **ALL = 21** (names: "Sats", "Fibonacci", "Gann", "Dow", "Elliott")
- Port card weights system (Cipher: 6-15, Oracle: 10, Historacle: 4, Bearish: 2-4, Special: 15)
- Port mode-specific bearish card logic:
  - En-J1n/Nifty: 3 copies of Bear Half
  - Aida: Excludes Bear Reset
  - Bear -10: 4 copies for harder modes, 1 for Sandy
- Port `apply_ape_in_effect()` function (doubles card value)
- Port `CARD_BASE_URL` logic (use Next.js public path: `/features/games/ape-in/assets/images/cards`)

**Key Functions:**
```typescript
export function drawWeightedCard(
  usedBearishFlags: string[] = [],
  excludeApeIn: boolean = false,
  gameMode: GameMode = "sandy"
): Card

export function applyApeInEffect(card: Card): Card
```

**Card Definitions to Port:**
```typescript
const CIPHER_CARDS = [
  {name: "Abbie", type: "Cipher", value: 1, ...},
  // ... all 20 cipher cards
]

const ORACLE_CARDS = [
  {name: "Aida 1", type: "Oracle", value: 13, ...},  // ← 13 NOT 1!
  {name: "Aida 2", type: "Oracle", value: 13, ...},
  // ... all 12 oracle cards (all value 13)
]

const HISTORACLE_CARDS = [
  {name: "Sats", type: "Historacle", value: 21, ...},  // ← 21 NOT 1!
  // ... all 5 historacle cards (all value 21)
]
```

#### 3.2 Port Dice Logic (`backend/app/game_logic/dice.py` → `lib/ape-in/game-logic-dice.ts`)
**New File:** `lib/ape-in/game-logic-dice.ts`
- Port `roll_dice()` with dice profiles
- Port `check_bust()` function
- Port `check_dodge_bearish()` function
- Port all dice profiles (balanced, sandy, aida, lana, enj1n, nifty, aggressive variants)

**Key Functions:**
```typescript
export function rollDice(profile: string = "balanced"): number
export function checkBust(roll: number): boolean
export function checkDodgeBearish(roll: number): boolean
```

#### 3.3 Port Game Service (`backend/app/services/game_service.py` → `lib/ape-in/game-service.ts`)
**Replace:** Current simplified `game-logic.ts` and `game-store.ts`

**New File:** `lib/ape-in/game-service.ts`
- Port `GameService` class structure
- Port `create_game()` method (588 lines → TypeScript equivalent)
- Port `draw_card()` method
- Port `roll_dice_action()` method
- Port `stack_sats()` method
- Port `forfeit_game()` method
- Port bot AI decision logic (`_get_ai_target_score()`)
- Port bot turn execution with action array generation

**Key Methods:**
```typescript
class GameService {
  createGame(mode, playerName, walletAddress?, isDailyFree?): GameState
  getGameData(gameId): GameState
  drawCard(gameId, playerId): Card
  rollDiceAction(gameId, playerId, diceProfile?): RollResult
  stackSats(gameId, playerId): GameState
  forfeitGame(gameId, playerId): GameState
  executeBotTurn(gameId): BotActions[]
}
```

### Phase 2: Convert API Routes to Next.js

#### 3.4 Update API Routes (`app/api/ape-in/game/*/route.ts`)
**Current Routes:** ✅ Already exist but need logic update

**Changes Needed:**

1. **`/api/ape-in/game/create/route.ts`**
   - Replace current `createApeInGame()` with `GameService.createGame()`
   - Use weighted card system (no deck building needed)
   - Return exact response format as original

2. **`/api/ape-in/game/[gameId]/draw/route.ts`**
   - Replace `drawCard()` with `GameService.drawCard()`
   - Use weighted drawing, not deck removal
   - Track `used_bearish_flags` in game state

3. **`/api/ape-in/game/[gameId]/roll/route.ts`**
   - Replace current logic with `GameService.rollDiceAction()`
   - Return bot actions array if player busted
   - Include `satsGained`, `turnScore` in response

4. **`/api/ape-in/game/[gameId]/stack/route.ts`**
   - Replace with `GameService.stackSats()`
   - Execute bot turn with full action array
   - Return bot actions for replay

5. **`/api/ape-in/game/[gameId]/forfeit/route.ts`**
   - Replace with `GameService.forfeitGame()`
   - Already correct, minor adjustments

6. **`/api/ape-in/game/[gameId]/route.ts`** (GET)
   - Replace with `GameService.getGameData()`
   - Return exact format as original

#### 3.5 Update Game Store
**Replace:** `lib/ape-in/game-store.ts`

**Changes:**
- Store `used_bearish_flags: string[]` in game state
- Store `game_log: any[]` in game state
- Update `GameState` type to include these fields
- No deck storage needed (weighted drawing doesn't use decks)

---

## 4. Frontend Component Migration

### Phase 3: Replace GameBoard Component

#### 4.1 Replace GameBoard.tsx
**Current:** `features/games/ape-in/components/GameBoard.tsx` (current version)
**Replace With:** `ape-in-source/frontend/src/components/GameBoard.tsx` (1086 lines)

**Key Changes Needed:**
1. Remove `useIdentity()` → Use `useArcade()` from hub
2. Remove `useNavigate()` → Use callback props instead
3. Update API calls → Use relative URLs (`/api/ape-in/game/...`)
4. Keep `onGameEnd` callback for points integration
5. **PRESERVE ALL:** Bot turn replay animations, floating messages, card animations, dice animations

**Critical Features to Preserve:**
- ✅ Bot turn replay with `replayBotTurn()` function
- ✅ Floating message system
- ✅ Card flip animations
- ✅ Dice rolling animations
- ✅ Ape In! card special handling (stays visible)
- ✅ Bearish card penalty display
- ✅ Round popup notifications
- ✅ Score animations

#### 4.2 Update GamePage.tsx → ApeInGame.tsx
**Current:** `features/games/ape-in/apeingame.tsx` (current version)
**Replace With:** `ape-in-source/frontend/src/pages/GamePage.tsx` logic

**Key Changes:**
1. Remove React Router (`useParams`, `useNavigate`) → Use props
2. Keep mode selection flow (splash → main menu → game)
3. Port game initialization logic exactly
4. Port play token/payment validation (can stub for now)
5. Keep intro tracking system

**Changes Needed:**
- Remove `navigate('/game/:mode')` → Use `onSelectMode` callback
- Remove `navigate('/')` → Use `onClose` callback
- Update API client imports → Use `/lib/api.ts` (updated)
- Keep all game initialization logic

#### 4.3 Update Components
**Keep (Already Correct):**
- ✅ `WelcomeSplash.tsx` - Already matches original
- ✅ `SmartBotIntro.tsx` - Already exists
- ✅ `ParticleBackground.tsx` - Already exists
- ✅ `MainMenu.tsx` - Already restored (HomePage.tsx)

**Update (Minor Changes):**
- `Card.tsx` - Verify image paths match
- `Dice.tsx` - Verify animations match

---

## 5. API Client Update

### Phase 4: Update API Service

#### 5.1 Replace `lib/api.ts`
**Current:** `features/games/ape-in/lib/api.ts` (simple fetch calls)
**Replace With:** `ape-in-source/frontend/src/services/api.ts` logic

**Changes:**
1. Update base URL: `https://ape-in-game-backend.onrender.com` → `/api/ape-in`
2. Port all API methods exactly
3. Update response handling for new format (bot actions, etc.)
4. Keep error handling as-is

**API Methods to Port:**
```typescript
gameAPI.createGame(mode, playerName, walletAddress?, isDailyFree?)
gameAPI.getGameState(gameId)
gameAPI.drawCard(gameId)
gameAPI.rollDice(gameId)      // Returns bot actions if busted
gameAPI.stackSats(gameId)     // Returns bot actions
gameAPI.forfeitGame(gameId)
```

---

## 6. Game State & Types Update

### Phase 5: Update Type Definitions

#### 6.1 Update `types/game.ts`
**Add Missing Fields:**
```typescript
interface GameState {
  // ... existing fields
  usedBearishFlags?: string[]  // Track used bearish penalties (e.g., ["Reset", "Half"])
  gameLog?: any[]               // Game action log for debugging
  // Note: botActions are returned in API responses, not stored in GameState
}

interface BotAction {
  type: 'draw' | 'roll' | 'ape_in' | 'stack'
  card?: Card                   // Card data for 'draw' or 'ape_in' actions
  value?: number                // Dice roll value for 'roll' actions
  success?: boolean             // Whether roll succeeded
  turnScore?: number            // Current turn score after this action
  message?: string              // Display message
  finalScore?: number           // Final score for 'stack' actions
}

interface RollResult {
  value: number
  success: boolean
  message?: string
  satsGained?: number          // Points gained this roll
  turnScore?: number           // Current turn score after roll
  botActions?: BotAction[]     // Full bot turn if player busted
}
```

---

## 7. Execution Plan

### Step 1: Backup Current Implementation
- Create backup of current `features/games/ape-in/` 
- Document what works vs what needs replacement

### Step 2: Port Backend Game Logic (Python → TypeScript)
1. ✅ Port `cards.py` → `game-logic-cards.ts` (weighted drawing)
2. ✅ Port `dice.py` → `game-logic-dice.ts` (dice profiles)
3. ✅ Port `game_service.py` → `game-service.ts` (full game logic)
4. ✅ Update `game-store.ts` to support new state fields

### Step 3: Update API Routes
1. ✅ Update `/api/ape-in/game/create/route.ts` (use GameService)
2. ✅ Update `/api/ape-in/game/[gameId]/draw/route.ts` (weighted drawing)
3. ✅ Update `/api/ape-in/game/[gameId]/roll/route.ts` (dice profiles + bot actions)
4. ✅ Update `/api/ape-in/game/[gameId]/stack/route.ts` (bot turn execution)
5. ✅ Update `/api/ape-in/game/[gameId]/route.ts` (GET game state)
6. ✅ Verify `/api/ape-in/game/[gameId]/forfeit/route.ts`

### Step 4: Replace Frontend Components
1. ✅ Replace `GameBoard.tsx` (port from original, update imports)
2. ✅ Update `ApeInGame.tsx` (port GamePage logic, remove React Router)
3. ✅ Update `lib/api.ts` (port API client, update URLs)
4. ✅ Verify `Card.tsx`, `Dice.tsx` match original

### Step 5: Update Configuration
1. ✅ Verify `botConfig.ts` matches original
2. ✅ Update `gameModes.ts` / `constants.ts` if needed
3. ✅ Verify card image paths are correct

### Step 6: Testing & Verification
1. Test Sandy mode (tutorial)
2. Test all bot modes (Aida, Lana, En-J1n, Nifty)
3. Verify bot turn replay animations
4. Verify card values (Oracle=13, Historacle=21)
5. Verify weighted card drawing
6. Verify dice profiles

---

## 8. Files to Replace/Update

### Files to DELETE (after migration):
- `features/games/ape-in-source/` (entire folder, after successful migration)

### Files to REPLACE:
1. `lib/ape-in/game-logic.ts` → Replace with `game-logic-cards.ts` + `game-logic-dice.ts` + `game-service.ts`
2. `components/GameBoard.tsx` → Replace with original (1086 lines)
3. `apeingame.tsx` → Update with GamePage.tsx logic
4. `lib/api.ts` → Update with original API client logic

### Files to UPDATE:
1. `lib/ape-in/game-store.ts` → Add `usedBearishFlags`, `gameLog` fields
2. `types/game.ts` → Add missing BotAction interface and RollResult interface
3. `utils/botConfig.ts` → **ADD MISSING FIELDS:**
   - `targetScores: number[]` (bot AI target scores)
   - `risk: RiskConfig` (risk parameters)
   - `jitter: JitterConfig` (randomness)
   - `diceModes: string[]` (dice profiles)
   - `noRoundLimit?: boolean` (unlimited rounds flag)
4. `app/api/ape-in/game/*/route.ts` → Update all routes to use GameService
5. `utils/cardImages.ts` → Update card name mapping for original names

### Files to KEEP (Already Correct):
- ✅ `components/MainMenu.tsx` (HomePage restored)
- ✅ `components/WelcomeSplash.tsx`
- ✅ `components/ParticleBackground.tsx`
- ✅ `store/gameStore.ts` (Zustand store)
- ✅ `utils/botConfig.ts`

---

## 9. Critical Implementation Details

### 9.1 Weighted Card Drawing
**Original Logic:**
- No physical deck - cards drawn from weighted pool each time
- Weights: Cipher (6-15), Oracle (10), Historacle (4), Bearish (2-4), Special (15)
- Mode-specific bearish counts: En-J1n/Nifty get 3 Bear Half, Aida excludes Bear Reset
- `exclude_ape_in` prevents consecutive Ape In! cards
- `used_bearish_flags` prevents same bearish penalty type from repeating

**Implementation:**
```typescript
function drawWeightedCard(
  usedBearishFlags: string[] = [],
  excludeApeIn: boolean = false,
  gameMode: GameMode = "sandy"
): Card {
  // Build weighted card pool based on mode
  // Use random.choices() equivalent (weighted random)
  // Return card with correct image path
}
```

### 9.2 Bot Turn Replay (VERIFIED FROM ORIGINAL)
**Original Logic (CONFIRMED from GameBoard.tsx):**
- Bot executes full turn, generates action array
- Frontend receives `botActions: Array<{type: 'draw'|'roll'|'ape_in'|'stack', card?, value?, success?, turnScore?, message?}>`
- `replayBotTurn()` function (lines 200-300+) animates each action sequentially:
  - Step 1: Announce bot turn (1500ms)
  - Step 2: Draw card → Show card (1000ms) → Pause (1000ms)
  - Step 3: Announce rolling (1000ms)
  - Step 4: Dice rolling animation (800ms)
  - Step 5: Show roll result (1200ms)
  - Step 6: Show outcome/success (1500ms) or bust (1800ms)
  - Step 7: Clear card, pause (800ms)
  - Repeat for each action
  - Step 8: Bot stacks (2000ms)
  - Step 9: Return to player (1200ms)
- **Ape In! special handling:** Card stays visible until next card drawn
- **Preserve ALL timing delays exactly** - critical for UX

**Implementation Requirements:**
- Backend: `executeBotTurn()` must return complete action array
- Frontend: `replayBotTurn(botActions)` must match original timing exactly
- Each animation step must have correct delays (1000ms, 1500ms, etc.)

### 9.3 Card Values & Naming (CRITICAL CORRECTIONS NEEDED)
**VERIFIED FROM ORIGINAL SOURCE:**

- **Oracle Cards:** ALL have value = 13
  - **Names (with spaces!):** "Aida 1", "Aida 2", "Aida 3", "Lana 1", "Lana 2", "Lana 3", "Nifty 1", "Nifty 2", "Nifty 3", "Sats 1", "Sats 2", "Sats 3"
  - Current implementation incorrectly:
    - Uses values 1, 2, 3 (should all be 13)
    - Uses names "Oracle_Aida_1" (should be "Aida 1")
  - **MUST FIX:** 
    - All Oracle cards = 13 value
    - Names use format "{Mode} {number}" with space (not underscore)
    - Need to map names to image files: "Aida 1" → "Oracle_Aida_1.jpg"

- **Historacle Cards:** ALL have value = 21
  - **Names:** "Sats", "Fibonacci", "Gann", "Dow", "Elliott"
  - Current implementation incorrectly:
    - Uses values 1, 2, 3, 4, 5 (should all be 21)
    - Uses names "Historacle_1_Sats" (should be just "Sats")
  - **MUST FIX:**
    - All Historacle cards = 21 value
    - Names are just the proper names (no prefix)
    - Need to map names to image files: "Sats" → "Historacle_1_Sats.jpg"

- **Bearish Card Names:**
  - Original: "Bear Reset", "Bear Half", "Bear -10"
  - Current: "Bear_Reset", "Bear_Half", "Bear_Minus_10"
  - Need name mapping function

- **Special Card Names:**
  - Original: "Ape In!" (two variants with same name)
  - Current: "Ape_In", "Ape_In_MAYC", "Ape_In_Historic"
  - Need to handle this correctly

### 9.4 Dice Profiles
**Balanced Profile (Player):**
- Roll 1: 30% chance (0.7 weight)
- Roll 2-6: Equal chance (1.0 weight)

**Bot Profiles (from dice.py):**
- `sandy`: Same as balanced (0.7 for 1, 1.0 for 2-6)
- `aida`, `lana`, `enj1n`, `nifty`: Fair dice (1.0 weight all faces)
- Aggressive variants: `aida_aggressive`, `lana_aggressive`, `enj1n_aggressive`, `nifty_aggressive`
  - Biased toward higher numbers with different weights per bot

### 9.5 Bot AI Decision Logic (COMPLEX - from config.py)
**Original Bot Config Structure (VERIFIED):**
Each bot has advanced configuration:
```python
{
  "target_scores": [21, 26, 40],  # Array - bot randomly picks target
  "risk": {
    "basePush": 0.10,           # Base risk tolerance
    "behindPush": 0.60,         # Risk when behind
    "behindGap": 30,            # Gap threshold for "behind"
    "stackAt": 40,              # Stack at this turn score
    "midMin": 21, "midMax": 39, # Mid-range risk zone
    "midPush": 0.50,            # Risk in mid-range
    "highStack": 40             # High-value stack threshold
  },
  "jitter": {
    "enabled": True,
    "pct": 0.10                 # 10% randomness
  },
  "diceModes": ["aida", "aida_aggressive"],  # Which dice profiles to use
  "no_round_limit": True        # Some bots have unlimited rounds
}
```

**Bot Target Scores (from config.py):**
- Sandy: [21]
- Aida: [21, 26, 40]
- Lana: [30]
- En-J1n: [34, 42, 55]
- Nifty: [50]

**Current Implementation:**
- Simple `botShouldContinue()` function
- Basic risk tolerance calculation
- **MUST REPLACE** with full bot AI logic from original

**Bot AI Logic to Port:**
- `_get_ai_target_score()`: Random choice from target_scores array
- Complex risk calculation based on bot config
- Jitter application (randomness factor)
- Dice mode selection from diceModes array
- Round limit handling (no_round_limit flag)

---

## 10. Render Backend → Next.js API Conversion

### Original Endpoints (Render):
```
POST /api/game/create
GET  /api/game/{game_id}
POST /api/game/{game_id}/draw
POST /api/game/{game_id}/roll
POST /api/game/{game_id}/stack
POST /api/game/{game_id}/forfeit
```

### New Endpoints (Next.js):
```
POST /api/ape-in/game/create          ✅ Already exists
GET  /api/ape-in/game/[gameId]        ✅ Already exists
POST /api/ape-in/game/[gameId]/draw   ✅ Already exists
POST /api/ape-in/game/[gameId]/roll   ✅ Already exists
POST /api/ape-in/game/[gameId]/stack  ✅ Already exists
POST /api/ape-in/game/[gameId]/forfeit ✅ Already exists
```

**Conversion:**
- Python FastAPI routes → Next.js API routes (same structure)
- SQLAlchemy models → TypeScript interfaces (same data structure)
- Async database calls → In-memory store (can upgrade to Vercel KV later)
- GameService class → GameService class (same logic, TypeScript)

---

## 11. What Will NOT Change (Per User Request)

### Ignore/Stub Out:
- ❌ Token balance checks (can stub/always return success)
- ❌ Thirdweb integration (use arcade hub context instead)
- ❌ zkVerify (can stub/disable for now)
- ❌ Payment execution (can stub, validation only)
- ❌ Play token system (can stub)
- ❌ Leaderboard submission (can stub)

### Focus On:
- ✅ Game layout and styling (exact match)
- ✅ Menu functionality (already restored)
- ✅ Gameplay access (all modes working)
- ✅ Game modes (Sandy, Aida, Lana, En-J1n, Nifty)
- ✅ Bot turn animations
- ✅ Card/dice animations
- ✅ Game state management
- ✅ Win/loss logic

---

## 12. Risk Assessment

### Low Risk:
- ✅ Component styling (just copy CSS classes)
- ✅ Menu structure (already restored)
- ✅ Type definitions (straightforward port)

### Medium Risk:
- ⚠️ Weighted card drawing (complex logic, must match exactly)
- ⚠️ Bot AI decision logic (588 lines, complex state)
- ⚠️ Bot turn replay animations (timing critical)

### High Risk:
- ⚠️ Game state synchronization (frontend ↔ backend)
- ⚠️ Card value changes (Oracle=13, Historacle=21) - affects game balance
- ⚠️ Dice profile system (affects game difficulty)

---

## 13. Testing Checklist

### Functional Testing:
- [ ] Sandy mode launches and plays correctly
- [ ] All bot modes (Aida, Lana, En-J1n, Nifty) launch
- [ ] Card values correct (Oracle=13, Historacle=21)
- [ ] Weighted card drawing works (no consecutive Ape In!)
- [ ] Dice rolling uses correct profiles
- [ ] Bot turn replay animations work
- [ ] Game state persists during play
- [ ] Win/loss conditions work correctly
- [ ] Bearish card penalties apply correctly
- [ ] Ape In! special card works (doubles next card)

### Visual Testing:
- [ ] All animations match original
- [ ] Card images display correctly
- [ ] Bot avatars display correctly
- [ ] Floating messages appear correctly
- [ ] Score updates animate correctly
- [ ] Round popups appear correctly

---

## 14. Success Criteria

### Migration Complete When:
1. ✅ All 5 game modes (Sandy, Aida, Lana, En-J1n, Nifty) launch and play
2. ✅ Game mechanics match original (weighted cards, dice profiles, bot AI)
3. ✅ All animations and styling match original
4. ✅ Bot turn replay works with full animations
5. ✅ Game state management works correctly
6. ✅ No functionality lost from original
7. ✅ Build completes without errors
8. ✅ `ape-in-source/` folder can be safely deleted

---

## 15. Timeline Estimate

- **Phase 1 (Backend Logic):** 2-3 hours
  - Port cards.py (1 hour)
  - Port dice.py (30 min)
  - Port game_service.py (1.5 hours)

- **Phase 2 (API Routes):** 2-3 hours
  - Update all 6 API routes (30 min each)

- **Phase 3 (Frontend Components):** 3-4 hours
  - Replace GameBoard.tsx (2 hours)
  - Update ApeInGame.tsx (1 hour)
  - Update API client (1 hour)

- **Phase 4 (Testing & Fixes):** 2-3 hours
  - Test all modes
  - Fix issues
  - Verify animations

**Total Estimate:** 9-13 hours

---

## 16. Card Name → Image Filename Mapping

### Issue Identified
**Original Backend:**
- Oracle cards: name = "Aida 1", image_url = "Oracle_Aida_1.jpg"
- Historacle cards: name = "Sats", image_url = "Historacle_1_Sats.jpg"

**Current Implementation:**
- Uses `CARD_IMAGE_MAP` but with different naming conventions
- Oracle: "Oracle_Aida_1" → "Oracle_Aida_1.jpg"
- Historacle: "Sats" → "Historacle_1_Sats.jpg"

**Solution:**
Create mapping function to convert original card names to image filenames:
```typescript
function getImageFilenameFromCardName(cardName: string): string {
  // "Aida 1" → "Oracle_Aida_1.jpg"
  // "Sats" → "Historacle_1_Sats.jpg"
  // "Bear Reset" → "Bear_Reset.jpg"
  // "Ape In!" → "Ape_In.jpg" (first variant)
}
```

---

## 17. What Will Be Replaced (Summary)

### Complete Replacement:
1. ❌ `lib/ape-in/game-logic.ts` → Replace with weighted card system
2. ❌ Current API route logic → Replace with GameService methods
3. ❌ `components/GameBoard.tsx` → Replace with original (1086 lines)
4. ❌ Current game state structure → Add `usedBearishFlags`, `gameLog`

### Partial Update:
1. ⚠️ `apeingame.tsx` → Port GamePage logic, remove React Router
2. ⚠️ `lib/api.ts` → Update to match original API client
3. ⚠️ `utils/cardImages.ts` → Update name mapping for original names

### Keep As-Is:
1. ✅ `components/MainMenu.tsx` (HomePage - already restored)
2. ✅ `components/WelcomeSplash.tsx` (matches original)
3. ✅ `store/gameStore.ts` (Zustand - identical structure)
4. ⚠️ `utils/botConfig.ts` (NEEDS UPDATE - missing AI config fields)
5. ✅ `components/ParticleBackground.tsx` (exists)

---

## 18. Render → Next.js Conversion Details

### Original Render Backend Flow:
```
Frontend → POST https://ape-in-game-backend.onrender.com/api/game/create
         → Python FastAPI receives request
         → GameService.create_game() (Python)
         → SQLAlchemy database (SQLite)
         → Returns JSON response
```

### New Next.js API Flow:
```
Frontend → POST /api/ape-in/game/create
         → Next.js API route receives request
         → GameService.createGame() (TypeScript)
         → In-memory game store (Map)
         → Returns JSON response (same format)
```

**Key Point:** API response format **must match exactly** - frontend expects specific structure.

---

## 19. Bot AI Decision Logic

### Original Implementation (from game_service.py):
- `_get_ai_target_score()`: Random choice from bot config target scores
- Bot continues rolling until target score reached OR bust
- Mode-specific target scores from bot config
- Bot actions array generated as bot plays

**To Port:**
- Port `_get_ai_target_score()` logic
- Port bot turn execution loop
- Port action array generation
- Match bot decision timing

---

## 20. Critical Implementation Notes

### A. No Physical Deck
- **Original:** Weighted random drawing, no deck structure
- **Current:** Creates physical deck, draws sequentially
- **Fix:** Remove deck building, use weighted drawing always

### B. Game State Storage
- **Original:** SQLite database (Game, Player, GameState tables)
- **Current:** In-memory Map
- **Conversion:** Store same data structure in Map
- **Future:** Can upgrade to Vercel KV/Supabase without changing logic

### C. Bot Turn Execution
- **Original:** Backend executes full bot turn, returns action array
- **Current:** Simplified bot turn, one action per API call
- **Fix:** Port full bot turn execution to backend, return complete action array

### D. Ape In! Card Handling
- **Original:** Ape In! card stays visible until next card drawn
- **Current:** May clear immediately
- **Fix:** Ensure Ape In! card persists visually until next draw

---

## 21. Testing Strategy

### Phase-by-Phase Testing:
1. **After Backend Logic Port:**
   - Test weighted card drawing (verify Oracle=13, Historacle=21)
   - Test dice profiles
   - Test bot AI logic in isolation

2. **After API Routes Update:**
   - Test game creation for each mode
   - Test draw/roll/stack/forfeit endpoints
   - Verify response formats match original

3. **After Frontend Update:**
   - Test full game flow for each mode
   - Verify bot turn replay animations
   - Verify all animations and timing

4. **Final Integration Test:**
   - Play full game for each mode
   - Verify win/loss conditions
   - Verify all game mechanics work

---

## 22. Rollback Plan

If migration fails:
- Current implementation is in git history
- `ape-in-source/` folder remains as reference
- Can revert to current implementation if needed

---

## 23. Success Metrics

### Migration Successful When:
1. ✅ All 5 game modes launch and play correctly
2. ✅ Card values correct (Oracle=13, Historacle=21)
3. ✅ Weighted card drawing works (no consecutive Ape In!)
4. ✅ Bot turn replay animations work with correct timing
5. ✅ All animations/styling match original exactly
6. ✅ Game mechanics identical to original
7. ✅ No functionality lost
8. ✅ Build succeeds
9. ✅ No console errors in browser
10. ✅ Game is playable end-to-end for all modes

---

## 24. Next Steps

1. ✅ **Review this plan with user** ← YOU ARE HERE
2. ⏳ Get user confirmation to proceed
3. ⏳ Execute migration phases sequentially:
   - Phase 1: Port backend game logic (cards, dice, game service)
   - Phase 2: Update API routes
   - Phase 3: Replace frontend components
   - Phase 4: Testing & fixes
4. ⏳ Verify complete functionality matches original
5. ⏳ Delete `ape-in-source/` folder after successful migration

---

## 25. Questions for User Before Proceeding

1. **Card Values Confirmation:**
   - Confirm Oracle = 13 and Historacle = 21 is correct?
   - Current implementation uses 1-3 and 1-5 - this is a breaking change

2. **Bot Config Target Scores:**
   - Original uses `target_scores` array in bot config
   - Need to verify if this exists in current botConfig.ts

3. **Database Migration:**
   - Use in-memory store for now (as planned)?
   - Or implement Vercel KV/Supabase immediately?

4. **Styling:**
   - Preserve exact original styling/animations?
   - Any specific styling requirements?

---

**Status:** Plan complete and ready for review  
**Awaiting:** User confirmation and answers to questions above before proceeding

**Plan Document:** `/docs/APE_IN_ORIGINAL_MIGRATION_PLAN.md`

