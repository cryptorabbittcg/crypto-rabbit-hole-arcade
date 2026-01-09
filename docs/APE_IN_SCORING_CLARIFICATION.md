# Ape In Scoring System Clarification

## ⚠️ CRITICAL: Preserve Ape In's Existing Scoring

This document clarifies that **Ape In must use its own scoring methodology** and should NOT adopt Cryptoku's scoring system.

---

## What This Implementation Does

### Leaderboard & Stats Implementation
- **Displays data only** - reads scores that Ape In has already calculated
- Shows leaderboard entries with pre-calculated scores
- Aggregates stats from existing game session data
- Organizes data into tabs/columns (Overall, Single-Player, PvP, Multiplayer)

### What It Does NOT Do
- ❌ **Does NOT implement any scoring calculations**
- ❌ **Does NOT modify Ape In's existing scoring logic**
- ❌ **Does NOT apply Cryptoku's scoring formulas**
- ❌ **Does NOT recalculate scores**

---

## Ape In's Responsibility

### When Game Ends
1. **Ape In calculates the score** using its existing scoring system (already implemented)
2. **Ape In saves the score** to `game_sessions.score` when logging the session
3. **Ape In saves other data** like `points_earned`, `game_mode`, `game_subtype`, `duration_seconds`, `result`

### Example: How Ape In Should Save Game Data
```typescript
// In Ape In's game completion logic (already exists):
function onGameComplete(gameResult) {
  // Ape In calculates score using its own methodology
  const calculatedScore = calculateApeInScore(gameResult) // Ape In's existing function
  
  // Ape In saves to database
  saveGameSession({
    game_type: "ape_in",
    game_mode: currentMode, // "sandy" | "aida" | "lana" | "en-j1n" | "nifty"
    game_subtype: gameSubtype, // "single_player" | "pvp" | "multiplayer"
    score: calculatedScore, // ⚠️ Use Ape In's calculated score
    points_earned: pointsEarned, // Points for arcade hub (separate from score)
    duration_seconds: timeElapsed,
    result: isWin ? "won" : "lost",
    // ... other fields
  })
}
```

---

## Leaderboard/Stats Code Responsibility

### What Leaderboard Code Does
```typescript
// Leaderboard just fetches and displays pre-calculated scores
async function fetchApeInLeaderboard(subtype: string) {
  const { data } = await supabase
    .from("game_sessions")
    .select("score, game_mode, ...") // ⚠️ Fetch existing scores
    .eq("game_type", "ape_in")
    .order("score", { ascending: false }) // ⚠️ Sort by existing scores
  
  return data // Just return what's already calculated
}
```

### What Stats Code Does
```typescript
// Stats just aggregates pre-calculated scores
function calculateStats(sessions) {
  let bestScore = 0
  let totalScore = 0
  let scoreCount = 0
  
  sessions.forEach((session) => {
    // ⚠️ Just read the score that Ape In already calculated
    if (session.score > bestScore) {
      bestScore = session.score
    }
    if (session.score) {
      totalScore += session.score // Aggregate, don't recalculate
      scoreCount++
    }
  })
  
  return {
    bestScore: bestScore, // Best of Ape In's scores
    averageScore: scoreCount > 0 ? totalScore / scoreCount : 0 // Average of Ape In's scores
  }
}
```

---

## Key Distinctions

### Score vs Points
- **Score**: Ape In's game-specific scoring (used for leaderboard rankings within Ape In)
  - Calculated by Ape In's existing scoring logic
  - Stored in `game_sessions.score`
  - Used for Ape In leaderboard display
  
- **Points**: Arcade hub rewards (used across all games)
  - Calculated separately (e.g., 500-2000 points per mode as specified earlier)
  - Stored in `game_sessions.points_earned`
  - Sent to arcade hub via postMessage
  - Used in overall arcade hub leaderboard

### Example
```typescript
// Ape In game ends
const apeInScore = 15000 // Ape In's scoring system calculates this
const arcadePoints = 750 // Points for arcade hub (based on mode and performance)

// Save both
saveGameSession({
  score: apeInScore, // ⚠️ Ape In's score (for Ape In leaderboard)
  points_earned: arcadePoints, // Points for arcade hub
})
```

---

## What to Check in Ape In Code

### Verify Ape In Has Scoring Logic
1. ✅ Check if Ape In has a `calculateScore()` or similar function
2. ✅ Verify this function is called when game ends
3. ✅ Ensure the calculated score is saved to `game_sessions.score`

### If Ape In Doesn't Have Scoring Yet
1. Implement Ape In's own scoring logic (appropriate for the game mechanics)
2. Save the calculated score when logging game sessions
3. Leaderboard/stats code will automatically display these scores

---

## Summary

| Component | Responsibility | Uses |
|-----------|---------------|------|
| **Ape In Game Logic** | Calculates score using Ape In's methodology | Ape In's scoring system |
| **Ape In Session Saving** | Saves calculated score to database | Ape In's calculated score |
| **Leaderboard Code** | Fetches and displays scores | Existing `game_sessions.score` values |
| **Stats Code** | Aggregates scores for display | Existing `game_sessions.score` values |
| **Arcade Hub** | Receives points for overall leaderboard | `game_sessions.points_earned` |

**Key Point**: All scoring calculations stay in Ape In. Leaderboard and stats just display what's already calculated.

