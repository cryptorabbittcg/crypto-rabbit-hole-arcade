# Ape In Congruency Checklist

## Overview
This checklist ensures Ape In is fully aligned with the Arcade Hub's message structure, data format, and expected behavior.

---

## ✅ 1. ARCADE_IDENTITY Message Reception

### What Arcade Hub Sends
The arcade hub sends `ARCADE_IDENTITY` messages with this structure:
```typescript
{
  type: "ARCADE_IDENTITY",
  session: {
    sessionId: string,
    userId: string,
    username: string,
    address: string | null,
    thirdwebClientId: string,
    tickets: number,
    points: number,
    timestamp: number,
    avatar: string | null  // ⚠️ NEW: Avatar included in session
  },
  // Also sent as flattened properties for compatibility:
  sessionId: string,
  userId: string,
  username: string,
  address: string | null,
  thirdwebClientId: string,
  tickets: number,
  points: number,
  avatar: string | null  // ⚠️ NEW: Avatar included
}
```

### Ape In Should:
- [ ] Accept messages from parent origin: `https://arcade.thecryptorabbithole.io` (and localhost variants)
- [ ] NOT reject messages from own origin (this was the bug)
- [ ] Handle both nested `session` object AND flattened properties
- [ ] Extract and store: `username`, `address`, `avatar`, `thirdwebClientId`, `tickets`, `points`
- [ ] Use `avatar` field for PFP display (if provided)
- [ ] Use `username` as default display name (fallback to wallet address if not set)
- [ ] Use `thirdwebClientId` for Thirdweb wallet operations

### Origin Validation Fix
```typescript
// ❌ WRONG - Rejecting own origin
const allowedOrigins = ['https://ape-in-game.vercel.app', ...]

// ✅ CORRECT - Accept parent (arcade hub) origin
const allowedOrigins = [
  'https://arcade.thecryptorabbithole.io',  // Production arcade hub
  'http://localhost:3000',                   // Local arcade hub
  'http://localhost:5173',                   // Alternative local
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]

// Check if message is from parent (not self)
if (event.origin === window.location.origin) {
  // Ignore self-messages
  return
}

if (allowedOrigins.includes(event.origin)) {
  // Process message from parent arcade hub
  handleArcadeIdentity(event.data)
}
```

---

## ✅ 2. Profile Data Usage

### What Arcade Hub Provides
- `username`: Player's custom username (or default from wallet)
- `address`: Wallet address (or null for guests)
- `avatar`: Base64 image data (or null)
- Profile data is **read-only** in Ape In (editing happens in arcade hub)

### Ape In Should:
- [ ] Display `username` from session (fallback to shortened address)
- [ ] Display `avatar` from session (fallback to generated avatar)
- [ ] Display `address` from session (for wallet operations)
- [ ] **REMOVE** all profile editing UI (name/PFP editing)
- [ ] **REMOVE** file upload components for avatar
- [ ] Profile dropdown should be read-only, showing data from session

### Implementation
```typescript
// Get profile from arcade session
function getProfileFromSession() {
  const session = getArcadeSession() // Your existing function
  return {
    username: session?.username || "Guest",
    address: session?.address || null,
    avatar: session?.avatar || null,  // Base64 image or null
  }
}

// Display PFP with fallback
function PlayerAvatar() {
  const { username, address, avatar } = getProfileFromSession()
  
  const avatarUrl = avatar 
    ? avatar  // Use base64 from session
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${address || username}`
  
  return (
    <img
      src={avatarUrl}
      alt={username}
      onError={(e) => {
        // Fallback on error
        e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${address || username}`
      }}
      className="w-10 h-10 rounded-full"
    />
  )
}
```

---

## ✅ 3. Points Submission (Ape In → Arcade Hub)

### What Arcade Hub Expects
When Ape In game ends, it should send:
```typescript
{
  type: "APE_IN_GAME_END",  // or "GAME_POINTS_UPDATE"
  points: number,             // Points earned (500-2000 based on mode)
  pointsEarned: number,       // Duplicate for compatibility
  gameMode: string,           // "sandy" | "aida" | "lana" | "en-j1n" | "nifty"
  mode: string,               // Duplicate for compatibility
  score: number,              // Ape In's game score (for Ape In leaderboard)
  timeSeconds: number,        // Game duration
  errors: number,             // Errors made
  timestamp: number           // When game ended
}
```

### Ape In Should:
- [ ] Send `APE_IN_GAME_END` message to parent window on game completion
- [ ] Include `points` (500-2000 based on mode, as specified earlier)
- [ ] Include `score` (Ape In's own scoring for Ape In leaderboard)
- [ ] **Only send for non-Sandy modes** (Sandy = 0 points, tutorial)
- [ ] Use `window.parent.postMessage()` with target origin `"*"` (arcade hub validates)

### Implementation
```typescript
// When game ends
function onGameComplete(gameResult: GameResult) {
  const { mode, score, timeSeconds, errors, isWin } = gameResult
  
  // Only send points for non-Sandy modes
  if (mode.toLowerCase() !== "sandy" && isWin) {
    // Calculate points (500-2000 based on mode, as specified)
    const pointsEarned = calculatePoints(mode, timeSeconds, errors, isWin)
    
    // Send to arcade hub
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: "APE_IN_GAME_END",
        points: pointsEarned,
        pointsEarned: pointsEarned,  // Duplicate for compatibility
        gameMode: mode,
        mode: mode,                   // Duplicate for compatibility
        score: score,                 // Ape In's score (for Ape In leaderboard)
        timeSeconds: timeSeconds,
        errors: errors || 0,
        timestamp: Date.now()
      }, "*")  // Arcade hub will validate origin
      
      console.log("📤 Sent points to arcade hub:", pointsEarned)
    }
  }
}
```

---

## ✅ 4. Game Session Logging

### What Arcade Hub Expects in Database
When Ape In saves a game session, it should include:
```typescript
{
  game_type: "ape_in",
  game_mode: "sandy" | "aida" | "lana" | "en-j1n" | "nifty",
  game_subtype: "single_player" | "pvp" | "multiplayer",
  score: number,              // ⚠️ Ape In's own calculated score
  points_earned: number,      // Points for arcade hub (500-2000)
  duration_seconds: number,
  result: "won" | "lost",
  wallet_address: string,     // From arcade session
  // ... other fields
}
```

### Ape In Should:
- [ ] Save `score` using **Ape In's existing scoring methodology** (don't use Cryptoku's)
- [ ] Save `points_earned` separately (for arcade hub rewards)
- [ ] Include `game_subtype` to distinguish single-player, PvP, multiplayer
- [ ] Use `wallet_address` from arcade session (not generate new one)
- [ ] **Don't log Sandy mode to leaderboard** (tutorial, 0 points)

### Implementation
```typescript
async function saveGameSession(gameResult: GameResult) {
  const session = getArcadeSession()
  
  // Calculate score using Ape In's existing logic
  const apeInScore = calculateApeInScore(gameResult)  // ⚠️ Use Ape In's function
  
  // Calculate points for arcade hub (separate from score)
  const arcadePoints = gameResult.mode.toLowerCase() === "sandy" 
    ? 0  // Tutorial = no points
    : calculatePoints(gameResult.mode, gameResult.timeSeconds, gameResult.errors, gameResult.isWin)
  
  // Save to database
  await supabase.from("game_sessions").insert({
    game_type: "ape_in",
    game_mode: gameResult.mode,
    game_subtype: gameResult.subtype || "single_player",
    score: apeInScore,              // ⚠️ Ape In's score
    points_earned: arcadePoints,    // Points for arcade hub
    duration_seconds: gameResult.timeSeconds,
    result: gameResult.isWin ? "won" : "lost",
    wallet_address: session?.address || null,
    user_id: session?.userId || null,
    // ... other fields
  })
}
```

---

## ✅ 5. Free Play Tracking

### What Arcade Hub Expects
- Free play tracking is **Ape In's responsibility** (stored in localStorage)
- Arcade hub doesn't track free plays
- After 5 free plays per mode per day, charge 0.1 APE

### Ape In Should:
- [ ] Track free plays in localStorage (keyed by wallet address)
- [ ] Reset free plays at midnight (local time)
- [ ] Show "Free plays remaining: X/5" or "Cost: 0.1 APE" in UI
- [ ] **Only consume free play AFTER game successfully launches**
- [ ] Sandy mode is always free (don't track)

### Implementation
```typescript
// Track free plays
const FREE_PLAYS_KEY = `ape_in_free_plays_${walletAddress}`

function canPlayFree(mode: string, walletAddress: string): boolean {
  if (mode.toLowerCase() === "sandy") return true  // Always free
  
  const freePlays = getDailyFreePlays(walletAddress)
  const modePlays = freePlays.find(p => p.mode === mode.toLowerCase())
  
  return (modePlays?.playsUsed || 0) < 5
}

// Only consume after successful launch
async function startGame(mode: string) {
  // Check if free play available (don't consume yet)
  const isFree = canPlayFree(mode, walletAddress)
  
  // Launch game first
  try {
    const gameStarted = await launchGame(mode)
    
    if (!gameStarted) {
      showError("Failed to start game")
      return  // Don't consume free play
    }
    
    // Only consume free play AFTER successful launch
    if (isFree) {
      useFreePlay(mode, walletAddress)
    } else {
      // Charge 0.1 APE (already checked above)
      await chargeApe(walletAddress, 0.1)
    }
  } catch (error) {
    console.error("Game launch failed:", error)
    // Don't consume free play if launch fails
  }
}
```

---

## ✅ 6. Message Timing

### What Arcade Hub Does
- Sends `ARCADE_IDENTITY` message after iframe loads (300ms delay)
- Listens for `REQUEST_ARCADE_IDENTITY` and responds immediately
- Uses `hasSentIdentity` flag to prevent duplicate sends

### Ape In Should:
- [ ] Request identity on mount if in iframe: `window.parent.postMessage({ type: "REQUEST_ARCADE_IDENTITY" }, "*")`
- [ ] Listen for `ARCADE_IDENTITY` messages from parent
- [ ] Handle both `ARCADE_IDENTITY` type AND session data directly
- [ ] Store session for use throughout game
- [ ] Gracefully handle missing session (Sandy mode should still work)

### Implementation
```typescript
useEffect(() => {
  // Request identity if in iframe
  if (window.parent !== window) {
    console.log("📤 Requesting arcade identity from parent...")
    window.parent.postMessage({ type: "REQUEST_ARCADE_IDENTITY" }, "*")
  }
  
  // Listen for identity messages
  const handleMessage = (event: MessageEvent) => {
    // Only process from parent (arcade hub)
    if (event.origin === window.location.origin) {
      return  // Ignore self-messages
    }
    
    // Check allowed origins (parent window)
    const allowedOrigins = [
      'https://arcade.thecryptorabbithole.io',
      'http://localhost:3000',
      // ... other allowed origins
    ]
    
    if (!allowedOrigins.includes(event.origin)) {
      console.warn("⚠️ Rejected message from unauthorized origin:", event.origin)
      return
    }
    
    // Handle ARCADE_IDENTITY
    if (event.data?.type === "ARCADE_IDENTITY") {
      console.log("✅ Received arcade identity:", event.data)
      const session = event.data.session || event.data  // Handle both formats
      setArcadeSession(session)
    }
  }
  
  window.addEventListener("message", handleMessage)
  
  return () => {
    window.removeEventListener("message", handleMessage)
  }
}, [])
```

---

## ✅ 7. Supabase Configuration

### What Arcade Hub Uses
- Real Supabase project URL and anon key
- No placeholder values

### Ape In Should:
- [ ] Use real Supabase environment variables (not placeholders)
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` to actual project URL
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` to actual anon key
- [ ] **NO `placeholder.supabase.co`** - this causes all database requests to fail

### Implementation
```typescript
// .env.local or .env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key

// In code
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("placeholder")) {
  console.error("❌ Missing or invalid Supabase configuration")
  // Handle gracefully - show error, don't crash
}
```

---

## ✅ 8. Game Launch Logic

### What Arcade Hub Expects
- Games should launch even without arcade session (especially Sandy/tutorial)
- Session is optional for game functionality
- Session is only needed for:
  - Profile display (username, avatar, address)
  - Points submission (needs wallet address)
  - Free play tracking (needs wallet address)

### Ape In Should:
- [ ] Allow Sandy mode to launch without session (tutorial should always work)
- [ ] Allow other modes to launch without session (graceful degradation)
- [ ] Only block features that require session (points submission, free play tracking)
- [ ] Show "Guest" mode if no session
- [ ] Don't consume free plays if session is missing and free plays are tracked by wallet

### Implementation
```typescript
function canLaunchGame(mode: string) {
  // Sandy (tutorial) always works
  if (mode.toLowerCase() === "sandy") {
    return true
  }
  
  // Other modes can launch without session (but some features won't work)
  return true  // Always allow launch
}

async function startGame(mode: string) {
  const session = getArcadeSession()
  
  // Check if session is required for this mode
  const needsSession = mode.toLowerCase() !== "sandy"
  
  if (needsSession && !session) {
    // Warn but don't block
    console.warn("⚠️ No arcade session, continuing as guest")
    // Still allow game to start, but some features won't work
  }
  
  // Launch game
  try {
    await launchGame(mode)
  } catch (error) {
    console.error("Game launch failed:", error)
    showError("Failed to start game")
  }
}
```

---

## Summary Checklist

### Critical (Blocking Game Launch)
- [ ] Fix origin validation (accept parent origin, not reject own origin)
- [ ] Configure Supabase with real credentials (not placeholders)
- [ ] Allow games to launch without session (especially Sandy)
- [ ] Don't consume free plays if game doesn't launch

### Important (Required for Full Functionality)
- [ ] Receive and store ARCADE_IDENTITY messages correctly
- [ ] Use profile data from session (username, avatar, address)
- [ ] Remove profile editing UI (read-only in Ape In)
- [ ] Send points to arcade hub when games end
- [ ] Save game sessions with correct structure (score, points_earned, game_subtype)

### Nice to Have (Enhanced UX)
- [ ] Request identity on mount if session missing
- [ ] Handle both nested and flattened session formats
- [ ] Graceful fallbacks for missing data
- [ ] Clear error messages for configuration issues

---

## Testing Checklist

After implementing fixes:

1. **Message Reception**
   - [ ] Ape In receives ARCADE_IDENTITY from arcade hub
   - [ ] No "Rejected message from unauthorized origin" errors
   - [ ] Session data is stored correctly

2. **Game Launch**
   - [ ] Sandy mode launches without session
   - [ ] Other modes launch with session
   - [ ] Free plays only consumed after successful launch
   - [ ] Games launch even if session is missing (graceful)

3. **Profile Display**
   - [ ] Username displays from session
   - [ ] Avatar displays from session (base64)
   - [ ] Address displays from session
   - [ ] No profile editing UI visible

4. **Points Submission**
   - [ ] Points sent to arcade hub on game completion
   - [ ] Sandy mode doesn't send points (0 points)
   - [ ] Points appear in arcade hub after game ends

5. **Database Operations**
   - [ ] No `placeholder.supabase.co` requests
   - [ ] Game sessions save correctly
   - [ ] Free plays tracked correctly

---

## Documentation References

- `docs/APE_IN_CRITICAL_FIXES_PROMPT.md` - Critical fixes (origin validation, Supabase)
- `docs/APE_IN_BUILD_FIXES_PROMPT.md` - Game mode pricing, points, profile sync
- `docs/ARCADE_IDENTITY_MESSAGE_STRUCTURE.md` - Message format details
- `docs/APE_IN_PROMPT_FOR_BUILD.md` - Leaderboard and stats implementation

