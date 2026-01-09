# Ape In Leaderboard & Stats Implementation - Prompt for Build

## ⚠️ CRITICAL: Preserve Ape In's Scoring Methodology

**Before implementing, read this carefully:**
- **Ape In must use its OWN existing scoring system** - do NOT apply Cryptoku's scoring methodology
- Leaderboard and stats should **only display scores that Ape In already calculates** during gameplay
- **Do NOT recalculate scores** - only read and display what's stored in the database
- All scoring logic remains in Ape In's existing game code - this is for display only

---

## Implementation Tasks

### 1. Leaderboard Button Implementation

**Make the "Leaderboard" button functional:**
- Create a modal with 4 tabs/columns:
  1. **"Overall"** - All Ape In modes combined (single-player, PvP, multiplayer)
  2. **"Single-Player"** - Aida, Lana, En-J1n, Nifty (exclude Sandy/tutorial)
  3. **"PvP"** - Player vs Player matches
  4. **"Multiplayer"** - Multiplayer mode matches

**Data Fetching:**
- Fetch from Supabase `game_sessions` table filtered by `game_type: "ape_in"`
- Filter by `game_subtype` for each tab (single_player, pvp, multiplayer)
- **Use existing `score` field** - do NOT recalculate, just display what Ape In saved
- Group by user to show best score per user
- Sort by score (descending) and assign ranks
- Display: rank, avatar, username/address, score, game mode, time

**UI Requirements:**
- Style with Ape In theme (purple/pink gradients, glass morphism)
- Show loading state while fetching
- Show empty state when no data
- Make responsive for mobile
- Dismissible with ESC key, click outside, or close button

### 2. My Stats Button Implementation (Profile Dropdown)

**Make the "My Stats" button in profile dropdown functional:**
- Create a stats modal showing comprehensive player statistics
- Fetch all game sessions for current player (filtered by wallet address)

**Stats to Display:**
- **Overall Stats:**
  - Total games, wins, losses, win rate
  - Total points earned (from `points_earned` field - separate from score)
  - Average score (aggregate of existing scores, don't recalculate)
  - Best score (highest of existing scores)
  - Total play time, average game time, best time

- **Streaks:**
  - Current win streak, best win streak

- **Mode Breakdown:**
  - For each mode (Aida, Lana, En-J1n, Nifty - exclude Sandy):
    - Games played, wins, losses
    - Best score (from existing scores)

- **Subtype Breakdown:**
  - Single-Player: games, wins, best score
  - PvP: games, wins, best score
  - Multiplayer: games, wins, best score

- **Performance:**
  - Total errors, average errors per game

**Data Processing:**
- **Aggregate existing scores only** - do NOT recalculate
- Average score = sum of existing scores / count of wins with scores
- Best score = max of existing scores
- All stats should come from what's already stored in `game_sessions`

### 3. Score vs Points Clarification

**Important distinction:**
- **Score** (`game_sessions.score`): Ape In's game-specific scoring
  - Calculated by Ape In's existing scoring logic (already implemented)
  - Used for Ape In leaderboard rankings
  - Display in leaderboard and stats

- **Points** (`game_sessions.points_earned`): Arcade hub rewards
  - Calculated separately (500-2000 based on mode, as specified earlier)
  - Used for overall arcade hub leaderboard
  - Sent to arcade hub via postMessage (already implemented)

**Your responsibility:**
- Ensure Ape In saves its calculated score to `game_sessions.score` when game ends
- The score should come from Ape In's existing scoring function
- Leaderboard/stats code will just read and display this score

### 4. Data Structure Requirements

When Ape In saves a game session, ensure it includes:
```typescript
{
  game_type: "ape_in",
  game_mode: "sandy" | "aida" | "lana" | "en-j1n" | "nifty",
  game_subtype: "single_player" | "pvp" | "multiplayer",
  score: <Ape In's calculated score>, // ⚠️ Use Ape In's existing scoring
  points_earned: <points for arcade hub>, // Separate from score
  duration_seconds: <game duration>,
  result: "won" | "lost",
  wallet_address: <player wallet>,
  // ... other fields
}
```

### 5. UI Reference

Use Cryptoku's leaderboard/stats UI as a **visual reference only**:
- Location: `features/games/cryptoku/cryptokugame.tsx`
- Leaderboard: Lines 1387-2069 (modal structure)
- Stats: Lines 2071-2185 (stats display)

**But remember:**
- Use Cryptoku's UI pattern (how it looks, how it's structured)
- **Do NOT copy Cryptoku's scoring calculations**
- All scores come from Ape In's existing calculations

---

## Example Code Structure

### Leaderboard Fetching
```typescript
async function fetchApeInLeaderboard(
  subtype: "all" | "single_player" | "pvp" | "multiplayer" = "all",
  limit: number = 50
) {
  const query = supabase
    .from("game_sessions")
    .select(`
      user_id,
      score, // ⚠️ Use existing score field
      game_mode,
      duration_seconds,
      result,
      created_at,
      profiles!inner(wallet_address, username, avatar_url)
    `)
    .eq("game_type", "ape_in")
    .eq("result", "won")
    .order("score", { ascending: false }) // Sort by existing scores
    
  // Filter by subtype
  if (subtype !== "all") {
    query.eq("game_subtype", subtype)
    if (subtype === "single_player") {
      query.neq("game_mode", "sandy") // Exclude tutorial
    }
  }
  
  const { data } = await query
  
  // Group by user, get best score per user
  const userScores = new Map()
  data.forEach((entry) => {
    const current = userScores.get(entry.user_id)
    if (!current || entry.score > current.score) {
      // ⚠️ Use existing score, don't recalculate
      userScores.set(entry.user_id, {
        ...entry,
        score: entry.score, // Existing score from database
      })
    }
  })
  
  // Sort and rank
  return Array.from(userScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }))
}
```

### Stats Aggregation
```typescript
async function getApeInPlayerStats(walletAddress: string) {
  const { data: sessions } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("game_type", "ape_in")
    .eq("wallet_address", walletAddress.toLowerCase())
  
  const stats = {
    totalGames: sessions.length,
    totalWins: 0,
    bestScore: 0,
    averageScore: 0,
    // ... other fields
  }
  
  let totalScore = 0
  let scoreCount = 0
  
  sessions.forEach((session) => {
    if (session.result === "won") {
      stats.totalWins++
    }
    
    // ⚠️ Aggregate existing scores, don't recalculate
    if (session.score && typeof session.score === 'number') {
      if (session.score > stats.bestScore) {
        stats.bestScore = session.score // Best of existing scores
      }
      totalScore += session.score // Sum existing scores
      scoreCount++
    }
  })
  
  // Calculate average from existing scores
  stats.averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0
  
  return stats
}
```

---

## Checklist

### Leaderboard
- [ ] Wire "Leaderboard" button to open modal
- [ ] Create modal with 4 tabs (Overall, Single-Player, PvP, Multiplayer)
- [ ] Fetch data from Supabase `game_sessions` table
- [ ] Filter by `game_type: "ape_in"` and `game_subtype`
- [ ] **Use existing `score` field** - don't recalculate
- [ ] Display entries with rank, avatar, username, score, time
- [ ] Style with Ape In theme
- [ ] Add loading and empty states
- [ ] Make responsive

### Stats
- [ ] Wire "My Stats" button (in profile dropdown) to open modal
- [ ] Fetch player's game sessions from Supabase
- [ ] **Aggregate existing scores** - don't recalculate
- [ ] Calculate stats (wins, averages, streaks, etc.) from stored data
- [ ] Display overall stats, mode breakdown, subtype breakdown
- [ ] Style with Ape In theme
- [ ] Add loading state
- [ ] Make responsive

### Data Integration
- [ ] Verify Ape In saves `score` field using its existing scoring logic
- [ ] Verify Ape In saves `game_type: "ape_in"`, `game_mode`, `game_subtype`
- [ ] Test with real game data
- [ ] Confirm scores displayed match Ape In's calculations

---

## What NOT to Do

❌ **Do NOT implement Cryptoku's scoring formulas**  
❌ **Do NOT recalculate scores in leaderboard/stats code**  
❌ **Do NOT modify Ape In's existing scoring logic**  
❌ **Do NOT use `points_earned` for leaderboard ranking** (use `score` instead)  

## What TO Do

✅ **Preserve Ape In's existing scoring system**  
✅ **Read and display scores that Ape In already calculates**  
✅ **Use Cryptoku's UI pattern for visual reference only**  
✅ **Separate Score (Ape In leaderboard) from Points (Arcade hub rewards)**  

---

## Full Documentation

For complete implementation details with code examples, see:
- `docs/APE_IN_LEADERBOARD_AND_STATS_PROMPT.md` - Full technical guide
- `docs/APE_IN_SCORING_CLARIFICATION.md` - Scoring system clarification

