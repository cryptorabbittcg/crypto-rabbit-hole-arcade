# Ape In Build Fixes - Implementation Prompt

## Overview
This document provides a comprehensive prompt for fixing issues in the Ape In game build related to:
1. Game mode pricing and free play system
2. Points rewards per game mode
3. Profile synchronization (PFP, name, wallet) from Arcade Hub
4. Leaderboard organization

---

## 1. Game Mode Pricing & Free Play System

### Current Issue
- Pricing is inconsistent across modes
- No clear free play system

### Required Implementation

**Game Modes:**
- **Sandy (Tutorial)**: Always free, no points, no leaderboard
- **Aida (Medium)**: 5 free plays per day, then 0.1 APE per play
- **Lana (Hard)**: 5 free plays per day, then 0.1 APE per play
- **En-J1n (Expert)**: 5 free plays per day, then 0.1 APE per play
- **Nifty (Medium-Hard)**: 5 free plays per day, then 0.1 APE per play

### Implementation Steps

1. **Create a daily free play tracking system:**
   ```typescript
   // Track free plays per mode per day
   interface DailyFreePlays {
     date: string // YYYY-MM-DD
     mode: string // "aida" | "lana" | "en-j1n" | "nifty"
     playsUsed: number
   }
   
   // Store in localStorage with wallet address as key
   const FREE_PLAYS_KEY = `ape_in_free_plays_${walletAddress}`
   
   function getDailyFreePlays(walletAddress: string): DailyFreePlays[] {
     const stored = localStorage.getItem(FREE_PLAYS_KEY)
     if (!stored) return []
     
     const data = JSON.parse(stored)
     const today = new Date().toISOString().split('T')[0]
     
     // Filter out old entries (older than today)
     return data.filter((entry: DailyFreePlays) => entry.date === today)
   }
   
   function canPlayFree(mode: string, walletAddress: string): boolean {
     if (mode.toLowerCase() === "sandy") return true // Always free
     
     const freePlays = getDailyFreePlays(walletAddress)
     const modePlays = freePlays.find(p => p.mode === mode.toLowerCase())
     
     return (modePlays?.playsUsed || 0) < 5
   }
   
   function useFreePlay(mode: string, walletAddress: string): void {
     if (mode.toLowerCase() === "sandy") return // No tracking needed
     
     const freePlays = getDailyFreePlays(walletAddress)
     const today = new Date().toISOString().split('T')[0]
     const modePlays = freePlays.find(p => p.mode === mode.toLowerCase() && p.date === today)
     
     if (modePlays) {
       modePlays.playsUsed++
     } else {
       freePlays.push({ date: today, mode: mode.toLowerCase(), playsUsed: 1 })
     }
     
     localStorage.setItem(FREE_PLAYS_KEY, JSON.stringify(freePlays))
   }
   ```

2. **Update game mode selection logic:**
   ```typescript
   async function startGame(mode: string) {
     const walletAddress = getWalletAddress() // Get from arcade session
     
     // Sandy is always free
     if (mode.toLowerCase() === "sandy") {
       startGameplay(mode)
       return
     }
     
     // Check if free play available
     if (canPlayFree(mode, walletAddress)) {
       useFreePlay(mode, walletAddress)
       startGameplay(mode)
       return
     }
     
     // Check APE balance and charge 0.1 APE
     const apeBalance = await getApeBalance(walletAddress)
     if (apeBalance < 0.1) {
       showError("Insufficient APE balance. Need 0.1 APE to play.")
       return
     }
     
     // Charge 0.1 APE
     const success = await chargeApe(walletAddress, 0.1)
     if (success) {
       startGameplay(mode)
     } else {
       showError("Failed to charge APE. Please try again.")
     }
   }
   ```

3. **Display free plays remaining:**
   ```typescript
   function getFreePlaysRemaining(mode: string, walletAddress: string): number {
     if (mode.toLowerCase() === "sandy") return Infinity // Always free
     
     const freePlays = getDailyFreePlays(walletAddress)
     const modePlays = freePlays.find(p => p.mode === mode.toLowerCase())
     const used = modePlays?.playsUsed || 0
     
     return Math.max(0, 5 - used)
   }
   
   // In UI component:
   const freePlaysRemaining = getFreePlaysRemaining(selectedMode, walletAddress)
   {freePlaysRemaining > 0 ? (
     <span className="text-green-400">Free plays remaining: {freePlaysRemaining}/5</span>
   ) : (
     <span className="text-yellow-400">Cost: 0.1 APE</span>
   )}
   ```

---

## 2. Points Rewards Per Game Mode

### Recommended Points System

| Mode | Difficulty | Base Points | Max Points | Notes |
|------|-----------|-------------|------------|-------|
| Sandy | Tutorial | 0 | 0 | No points, tutorial only |
| Aida | Medium | 500 | 2000 | Time-based decay, error penalties |
| Lana | Hard | 1000 | 3000 | Time-based decay, error penalties |
| En-J1n | Expert | 2000 | 5000 | Time-based decay, error penalties |
| Nifty | Medium-Hard | 750 | 2500 | Time-based decay, error penalties |

### Implementation

```typescript
interface PointsCalculation {
  basePoints: number
  timePenalty: number // Points lost per second
  errorPenalty: number // Points lost per error
  minPoints: number // Minimum points guaranteed
}

const MODE_POINTS_CONFIG: Record<string, PointsCalculation> = {
  sandy: { basePoints: 0, timePenalty: 0, errorPenalty: 0, minPoints: 0 },
  aida: { basePoints: 500, timePenalty: 2, errorPenalty: 50, minPoints: 100 },
  lana: { basePoints: 1000, timePenalty: 3, errorPenalty: 75, minPoints: 200 },
  "en-j1n": { basePoints: 2000, timePenalty: 4, errorPenalty: 100, minPoints: 400 },
  nifty: { basePoints: 750, timePenalty: 2.5, errorPenalty: 60, minPoints: 150 },
}

function calculatePoints(
  mode: string,
  timeSeconds: number,
  errors: number,
  completed: boolean
): number {
  const config = MODE_POINTS_CONFIG[mode.toLowerCase()]
  if (!config || !completed) return 0
  
  const timePenalty = timeSeconds * config.timePenalty
  const errorPenalty = errors * config.errorPenalty
  const rawPoints = config.basePoints - timePenalty - errorPenalty
  
  return Math.max(config.minPoints, Math.round(rawPoints))
}

// On game completion:
const pointsEarned = calculatePoints(gameMode, timeSeconds, errors, isWin)
if (pointsEarned > 0) {
  // Send points to arcade hub
  sendPointsToArcade(pointsEarned, gameMode, finalScore)
}
```

---

## 3. Profile Synchronization (PFP, Name, Wallet)

### Current Issue
- PFP image is glitching
- Profile dropdown allows editing name/PFP in Ape In
- Should sync from Arcade Hub instead

### Required Implementation

1. **Remove profile editing UI from Ape In:**
   - Remove any dropdown menus that allow editing name/PFP
   - Remove any file upload components for PFP
   - Remove any username input fields

2. **Read profile from Arcade session:**
   ```typescript
   // The arcade session already contains:
   // - username
   // - address
   // - (PFP will be in session.avatar if added to session)
   
   interface ArcadeSession {
     sessionId: string
     userId: string
     username: string
     address: string | null
     thirdwebClientId: string
     tickets: number
     points: number
     timestamp: number
     avatar?: string // Add this if not already present
   }
   
   function getProfileFromSession(): {
     username: string
     address: string | null
     avatar: string | null
   } {
     const session = getArcadeSession() // Your existing function
     if (!session) {
       return {
         username: "Guest",
         address: null,
         avatar: null
       }
     }
     
     return {
       username: session.username || "Guest",
       address: session.address,
       avatar: session.avatar || null // If avatar is added to session
     }
   }
   ```

3. **Fix PFP display:**
   ```typescript
   // Use the avatar from session, with fallback
   function PlayerAvatar() {
     const { username, address, avatar } = getProfileFromSession()
     
     return (
       <img
         src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${address || username}`}
         alt={username}
         onError={(e) => {
           // Fallback to default avatar on error
           e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${address || username}`
         }}
         className="w-10 h-10 rounded-full"
       />
     )
   }
   ```

4. **Update Arcade Hub to include avatar in session:**
   ```typescript
   // In arcade hub (components/game-modal.tsx or components/providers.tsx)
   // When creating session, include avatar:
   session = createGameSession({
     userId: profile.username || address || "guest",
     username: profile.username || "Guest",
     address: address || null,
     tickets: tickets || 0,
     points: points || 0,
     avatar: profile.avatar || null // Add this
   })
   ```

---

## 4. Points Transfer to Arcade Hub

### Implementation

```typescript
// When game ends and points are calculated:
function sendPointsToArcade(
  pointsEarned: number,
  gameMode: string,
  score: number,
  timeSeconds: number,
  errors: number
): void {
  // Only send if points > 0 and not Sandy mode
  if (pointsEarned <= 0 || gameMode.toLowerCase() === "sandy") {
    return
  }
  
  // Send via postMessage to parent window
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: "APE_IN_GAME_END",
      points: pointsEarned,
      pointsEarned: pointsEarned, // Duplicate for compatibility
      gameMode: gameMode,
      mode: gameMode, // Duplicate for compatibility
      score: score,
      timeSeconds: timeSeconds,
      errors: errors,
      timestamp: Date.now()
    }, "*") // Parent will validate origin
    
    console.log("📤 Sent points to arcade hub:", pointsEarned)
  } else {
    console.warn("⚠️ Not in iframe, cannot send points to arcade hub")
  }
}

// Call this after game completion:
if (isWin && pointsEarned > 0) {
  sendPointsToArcade(pointsEarned, gameMode, finalScore, timeSeconds, errors)
}
```

---

## 5. Leaderboard Organization

### Current Issue
- All leaderboards are mixed together
- Need separate leaderboards for different game types

### Required Implementation

**Leaderboard Categories:**
1. **Overall** - Total points across all games
2. **Cryptoku** - Cryptoku-specific leaderboard
3. **Ape In** - Ape In single-player leaderboard
4. **Ape In PvP** - Ape In player vs player leaderboard
5. **Ape In Multiplayer** - Ape In multiplayer mode leaderboard

### Implementation in Arcade Hub

The arcade hub will handle this by:
- Storing game sessions with `game_type` and `game_mode`
- Querying leaderboards filtered by game type
- Displaying tabs/columns for each category

**Ape In should:**
- Store game results with proper `game_type: "ape_in"`
- Store `game_mode` as: "sandy" | "aida" | "lana" | "en-j1n" | "nifty"
- Store `game_subtype` as: "single_player" | "pvp" | "multiplayer"
- Send this data when submitting game results

```typescript
// When submitting game result:
interface GameResult {
  gameType: "ape_in"
  gameMode: "sandy" | "aida" | "lana" | "en-j1n" | "nifty"
  gameSubtype: "single_player" | "pvp" | "multiplayer"
  score: number
  points: number
  timeSeconds: number
  errors: number
  result: "win" | "loss" | "draw"
}

// Send to arcade hub API or via postMessage
```

---

## Summary Checklist for Ape In Build

- [ ] Implement daily free play tracking (5 per mode per day)
- [ ] Update game mode pricing logic (free → 0.1 APE after 5 plays)
- [ ] Sandy mode always free, no points, no leaderboard
- [ ] Implement points calculation per mode (see table above)
- [ ] Remove profile editing UI (name/PFP editing)
- [ ] Read profile from Arcade session (username, address, avatar)
- [ ] Fix PFP display with proper error handling
- [ ] Send points to arcade hub via postMessage on game end
- [ ] Include game mode and subtype in game result data
- [ ] Only send points for non-Sandy modes
- [ ] Reset free plays counter at midnight (local time)

---

## Testing Checklist

1. **Free Play System:**
   - [ ] Sandy mode is always free
   - [ ] Other modes show 5 free plays on first day
   - [ ] Free plays decrement correctly
   - [ ] After 5 free plays, shows 0.1 APE cost
   - [ ] Free plays reset at midnight
   - [ ] APE is charged correctly after free plays exhausted

2. **Points System:**
   - [ ] Sandy mode awards 0 points
   - [ ] Other modes award points based on performance
   - [ ] Points are sent to arcade hub correctly
   - [ ] Points calculation matches the formula

3. **Profile Sync:**
   - [ ] Username displays from arcade session
   - [ ] Wallet address displays from arcade session
   - [ ] PFP displays from arcade session (if available)
   - [ ] No profile editing UI is visible
   - [ ] PFP doesn't glitch or break

4. **Leaderboard:**
   - [ ] Game results include correct game_type
   - [ ] Game results include correct game_mode
   - [ ] Game results include correct game_subtype
   - [ ] Sandy mode results are not logged to leaderboard

---

## Notes

- The arcade hub will handle receiving points via postMessage (already implemented)
- The arcade hub will organize leaderboards into columns/tabs
- Ape In should focus on game logic and sending data correctly
- Profile data should be read-only in Ape In (synced from arcade hub)

