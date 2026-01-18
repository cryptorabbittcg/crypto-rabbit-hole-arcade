# Cryptoku Timer Bug Analysis & Fix Proposal

## Problem Summary
- **Bug**: UI shows paused, but elapsed time on submit includes the paused duration
- **Example**: Paused for hours, resumed, submitted APE mode; leaderboard time_seconds logged as 193 minutes
- **Root Cause**: Timer uses wall-clock time from `gameStartTime` to `endTime`, which includes all paused periods

---

## 1. Timer Code Location & Analysis

### File: `features/games/cryptoku/cryptokugame.tsx`

#### Timer State Variables (Lines 557-564)
```typescript
const [gameStartTime, setGameStartTime] = useState<Date | null>(null)
const [gameEndTime, setGameEndTime] = useState<Date | null>(null)
const [isPaused, setIsPaused] = useState(false)
const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null)
```

**Issue**: `gameStartTime` is set once when game begins and never adjusted. `pauseStartTime` is only used for display, not for excluding paused time from calculations.

#### Timer Calculation Function (Lines 654-658)
```typescript
const getCurrentGameTime = useCallback(() => {
  if (!gameStartTime) return 0
  const now = isPaused && pauseStartTime ? pauseStartTime : new Date()
  return Math.floor((now.getTime() - gameStartTime.getTime()) / 1000)
}, [gameStartTime, isPaused, pauseStartTime])
```

**Bug**: 
- When paused, it uses `pauseStartTime` instead of `new Date()` for display, which freezes the display
- However, this only affects the **display** - the actual calculation still uses `gameStartTime` as the base
- When resuming, `pauseStartTime` is cleared, but the elapsed time already includes the paused period
- **The wall-clock difference from `gameStartTime` to `endTime` includes all paused time**

#### Timer Ticking Effect (Lines 633-640)
```typescript
useEffect(() => {
  if (!gameStartTime || showVictory || isPaused || gameEndTime) return
  const interval = setInterval(() => {
    setTimerTicks((prev) => prev + 1)
  }, 1000)
  return () => clearInterval(interval)
}, [gameStartTime, showVictory, isPaused, gameEndTime])
```

**Note**: The interval correctly stops when `isPaused` is true, but this only affects UI updates, not the underlying time calculation.

#### Pause/Resume Handler (Lines 877-886)
```typescript
const togglePause = useCallback(() => {
  if (!gameHasStarted || showVictory) return
  if (isPaused) {
    setIsPaused(false)
    setPauseStartTime(null)
  } else {
    setIsPaused(true)
    setPauseStartTime(new Date())
  }
}, [gameHasStarted, isPaused, showVictory])
```

**Bug**: 
- On pause: Records `pauseStartTime` but doesn't accumulate the active time before pause
- On resume: Clears `pauseStartTime` but doesn't adjust `gameStartTime` to exclude paused duration
- Result: All paused time is included in the final calculation

---

## 2. Submit Payload Creation

### Completion Submit (Line 1296)
```typescript
const timeInSeconds = Math.floor((endTime.getTime() - gameStartTime.getTime()) / 1000)
```

**Location**: `features/games/cryptoku/cryptokugame.tsx:1296` (inside `handleZkVerifyValidation`)

**Payload sent** (Lines 1340-1349):
```typescript
body: JSON.stringify({
  playerAddress,
  mode,
  runId,
  timeSeconds: timeInSeconds,  // ← BUG: Includes paused time
  hintsUsed: hintsUsedInGame,
  errors,
  completed: true,
  forfeited: false,
})
```

### Forfeit Submit (Lines 686, 770)
**Location 1**: `features/games/cryptoku/cryptokugame.tsx:686` (inside `confirmForfeit`)
```typescript
const timeInSeconds = getCurrentGameTime()  // ← Uses buggy function
```

**Location 2**: `features/games/cryptoku/cryptokugame.tsx:770` (inside `startNewGame` when forfeiting previous game)
```typescript
const timeInSeconds = getCurrentGameTime()  // ← Uses buggy function
```

**Payload sent** (Lines 695-704, 776-785):
```typescript
body: JSON.stringify({
  playerAddress,
  mode: currentDifficulty.toUpperCase(),
  runId: runId || `run_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
  timeSeconds: timeInSeconds,  // ← BUG: Includes paused time
  hintsUsed: hintsUsedInGame,
  errors,
  completed: false,
  forfeited: true,
})
```

**Summary**: All three submit locations use time calculations that include paused duration.

---

## 3. Server-Side Usage

### File: `app/api/cryptoku/submit-result/route.ts`

#### Receives timeSeconds (Line 51)
```typescript
const {
  playerAddress,
  mode,
  runId,
  timeSeconds,  // ← Trusted from client, no validation
  hintsUsed,
  errors,
  completed,
  forfeited,
} = body
```

#### Uses in Score Calculation (Line 142)
```typescript
const score = calculateScore(mode, timeSeconds, hintsUsed, errors, playerStats.cleanStreak)
```

**Location**: `app/api/cryptoku/submit-result/route.ts:142`

**Score formula** (Lines 9-42):
- Time decay: `timeSeconds * 0.2` (Line 20)
- Higher `timeSeconds` = lower score
- **No validation** that `timeSeconds` is reasonable

#### Stores in Leaderboard (Line 212)
```typescript
const leaderboardResult = await leaderboardService.addEntry({
  runId,
  address: normalizedAddress,
  mode,
  score,
  timeSeconds,  // ← Stored directly from client
  hintsUsed,
  errors,
  timestamp: Date.now(),
  completed: true,
  forfeited: false,
  season: CURRENT_SEASON,
})
```

**Location**: `app/api/cryptoku/submit-result/route.ts:212`

#### Stores in game_sessions (Line 256)
```typescript
const { data: sessionData, error: sessionError } = await adminClient
  .from('game_sessions')
  .insert({
    user_id: profile.id,
    game_type: 'cryptoku',
    game_mode: mode,
    duration: timeSeconds,  // ← Stored directly from client
    score: score,
    result: 'won',
    points_earned: score,
    started_at: startedAt,
    ended_at: endedAt,
    run_id: runId,
    season: CURRENT_SEASON,
  })
```

**Location**: `app/api/cryptoku/submit-result/route.ts:256`

**Note**: `started_at` and `ended_at` are set to `new Date().toISOString()` (Lines 247-248), so they don't reflect actual game duration.

#### Server Validation
**NONE**: The server completely trusts `timeSeconds` from the client. There is:
- No range validation (e.g., max 60 minutes)
- No sanity check against `started_at`/`ended_at`
- No rejection of absurd values

---

## 4. Proposed Fix

### Client-Side Fix (REQUIRED)

**File**: `features/games/cryptoku/cryptokugame.tsx`

#### New State Variables (Add after line 564)
```typescript
const [activeElapsedMs, setActiveElapsedMs] = useState(0)  // Accumulated active time in milliseconds
const [lastResumeAtMs, setLastResumeAtMs] = useState<number | null>(null)  // Timestamp when last resumed
```

#### Replace `getCurrentGameTime` (Lines 654-658)
```typescript
const getCurrentGameTime = useCallback(() => {
  if (!gameStartTime) return 0
  
  let totalActiveMs = activeElapsedMs
  
  // If currently running (not paused), add time since last resume
  if (!isPaused && lastResumeAtMs !== null) {
    totalActiveMs += Date.now() - lastResumeAtMs
  }
  
  return Math.floor(totalActiveMs / 1000)
}, [gameStartTime, isPaused, activeElapsedMs, lastResumeAtMs])
```

#### Replace `togglePause` (Lines 877-886)
```typescript
const togglePause = useCallback(() => {
  if (!gameHasStarted || showVictory) return
  
  if (isPaused) {
    // Resuming: record resume time
    setIsPaused(false)
    setPauseStartTime(null)
    setLastResumeAtMs(Date.now())
  } else {
    // Pausing: accumulate active time up to now
    const now = Date.now()
    if (lastResumeAtMs !== null) {
      // Add time since last resume to accumulated time
      setActiveElapsedMs(prev => prev + (now - lastResumeAtMs))
    } else if (gameStartTime) {
      // First pause: accumulate from game start
      setActiveElapsedMs(prev => prev + (now - gameStartTime.getTime()))
    }
    setIsPaused(true)
    setPauseStartTime(new Date())
    setLastResumeAtMs(null)
  }
}, [gameHasStarted, isPaused, showVictory, lastResumeAtMs, gameStartTime])
```

#### Update `beginGame` (Lines 855-875)
```typescript
const beginGame = useCallback(() => {
  if (!isGamePrepared || gameHasStarted) return

  const start = new Date()
  setGameStartTime(start)
  setGameEndTime(null)
  setVerificationAttempted(false)
  setIsVerifying(false)
  setShowVictory(false)
  setPointsEarned(null)
  setIsPaused(false)
  setPauseStartTime(null)
  setTimerTicks(0)
  
  // Initialize active elapsed time tracking
  setActiveElapsedMs(0)
  setLastResumeAtMs(Date.now())  // Start tracking from now

  const session = startGameSession(currentDifficulty)
  setCurrentSession(session)

  setGameHasStarted(true)
  setIsGamePrepared(false)
  onGameStart?.()
}, [currentDifficulty, gameHasStarted, isGamePrepared, onGameStart])
```

#### Update `startNewGame` (Lines 764-853)
Add reset of new timer state variables (around line 832):
```typescript
setIsPaused(false)
setPauseStartTime(null)
setTimerTicks(0)
setActiveElapsedMs(0)  // ← Add this
setLastResumeAtMs(null)  // ← Add this
```

#### Update Completion Submit (Line 1296)
Replace the direct calculation with:
```typescript
// Calculate final active time
let finalActiveMs = activeElapsedMs
if (!isPaused && lastResumeAtMs !== null) {
  // Add time since last resume
  finalActiveMs += Date.now() - lastResumeAtMs
} else if (gameStartTime && lastResumeAtMs === null && !isPaused) {
  // Edge case: never paused, calculate from start
  finalActiveMs = Date.now() - gameStartTime.getTime()
}

const timeInSeconds = Math.floor(finalActiveMs / 1000)
```

**Alternative (simpler)**: Just use `getCurrentGameTime()` since it now correctly excludes paused time:
```typescript
const timeInSeconds = getCurrentGameTime()
```

#### Edge Cases to Handle
1. **Pause during completion modal**: If user pauses after completion but before submit, ensure final calculation uses paused state
2. **Tab background**: Browser may throttle timers, but `Date.now()` should still be accurate
3. **Refresh mid-game**: Game state is lost, but this is expected behavior (game would need to be restarted)

---

### Server-Side Hardening (RECOMMENDED)

**File**: `app/api/cryptoku/submit-result/route.ts`

#### Add Validation (After line 73, before score calculation)
```typescript
// Validate timeSeconds range
const MAX_REASONABLE_TIME_SECONDS = 60 * 60  // 60 minutes (3600 seconds)
if (timeSeconds < 0) {
  console.error("[CryptokuSubmit] Invalid timeSeconds: negative", { timeSeconds, runId })
  return NextResponse.json({ error: "Invalid time value" }, { status: 400 })
}
if (timeSeconds > MAX_REASONABLE_TIME_SECONDS) {
  console.warn("[CryptokuSubmit] Suspiciously high timeSeconds, clamping", { 
    timeSeconds, 
    runId,
    clamped: MAX_REASONABLE_TIME_SECONDS 
  })
  // Clamp to max instead of rejecting to prevent leaderboard pollution
  timeSeconds = MAX_REASONABLE_TIME_SECONDS
}
```

**Location**: Add after line 73, before line 75 (before early returns)

#### Optional: Derive from Timestamps
If `started_at` and `ended_at` are provided and valid, could validate:
```typescript
// If timestamps are provided, validate consistency
if (body.startedAt && body.endedAt) {
  const derivedSeconds = Math.floor(
    (new Date(body.endedAt).getTime() - new Date(body.startedAt).getTime()) / 1000
  )
  // Allow some tolerance (e.g., 10 seconds) for network/processing delay
  if (Math.abs(derivedSeconds - timeSeconds) > 10) {
    console.warn("[CryptokuSubmit] timeSeconds mismatch with timestamps", {
      timeSeconds,
      derivedSeconds,
      runId
    })
    // Use the smaller value to prevent exploitation
    timeSeconds = Math.min(timeSeconds, derivedSeconds)
  }
}
```

**Note**: This requires sending `startedAt`/`endedAt` from client, which is currently not done.

---

## Summary of Changes

### Client (`features/games/cryptoku/cryptokugame.tsx`)
1. **Add state**: `activeElapsedMs`, `lastResumeAtMs`
2. **Replace**: `getCurrentGameTime()` - use accumulator instead of wall-clock
3. **Replace**: `togglePause()` - accumulate time on pause, record resume on unpause
4. **Update**: `beginGame()` - initialize accumulator
5. **Update**: `startNewGame()` - reset accumulator
6. **Update**: Completion submit - use `getCurrentGameTime()` (now fixed)

### Server (`app/api/cryptoku/submit-result/route.ts`)
1. **Add**: Validation for `timeSeconds` range (0 to 60 minutes)
2. **Add**: Clamping of suspiciously high values instead of rejection

---

## Testing Checklist

- [ ] Start game, pause immediately, resume, submit → time should be ~0 seconds
- [ ] Start game, play 30 seconds, pause for 5 minutes, resume, play 30 seconds, submit → time should be ~60 seconds
- [ ] Start game, pause multiple times, resume, submit → time should exclude all paused periods
- [ ] Start game, complete without pausing → time should match wall-clock time
- [ ] Start game, pause, refresh page → game state lost (expected)
- [ ] Submit with absurd timeSeconds (e.g., 999999) → server should clamp to 60 minutes
- [ ] Verify leaderboard shows correct times
- [ ] Verify score calculation uses correct time (affects time decay)

---

## Files to Modify

1. `features/games/cryptoku/cryptokugame.tsx` (Lines: 564, 654-658, 855-875, 764-853, 877-886, 1296)
2. `app/api/cryptoku/submit-result/route.ts` (After line 73)

---

## Why Paused Time is Being Included

The current implementation uses **wall-clock time** from `gameStartTime` to `endTime`. When the game is paused:
- `pauseStartTime` is set, which freezes the **display** of elapsed time
- However, `gameStartTime` remains unchanged
- On submit, the calculation `(endTime - gameStartTime) / 1000` includes the entire wall-clock duration, including all paused periods
- The `pauseStartTime` variable is never used to subtract paused duration from the total

The fix switches to an **accumulator pattern**: track only active elapsed time, pausing the accumulator when paused, and resuming it when unpaused.
