# Ape In Game - Complete Analysis & Migration Plan

## Executive Summary

**Status:** Ready for migration. Full source tree copied to `features/games/ape-in/`.

**Recommendation:** Migrate to Next.js component (like Cryptoku), integrate backend API into arcade hub, remove external dependencies.

**Backend Decision:** **Migrate backend API to Next.js routes** - Remove Render dependency, use arcade hub's existing infrastructure.

---

## 📊 Current Structure Analysis

### Frontend Structure (React + Vite)
```
features/games/ape-in/frontend/src/
├── App.tsx                    # Main app with React Router
├── main.tsx                   # Entry point (Vite)
├── pages/
│   ├── HomePage.tsx          # Mode selection
│   ├── GamePage.tsx          # Game rendering
│   └── LeaderboardPage.tsx   # Leaderboard
├── components/
│   ├── GameBoard.tsx         # Core game logic component ⭐
│   ├── Card.tsx              # Card component
│   ├── Dice.tsx              # Dice component
│   ├── WelcomeSplash.tsx     # Splash screen
│   └── ... (UI components)
├── store/
│   └── gameStore.ts          # Zustand state management
├── services/
│   ├── api.ts                # External API calls (Render backend)
│   ├── pointsService.ts      # Points calculation
│   ├── paymentService.ts     # APE payment validation
│   ├── websocket.ts          # WebSocket for PvP/multiplayer
│   └── ... (other services)
├── lib/
│   ├── thirdweb.ts           # Thirdweb client
│   ├── arcade-session.ts     # postMessage session (to remove)
│   └── identity-bridge.ts    # postMessage identity (to remove)
├── providers/
│   └── IdentityProvider.tsx  # postMessage identity provider (to replace)
├── hooks/
│   ├── useIdentity.ts        # Identity hook
│   └── useApeCoinBalance.ts  # Balance hook
├── config/
│   ├── gameModes.ts          # Mode configuration (5 modes + PvP/multiplayer)
│   └── botConfig.ts          # Bot difficulty configs
└── types/
    └── game.ts               # TypeScript definitions
```

### Backend Structure (Python FastAPI)
```
features/games/ape-in/backend/
├── app/
│   ├── main.py               # FastAPI app
│   ├── api/
│   │   ├── game.py           # Game creation, card/dice actions
│   │   ├── leaderboard.py    # Leaderboard endpoints
│   │   └── rewards.py        # Rewards endpoints
│   ├── services/
│   │   ├── game_service.py   # Game logic
│   │   └── ... (other services)
│   ├── models/               # SQLAlchemy models
│   ├── database/             # Database setup
│   └── websockets/           # WebSocket handlers
└── ape_in_game.db            # SQLite database
```

**Current Deployment:**
- Frontend: Vercel (ape-in-game.vercel.app)
- Backend: Render (ape-in-game-backend.onrender.com) ⚠️ **To be migrated**

---

## 🔍 Key Findings

### 1. **Game Modes** (All Present)
- ✅ Sandy (tutorial) - Unranked, free
- ✅ Aida - Ranked bot
- ✅ Lana - Ranked bot
- ✅ En-J1n - Ranked bot
- ✅ Nifty - Ranked bot
- ✅ PvP - Player vs Player (WebSocket)
- ✅ Multiplayer - 3-10 players (WebSocket)
- ✅ Tournament - Bracket competition (WebSocket)

### 2. **External Dependencies** (To Remove/Migrate)
- ❌ **Render backend** (`ape-in-game-backend.onrender.com`) - Migrate to Next.js API routes
- ❌ **postMessage** - Replace with React Context (arcade hub already has this)
- ❌ **React Router** - Remove (game will be component, not SPA)
- ❌ **Vite build** - Use Next.js build system

### 3. **Core Game Logic** (Preserve Everything)
- ✅ **GameBoard.tsx** - Core game component (~1000+ lines)
- ✅ **Card system** - 41 card images, card logic
- ✅ **Dice system** - Dice rolling logic
- ✅ **Turn management** - Player vs bot turns
- ✅ **Score calculation** - Winning conditions
- ✅ **zkVerify integration** - Verification system

### 4. **Points System** (Integrate with Arcade Hub)
- ✅ Points calculation formulas per mode
- ✅ Bonus system (rounds remaining)
- ✅ Currently uses postMessage - Replace with arcade hub context
- ✅ Sandy = 0 points (correct)

### 5. **Assets** (All Present)
- ✅ Card images (41 .jpg files in `assets/cards/`)
- ✅ Background images
- ✅ UI elements
- ✅ Fonts

### 6. **State Management** (Preserve)
- ✅ Zustand store (`gameStore.ts`) - Works perfectly
- ✅ Game state management
- ✅ Score tracking
- ✅ Turn management

---

## 🎯 Migration Strategy

### Phase 1: Cleanup & Structure Reorganization

#### Step 1.1: Remove Unnecessary Files
**Files to Delete:**
- ❌ All `.md` files (1899 markdown files!) - Documentation not needed
- ❌ `node_modules/` directories
- ❌ `backend/` directory (Python FastAPI - we'll create Next.js routes)
- ❌ `frontend/dist/` build artifacts
- ❌ `frontend/.vite/` cache
- ❌ Config files (vite.config.ts, vercel.json from old repo)
- ❌ Setup scripts (.sh files, ecosystem.config.js)
- ❌ `discord-bot-backup/` directory
- ❌ Duplicate directories (`assets copy/`)

**Keep:**
- ✅ `frontend/src/` - All source code
- ✅ `assets/images/` - All images
- ✅ `assets/cards/` - Card images

#### Step 1.2: Reorganize to Match Cryptoku Pattern
```
features/games/ape-in/
├── components/
│   ├── ApeInGame.tsx         # Main game component (like CryptokuGame.tsx)
│   ├── GameBoard.tsx         # Core game logic (move from frontend/src)
│   ├── Card.tsx              # Card component
│   ├── Dice.tsx              # Dice component
│   ├── WelcomeSplash.tsx     # Splash screen
│   └── ... (other UI components)
├── utils/
│   ├── scoring.ts            # Points calculation (move from services)
│   └── constants.ts          # Game constants
├── hooks/
│   ├── useApeInGame.ts       # Main game hook
│   └── useApeCoinBalance.ts  # Balance hook
├── types/
│   └── index.ts              # TypeScript definitions
├── assets/
│   └── images/
│       ├── cards/            # Card images
│       └── ... (other images)
└── index.ts                  # Public exports
```

---

### Phase 2: Convert to Next.js Component

#### Step 2.1: Create Main Component
**File:** `features/games/ape-in/components/ApeInGame.tsx`

**Pattern:** Follow `CryptokuGame.tsx` exactly

```typescript
export interface ApeInGameProps {
  playerAddress: string | null        // From arcade hub
  profileUsername?: string            // From arcade hub
  profileAvatarUrl?: string           // From arcade hub
  onGameStart?: () => void            // Callback when game starts
  onGameEnd?: (result: {              // Callback when game ends
    score: number
    mode: string
    metadata?: any
    points?: number                   // Points earned
  }) => void
}
```

**Key Changes:**
- Remove React Router (no routing - mode passed as prop)
- Remove IdentityProvider (use arcade hub context)
- Remove postMessage code (use React Context)
- Integrate with arcade hub providers

#### Step 2.2: Remove React Router Dependencies
- ❌ Remove `pages/HomePage.tsx` - Mode selection in arcade hub
- ❌ Remove `pages/GamePage.tsx` - Logic moves to main component
- ❌ Remove `pages/LeaderboardPage.tsx` - Use arcade hub leaderboard
- ❌ Remove `App.tsx` routing - Not needed as component

#### Step 2.3: Replace Identity Management
**Current:** postMessage + IdentityProvider
**New:** Arcade hub React Context

```typescript
// OLD (remove):
import { useIdentity } from '../hooks/useIdentity'
const identity = useIdentity()

// NEW (use arcade hub):
import { useArcade } from '@/components/providers'
const { address, profile } = useArcade()
```

---

### Phase 3: Migrate Backend API to Next.js Routes

#### Step 3.1: Convert Python FastAPI to Next.js API Routes

**Current Backend Endpoints:**
```
POST /api/game/create          # Create game
GET  /api/game/{game_id}       # Get game state
POST /api/game/{game_id}/draw  # Draw card
POST /api/game/{game_id}/roll  # Roll dice
POST /api/game/{game_id}/stack # Stack card
POST /api/game/{game_id}/end   # End game
GET  /api/leaderboard          # Get leaderboard
POST /api/rewards/claim        # Claim rewards
WebSocket /ws/game/{game_id}   # PvP/multiplayer
```

**New Next.js API Routes:**
```
app/api/ape-in/
├── game/
│   ├── create/route.ts        # Create game
│   ├── [gameId]/route.ts      # Get game state
│   ├── [gameId]/draw/route.ts # Draw card
│   ├── [gameId]/roll/route.ts # Roll dice
│   ├── [gameId]/stack/route.ts# Stack card
│   └── [gameId]/end/route.ts  # End game
├── leaderboard/route.ts       # Leaderboard
└── rewards/route.ts           # Rewards
```

**Database Decision:**
- **Option A:** Use SQLite (current) - Simple, but file-based (Vercel serverless issues)
- **Option B:** Use Supabase (arcade hub already uses) ✅ **RECOMMENDED**
- **Option C:** Use Vercel KV (like Cryptoku hints) - For simple state

**Recommendation:** Use **Supabase** - Arcade hub already has it, supports complex queries, works with serverless.

#### Step 3.2: Convert Python Game Logic to TypeScript

**Key Functions to Port:**
- Game creation logic
- Card deck management
- Dice rolling logic
- Turn management
- Score calculation
- Bot AI logic

**Preserve All Logic:**
- All game rules
- All bot behaviors
- All scoring formulas
- All card effects

---

### Phase 4: Integration with Arcade Hub

#### Step 4.1: Update GameModal
**File:** `components/game-modal.tsx`

**Add Ape In support:**
```typescript
import { ApeInGame } from "@/features/games/ape-in/components/ApeInGame"

const isApeIn = gameTitle === "Ape In!"

{isApeIn ? (
  <ApeInGame
    playerAddress={address}
    profileUsername={profile.username}
    profileAvatarUrl={profile.avatar}
    onGameStart={() => {
      console.log("🎮 Ape In game started")
    }}
    onGameEnd={(result) => {
      console.log("🎮 Ape In game ended:", result)
      // Add points to arcade hub
      if (result.points && result.points > 0) {
        addPoints(result.points)
      }
    }}
  />
) : isCryptoku ? (
  <CryptokuGame ... />
) : (
  <iframe ... />
)}
```

#### Step 4.2: Points Integration
**Remove postMessage, use callback:**
```typescript
// In ApeInGame component
const handleGameEnd = (gameResult: GameResult) => {
  const points = calculatePoints({
    gameMode: gameResult.mode,
    roundsRemaining: gameResult.roundsRemaining,
    maxRounds: gameResult.maxRounds,
    hasForfeited: gameResult.hasForfeited,
  })
  
  // Call parent callback (arcade hub will add points)
  onGameEnd?.({
    score: gameResult.score,
    mode: gameResult.mode,
    metadata: gameResult.metadata,
    points: points,
  })
}
```

#### Step 4.3: Leaderboard Integration
**Use arcade hub Supabase:**
- Remove separate leaderboard service
- Use `lib/supabase/services/leaderboard.service.ts`
- Add Ape In game type support

#### Step 4.4: Payment/Play Token System
**Integrate with arcade hub:**
- Use arcade hub's ticket/points system
- Remove separate payment service
- Use arcade hub context for balance checks

---

### Phase 5: Backend Migration Strategy

#### Option A: Full Migration to Next.js API Routes (Recommended) ✅

**Pros:**
- ✅ Single codebase
- ✅ Unified deployment
- ✅ Share Supabase connection
- ✅ No external dependencies
- ✅ Easier to maintain

**Cons:**
- ⚠️ Need to port Python logic to TypeScript
- ⚠️ WebSocket needs Next.js WebSocket support (or external)

**Implementation:**
1. Create Next.js API routes
2. Port Python game logic to TypeScript
3. Use Supabase for database (replace SQLite)
4. For WebSocket: Use external service (Vercel KV + polling) or upgrade to WebSocket-capable hosting

#### Option B: Keep Backend, Proxy Through Next.js ⚠️

**Pros:**
- ✅ No logic porting needed
- ✅ WebSocket works immediately

**Cons:**
- ❌ Still need Render
- ❌ Two deployments
- ❌ CORS complexity
- ❌ Not fully integrated

**Recommendation:** **Option A** - Full migration. We can handle WebSocket via polling or upgrade hosting.

#### WebSocket Strategy for PvP/Multiplayer

**Option 1: Server-Sent Events (SSE)**
- Next.js supports SSE
- Simpler than WebSocket
- Works with serverless

**Option 2: Polling**
- Use Next.js API routes
- Poll every 1-2 seconds
- Simpler, but less efficient

**Option 3: External WebSocket Service**
- Use Vercel KV + WebSocket service
- Or upgrade to WebSocket-capable hosting

**Option 4: Delay PvP/Multiplayer**
- Ship single-player modes first
- Add PvP/multiplayer later with proper WebSocket setup

**Recommendation:** Start with **polling** for MVP, upgrade to WebSocket later.

---

## 📋 Detailed Migration Plan

### Stage 1: Cleanup & Structure (Day 1)

**Tasks:**
1. ✅ Remove all .md files (1899 files!)
2. ✅ Remove node_modules directories
3. ✅ Remove backend/ directory (we'll create Next.js routes)
4. ✅ Remove build artifacts (dist/, .vite/)
5. ✅ Remove config files from old repo (vite.config.ts, vercel.json)
6. ✅ Reorganize structure to match Cryptoku pattern
7. ✅ Move source files to proper locations

**Result:**
- Clean structure matching Cryptoku
- Only essential source files remaining
- Ready for Next.js conversion

---

### Stage 2: Create Main Component (Day 1-2)

**Tasks:**
1. Create `ApeInGame.tsx` following Cryptoku pattern
2. Remove React Router dependencies
3. Remove postMessage/IdentityProvider code
4. Integrate with arcade hub context
5. Preserve all game logic from GameBoard.tsx
6. Test Sandy mode first (simplest)

**Key Changes:**
```typescript
// OLD:
import { useNavigate } from 'react-router-dom'
import { useParams } from 'react-router-dom'
const { mode } = useParams<{ mode: GameMode }>()

// NEW:
interface ApeInGameProps {
  mode?: GameMode  // Passed as prop, default to 'sandy'
}

// OLD:
import { useIdentity } from '../hooks/useIdentity'

// NEW:
import { useArcade } from '@/components/providers'
const { address, profile } = useArcade()
```

**Result:**
- Main component working
- Sandy mode launches without session
- Integrated with arcade hub context

---

### Stage 3: Migrate Backend API (Day 2-3)

**Tasks:**
1. Create Next.js API routes structure
2. Port game creation logic (Python → TypeScript)
3. Port card/dice logic
4. Port bot AI logic
5. Port leaderboard logic
6. Create Supabase schema for Ape In games
7. Migrate data (if needed) from SQLite to Supabase

**API Routes to Create:**
```
app/api/ape-in/
├── game/
│   ├── create/route.ts        # POST - Create game
│   ├── [gameId]/
│   │   ├── route.ts           # GET - Get game state
│   │   ├── draw/route.ts      # POST - Draw card
│   │   ├── roll/route.ts      # POST - Roll dice
│   │   ├── stack/route.ts     # POST - Stack card
│   │   ├── forfeit/route.ts   # POST - Forfeit game
│   │   └── end/route.ts       # POST - End game
├── leaderboard/
│   └── route.ts               # GET - Get leaderboard
└── rewards/
    └── route.ts               # POST - Claim rewards
```

**Database Schema (Supabase):**
```sql
-- Game sessions table (similar to game_sessions, add ape_in columns)
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS game_mode TEXT;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS rounds_played INTEGER;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS cards_drawn INTEGER;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS final_score INTEGER;

-- Game state table (for active games)
CREATE TABLE IF NOT EXISTS ape_in_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT UNIQUE NOT NULL,
  mode TEXT NOT NULL,
  player_address TEXT,
  player_name TEXT NOT NULL,
  game_state JSONB NOT NULL,  -- Full game state
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Card deck state (if needed)
CREATE TABLE IF NOT EXISTS ape_in_decks (
  game_id TEXT REFERENCES ape_in_games(game_id),
  deck_order INTEGER[] NOT NULL,
  current_index INTEGER DEFAULT 0
);
```

**Result:**
- All game operations work via Next.js API
- No external backend dependency
- Supabase integrated

---

### Stage 4: Update Services & Remove External Dependencies (Day 3)

**Tasks:**
1. Update `services/api.ts` to use Next.js routes (remove Render URL)
2. Remove postMessage from `services/pointsService.ts`
3. Remove `lib/arcade-session.ts` (postMessage - not needed)
4. Remove `lib/identity-bridge.ts` (postMessage - not needed)
5. Remove `providers/IdentityProvider.tsx` (use arcade hub context)
6. Update `lib/thirdweb.ts` to use arcade hub Thirdweb client
7. Update payment service to use arcade hub balance system

**Key Changes:**
```typescript
// OLD (services/api.ts):
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ape-in-game-backend.onrender.com'

// NEW:
const API_BASE_URL = '/api/ape-in'  // Relative URL, Next.js handles routing
```

```typescript
// OLD (services/pointsService.ts):
export function sendPointsToArcade(params) {
  window.parent.postMessage(...)  // Remove this
}

// NEW:
// Points are sent via onGameEnd callback - no postMessage needed
```

**Result:**
- No external API dependencies
- No postMessage code
- Fully integrated with arcade hub

---

### Stage 5: Assets & Images (Day 3-4)

**Tasks:**
1. Move images to Next.js public or keep in features
2. Update all image imports to use Next.js Image component
3. Optimize images (WebP format)
4. Test all images load correctly

**Image Path Updates:**
```typescript
// OLD:
import cardImage from '../assets/cards/card1.jpg'
<img src={cardImage} />

// NEW:
import Image from 'next/image'
<Image
  src="/features/games/ape-in/assets/images/cards/card1.jpg"
  alt="Card"
  width={200}
  height={300}
/>
```

**Result:**
- All images loading correctly
- Optimized for web
- Proper Next.js handling

---

### Stage 6: Testing & Integration (Day 4-5)

**Tasks:**
1. Test Sandy mode (tutorial) - must work without session
2. Test each ranked mode (aida, lana, enj1n, nifty)
3. Test points calculation and integration
4. Test leaderboard integration
5. Test game end callbacks
6. Test payment/play token system
7. Fix any issues found

**Test Checklist:**
- [ ] Sandy launches without session
- [ ] All 5 modes work
- [ ] Points calculated correctly
- [ ] Points sync to arcade hub
- [ ] Leaderboard works
- [ ] Game end callback triggers
- [ ] Images load
- [ ] Animations work
- [ ] No console errors

---

### Stage 7: Remove Old Code & Cleanup (Day 5)

**Tasks:**
1. Remove iframe code from GameModal (for Ape In)
2. Remove postMessage listeners
3. Remove unused imports
4. Fix TypeScript errors
5. Fix ESLint warnings
6. Update documentation

**Result:**
- Clean, integrated codebase
- No duplicate functionality
- Ready for production

---

## 🔧 Backend Migration: Detailed Strategy

### Current Python Backend Analysis

**Database:** SQLite (`ape_in_game.db`)
**Endpoints:**
- Game creation
- Game state management
- Card/dice operations
- Leaderboard
- Rewards

**Decision:** Migrate to Supabase + Next.js API Routes

### Migration Steps

#### Step 1: Create Supabase Schema
**File:** `scripts/05-ape-in-schema.sql`

```sql
-- Extend game_sessions for Ape In
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS game_mode TEXT;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS rounds_played INTEGER;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS final_score INTEGER;

-- Active game states
CREATE TABLE IF NOT EXISTS ape_in_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT UNIQUE NOT NULL,
  mode TEXT NOT NULL,
  player_address TEXT,
  player_name TEXT NOT NULL,
  game_state JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ape_in_games_game_id ON ape_in_games(game_id);
CREATE INDEX IF NOT EXISTS idx_ape_in_games_player ON ape_in_games(player_address);
```

#### Step 2: Port Game Logic to TypeScript

**Create:** `lib/ape-in/game-logic.ts`

Port all Python game logic:
- Card deck management
- Dice rolling
- Turn management
- Bot AI
- Score calculation

#### Step 3: Create API Routes

**Example:** `app/api/ape-in/game/create/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createApeInGame } from "@/lib/ape-in/game-logic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode, playerName, walletAddress, isDailyFree } = body

    // Create game using TypeScript logic
    const game = await createApeInGame({
      mode,
      playerName,
      walletAddress,
      isDailyFree,
    })

    // Store in Supabase
    const supabase = await createClient()
    const { error } = await supabase.from('ape_in_games').insert({
      game_id: game.gameId,
      mode: game.mode,
      player_address: walletAddress,
      player_name: playerName,
      game_state: game,
    })

    if (error) {
      console.error("Error storing game:", error)
      return NextResponse.json({ error: "Failed to create game" }, { status: 500 })
    }

    return NextResponse.json(game)
  } catch (error) {
    console.error("Error creating game:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

---

## 🎮 Game Logic Preservation

### Critical Logic to Preserve

1. **Card System:**
   - 41 card types
   - Card effects (Cipher, Oracle, Historacle, Bearish, Special)
   - Deck shuffling
   - Card drawing logic

2. **Dice System:**
   - Dice rolling
   - Success/failure logic
   - Turn score accumulation

3. **Bot AI:**
   - 5 bot difficulties (sandy, aida, lana, enj1n, nifty)
   - Decision-making logic
   - Risk assessment

4. **Scoring:**
   - Point calculations per mode
   - Bonus system (rounds remaining)
   - Forfeit handling (0 points)

5. **Game Flow:**
   - Turn management
   - Round tracking
   - Win conditions
   - Game end logic

**All logic must be preserved exactly as is!**

---

## 🔄 Render Backend Decision

### Question: Do we need to keep Render backend?

**Answer: NO - Migrate everything to Next.js**

**Reasons:**
1. ✅ **Simpler architecture** - Single codebase
2. ✅ **No external dependency** - Everything in one repo
3. ✅ **Easier maintenance** - One deployment
4. ✅ **Cost reduction** - No separate Render service
5. ✅ **Better integration** - Share Supabase, share context

**Exception: WebSocket for PvP/Multiplayer**
- **Short term:** Use polling (Next.js API routes)
- **Long term:** Add WebSocket support or use Vercel WebSocket (when available)

**Recommendation:** Migrate backend fully. Use polling for PvP initially, upgrade to WebSocket later if needed.

---

## 📦 Dependencies Analysis

### Dependencies to Add to Arcade Hub
```json
{
  "dependencies": {
    "zustand": "^5.0.2",        // State management (already may have)
    "framer-motion": "^11.15.0", // Animations
    "axios": "^1.7.9"            // API calls (or use fetch)
  }
}
```

### Dependencies to Remove
- React Router (not needed as component)
- Vite build tools (use Next.js)
- PostMessage utilities (use React Context)

---

## 🗂️ File Organization Plan

### Final Structure
```
features/games/ape-in/
├── components/
│   ├── ApeInGame.tsx           # Main component (like CryptokuGame.tsx)
│   ├── GameBoard.tsx           # Core game logic
│   ├── Card.tsx                # Card component
│   ├── Dice.tsx                # Dice component
│   ├── WelcomeSplash.tsx       # Splash screen
│   ├── BotIntro.tsx            # Bot introduction
│   └── ui/                     # UI components
│       ├── LeaderboardModal.tsx
│       └── StatsModal.tsx
├── utils/
│   ├── gameLogic.ts            # Ported from Python
│   ├── botAI.ts                # Bot decision logic
│   ├── scoring.ts              # Points calculation
│   └── constants.ts            # Game constants
├── hooks/
│   ├── useApeInGame.ts         # Main game hook
│   └── useApeCoinBalance.ts    # Balance hook (integrate with arcade hub)
├── types/
│   └── index.ts                # TypeScript definitions
├── assets/
│   └── images/
│       ├── cards/              # 41 card images
│       └── ...                 # Other images
└── index.ts                    # Public exports

app/api/ape-in/                 # Backend API routes
├── game/
│   ├── create/route.ts
│   └── [gameId]/
│       ├── route.ts
│       ├── draw/route.ts
│       ├── roll/route.ts
│       ├── stack/route.ts
│       └── end/route.ts
├── leaderboard/route.ts
└── rewards/route.ts

lib/ape-in/                     # Shared game logic
├── game-logic.ts               # Game creation & management
└── bot-ai.ts                   # Bot AI logic
```

---

## 🚀 Implementation Order

### Phase 1: Cleanup (Immediate)
1. Remove all .md files
2. Remove node_modules
3. Remove backend/ directory
4. Reorganize structure

### Phase 2: Main Component (High Priority)
1. Create ApeInGame.tsx
2. Remove React Router
3. Remove postMessage
4. Integrate with arcade hub
5. Test Sandy mode

### Phase 3: Backend Migration (High Priority)
1. Create Supabase schema
2. Create Next.js API routes
3. Port game logic to TypeScript
4. Test game creation

### Phase 4: Integration (Medium Priority)
1. Update GameModal
2. Integrate points system
3. Integrate leaderboard
4. Remove iframe code

### Phase 5: Testing & Polish (Medium Priority)
1. Test all modes
2. Fix issues
3. Optimize performance
4. Clean up code

---

## ⚠️ Risks & Mitigations

### Risk 1: Game Logic Porting Complexity
**Mitigation:** Port incrementally, test after each function

### Risk 2: WebSocket for PvP/Multiplayer
**Mitigation:** Use polling initially, upgrade later

### Risk 3: Database Migration
**Mitigation:** Create new Supabase schema, test thoroughly

### Risk 4: Breaking Game Logic
**Mitigation:** Preserve all Python logic exactly, test extensively

---

## ✅ Success Criteria

1. ✅ Sandy mode launches without session
2. ✅ All 5 modes work correctly
3. ✅ Points calculated correctly
4. ✅ Points sync to arcade hub
5. ✅ Leaderboard integrated
6. ✅ No external dependencies (no Render)
7. ✅ No postMessage code
8. ✅ All images load
9. ✅ Game playable from arcade hub
10. ✅ Can edit directly in arcade hub repo

---

## 📝 Next Steps

**Ready to proceed?** I'll start with:
1. **Cleanup** - Remove unnecessary files
2. **Structure** - Reorganize to match Cryptoku
3. **Main Component** - Create ApeInGame.tsx
4. **Backend Routes** - Create Next.js API routes
5. **Integration** - Connect with arcade hub

**Do you approve this plan?** Once confirmed, I'll execute systematically.

