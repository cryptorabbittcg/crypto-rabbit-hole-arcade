# Ape In Migration Plan - Complete Functionality Preservation

## Overview
This plan ensures we migrate Ape In **with 100% functionality** preserved, learning from the Cryptoku migration issues.

## Prerequisites

### Option 1: Direct Git Clone (Recommended)
If you have access to the Ape In repo:

```bash
# In a temporary directory
cd /tmp
git clone <ape-in-repo-url>
cd ape-in-game
# Note: We'll copy files, not merge repos
```

### Option 2: Copy from Existing Build
If you have the built/deployed version, we'll extract from the source files.

### Option 3: Manual Copy-Paste
If you have the files locally, we'll guide you through structured copying.

## Step-by-Step Migration Process

### Phase 1: Discovery & Inventory

**First, let's identify everything that needs to be migrated:**

#### 1.1 Core Game Files
- [ ] Main game component (`ApeInGame.tsx` or similar)
- [ ] Game logic files (game engine, state management)
- [ ] All 5 game modes:
  - [ ] Sandy (tutorial)
  - [ ] Mode 2
  - [ ] Mode 3
  - [ ] Mode 4
  - [ ] Mode 5
- [ ] Mode switching/routing logic
- [ ] Game state management (Zustand/Redux/Context)

#### 1.2 Points & Scoring System
- [ ] Points calculation logic
- [ ] Score tracking
- [ ] Points API integration
- [ ] Leaderboard integration
- [ ] Achievement system (if any)

#### 1.3 UI Components
- [ ] Splash screen component
- [ ] Game UI overlays
- [ ] Mode selection screen
- [ ] Game over/victory screens
- [ ] Loading screens
- [ ] HUD (score, timer, lives, etc.)

#### 1.4 Assets
- [ ] Images (backgrounds, sprites, UI elements)
- [ ] Audio files (if any)
- [ ] Fonts (if custom)
- [ ] Icons

#### 1.5 Utilities & Helpers
- [ ] Game utilities
- [ ] Constants/config
- [ ] Type definitions
- [ ] Helper functions

#### 1.6 API/Backend Integration
- [ ] API routes (if any)
- [ ] Supabase integration
- [ ] WebSocket connections (for PvP/multiplayer)
- [ ] Thirdweb wallet integration

#### 1.7 State & Session Management
- [ ] Arcade session integration
- [ ] User profile integration
- [ ] Game session persistence

---

## Phase 2: Structured Migration

### Step 1: Create Directory Structure

```bash
cd /home/apedev/crypto-rabbit-hole-arcade
mkdir -p features/games/ape-in/{components,modes,utils,assets,hooks,types}
mkdir -p features/games/ape-in/components/{ui,game-over,splash}
mkdir -p features/games/ape-in/modes/{sandy,mode2,mode3,mode4,mode5}
mkdir -p features/games/ape-in/assets/{images,audio,fonts}
mkdir -p app/api/ape-in  # If there are API routes
```

**Directory structure:**
```
features/games/ape-in/
├── components/
│   ├── ui/              # UI components (buttons, overlays, etc.)
│   ├── splash/          # Splash screens
│   ├── game-over/       # Victory/defeat screens
│   └── ApeInGame.tsx    # Main game component (like CryptokuGame.tsx)
├── modes/
│   ├── sandy/           # Sandy tutorial mode
│   ├── mode2/           # Mode 2
│   ├── mode3/           # Mode 3
│   ├── mode4/           # Mode 4
│   └── mode5/           # Mode 5
├── utils/
│   ├── gameLogic.ts     # Core game logic
│   ├── scoring.ts       # Points/scoring calculations
│   └── constants.ts     # Game constants
├── hooks/
│   ├── useApeInGame.ts  # Main game hook
│   └── useGameSession.ts
├── types/
│   └── index.ts         # TypeScript definitions
├── assets/
│   ├── images/          # All images
│   ├── audio/           # Audio files
│   └── fonts/           # Custom fonts
└── index.ts             # Public exports
```

---

### Step 2: Migrate Core Game Logic (Preserve Everything)

#### 2.1 Copy Game Component Structure

**Target file:** `features/games/ape-in/components/ApeInGame.tsx`

**Key requirements (from Cryptoku pattern):**
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

**Preserve all existing functionality:**
- [ ] All game modes work
- [ ] Mode switching preserved
- [ ] Game state management intact
- [ ] All event handlers preserved
- [ ] All callbacks working

#### 2.2 Points System Migration

**Create:** `features/games/ape-in/utils/scoring.ts`

**Ensure we preserve:**
- [ ] Point calculation formulas (per mode)
- [ ] Multiplier logic
- [ ] Bonus calculations
- [ ] Penalty calculations
- [ ] Score formatting

**Integration with arcade hub:**
```typescript
// In ApeInGame.tsx
const handleGameEnd = (result: GameResult) => {
  // Calculate points (preserve existing logic)
  const pointsEarned = calculatePoints(result.mode, result.score, result.metadata)
  
  // Call parent callback (arcade hub will handle adding points)
  onGameEnd?.({
    score: result.score,
    mode: result.mode,
    metadata: result.metadata,
    points: pointsEarned,
  })
}
```

#### 2.3 Mode System Migration

**For each mode, preserve:**
- [ ] Mode-specific game logic
- [ ] Mode-specific UI
- [ ] Mode-specific scoring
- [ ] Mode-specific rules

**Structure:**
```
modes/sandy/
  ├── SandyGame.tsx
  ├── sandyLogic.ts
  └── sandyConfig.ts

modes/mode2/
  ├── Mode2Game.tsx
  ├── mode2Logic.ts
  └── mode2Config.ts
```

---

### Step 3: Migrate Assets

#### 3.1 Images

**Copy all images to:** `features/games/ape-in/assets/images/`

**Organize by type:**
- `assets/images/backgrounds/`
- `assets/images/sprites/`
- `assets/images/ui/`
- `assets/images/modes/` (mode-specific images)

**Update imports:**
```typescript
// OLD (in Ape In repo)
import background from '/src/assets/bg.png'

// NEW (in arcade hub)
import background from '@/features/games/ape-in/assets/images/backgrounds/bg.png'
```

**Use Next.js Image component:**
```typescript
import Image from 'next/image'

<Image
  src="/features/games/ape-in/assets/images/bg.png"
  alt="Background"
  width={1920}
  height={1080}
  priority // For above-fold images
/>
```

#### 3.2 Audio Files

If audio exists, copy to `assets/audio/` and update paths.

#### 3.3 Fonts

If custom fonts, add to `public/fonts/` or use Next.js font optimization.

---

### Step 4: Migrate UI Components

#### 4.1 Splash Screen

**Create:** `features/games/ape-in/components/splash/ApeInSplash.tsx`

**Preserve:**
- [ ] All animations
- [ ] All transitions
- [ ] Mode selection UI
- [ ] All styling

#### 4.2 Game Over Screens

**Create:** `features/games/ape-in/components/game-over/GameOverScreen.tsx`

**Preserve:**
- [ ] Victory animations
- [ ] Score display
- [ ] Points earned display
- [ ] Retry/Next buttons
- [ ] Share functionality (if any)

#### 4.3 In-Game UI

**Preserve all HUD elements:**
- [ ] Score display
- [ ] Timer
- [ ] Lives/Health
- [ ] Power-ups (if any)
- [ ] Pause menu
- [ ] Settings menu

---

### Step 5: Integrate with Arcade Hub

#### 5.1 Update GameModal

**File:** `components/game-modal.tsx`

**Add Ape In support:**
```typescript
import { ApeInGame } from "@/features/games/ape-in/components/ApeInGame"

export function GameModal({ isOpen, onClose, gameUrl, gameTitle }: GameModalProps) {
  const isApeIn = gameTitle === "Ape In!"
  const isCryptoku = gameTitle === "Cryptoku!"
  
  return (
    <div>
      {isCryptoku ? (
        <CryptokuGame ... />
      ) : isApeIn ? (
        <ApeInGame
          playerAddress={address}
          profileUsername={profile.username}
          profileAvatarUrl={profile.avatar}
          onGameEnd={(result) => {
            // Add points to arcade hub
            if (result.points && result.points > 0) {
              addPoints(result.points)
            }
          }}
        />
      ) : (
        <iframe ... />
      )}
    </div>
  )
}
```

#### 5.2 Remove Iframe Code

Once Ape In is working directly, remove the iframe handling for it.

#### 5.3 Session Integration

**Use React Context instead of postMessage:**
```typescript
// In ApeInGame.tsx
import { useArcade } from "@/components/providers"

export function ApeInGame({ onGameStart, onGameEnd }: ApeInGameProps) {
  const { address, profile, points, tickets } = useArcade()
  
  // No postMessage needed - direct access!
  // All session data is available via context
}
```

---

### Step 6: Dependencies & Configuration

#### 6.1 Check Dependencies

**Compare package.json dependencies:**

From Ape In repo, check:
- [ ] Game-specific dependencies
- [ ] Animation libraries
- [ ] State management (Zustand/Redux)
- [ ] Any special packages

**Add to arcade hub's package.json if missing:**
```bash
npm install <missing-packages>
```

#### 6.2 Environment Variables

**Check for Ape In specific env vars:**
- [ ] API keys
- [ ] Thirdweb config
- [ ] Supabase config (may share with hub)
- [ ] Feature flags

**Add to `.env.local`:**
```bash
# Ape In specific (if any)
NEXT_PUBLIC_APE_IN_FEATURE_FLAG=true
```

#### 6.3 TypeScript Configuration

**Ensure types are preserved:**
- [ ] All interfaces/types exported
- [ ] Type definitions in `types/index.ts`
- [ ] No `any` types introduced

---

## Phase 3: Verification & Testing

### Testing Checklist

#### Functionality Tests
- [ ] All 5 modes launch correctly
- [ ] Sandy tutorial works without session
- [ ] Mode switching works
- [ ] Points calculation is correct for each mode
- [ ] Score tracking works
- [ ] Game over screens display correctly
- [ ] Splash screen animations work
- [ ] All UI interactions work
- [ ] Pause/resume works (if applicable)

#### Integration Tests
- [ ] Points sync to arcade hub
- [ ] Player address is passed correctly
- [ ] Profile data (username, avatar) displays
- [ ] Game end callback triggers correctly
- [ ] Session data is accessible

#### Performance Tests
- [ ] Game loads within 2-3 seconds
- [ ] Mode switching is smooth
- [ ] No memory leaks
- [ ] Images load efficiently
- [ ] Code splitting works (check network tab)

#### Visual Tests
- [ ] All images display correctly
- [ ] Animations work
- [ ] Responsive design works
- [ ] No layout shifts
- [ ] Styling is preserved

---

## Phase 4: Cleanup & Optimization

### 4.1 Code Cleanup
- [ ] Remove unused imports
- [ ] Remove console.logs (keep errors)
- [ ] Remove commented code
- [ ] Fix TypeScript errors
- [ ] Fix ESLint warnings

### 4.2 Optimization
- [ ] Implement lazy loading for modes
- [ ] Optimize images (WebP format)
- [ ] Code splitting per mode
- [ ] Memoize expensive calculations
- [ ] Remove duplicate code

### 4.3 Documentation
- [ ] Add JSDoc comments to main functions
- [ ] Document mode system
- [ ] Document points calculation
- [ ] Update README

---

## Detailed Migration Script

### Step-by-Step Commands

```bash
# 1. Create structure
cd /home/apedev/crypto-rabbit-hole-arcade
mkdir -p features/games/ape-in/{components/{ui,splash,game-over},modes/{sandy,mode2,mode3,mode4,mode5},utils,hooks,types,assets/{images/{backgrounds,sprites,ui,modes},audio,fonts}}

# 2. Copy source files (adjust paths based on your Ape In repo location)
# Option A: If you have the repo cloned
cp -r /path/to/ape-in-game/src/* features/games/ape-in/

# Option B: If copying manually, use the structure guide above

# 3. Move assets to Next.js public or keep in features (your choice)
# Images can go to: public/games/ape-in/images/
# Or keep in: features/games/ape-in/assets/images/

# 4. Install any missing dependencies
npm install

# 5. Fix import paths
# Use find/replace to update all imports from old paths to new paths
```

---

## Common Pitfalls to Avoid (Learn from Cryptoku)

### ❌ What Went Wrong with Cryptoku
1. **Lost game state management** - Make sure state logic is preserved
2. **Lost scoring calculations** - Preserve all point formulas
3. **Broken callbacks** - Ensure onGameEnd/onGameStart work
4. **Missing assets** - Copy ALL images
5. **Wrong import paths** - Update all imports
6. **Missing dependencies** - Check all npm packages

### ✅ What to Do Differently
1. **Create full inventory first** - List every file before copying
2. **Test each component individually** - Don't wait until end
3. **Preserve exact game logic** - Don't refactor during migration
4. **Keep original structure** - Match the source as closely as possible
5. **Test incrementally** - Test after each major component migrated

---

## Quick Start Checklist

- [ ] **Step 1:** Inventory all files in Ape In repo
- [ ] **Step 2:** Create directory structure in arcade hub
- [ ] **Step 3:** Copy core game files (main component)
- [ ] **Step 4:** Copy all 5 mode implementations
- [ ] **Step 5:** Copy points/scoring system
- [ ] **Step 6:** Copy all UI components
- [ ] **Step 7:** Copy all assets (images, audio, etc.)
- [ ] **Step 8:** Copy utilities and helpers
- [ ] **Step 9:** Update all import paths
- [ ] **Step 10:** Update GameModal to use component instead of iframe
- [ ] **Step 11:** Test Sandy mode first (simplest)
- [ ] **Step 12:** Test each mode individually
- [ ] **Step 13:** Test points integration
- [ ] **Step 14:** Test session integration
- [ ] **Step 15:** Fix any issues found
- [ ] **Step 16:** Optimize and clean up

---

## Next Steps - Choose Your Path

### Option A: I Can Guide You Through Manual Migration
I'll help you copy files step-by-step, and we'll test after each step.

### Option B: You Provide File Structure
Share the Ape In repo structure, and I'll create the exact mapping.

### Option C: Copy-Paste with Verification
You copy files, I'll verify structure and fix imports.

**Which approach do you prefer?** Or do you have the Ape In repo URL I can analyze?

