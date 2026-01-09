# Ape In Leaderboard & Stats Implementation Prompt

## Overview
Implement functional Leaderboard and My Stats buttons in Ape In, similar to how Cryptoku displays player data. The leaderboard should be organized into columns/tabs for different game modes, and stats should show comprehensive player performance metrics.

**⚠️ IMPORTANT: Scoring Methodology**
- **Ape In must use its OWN existing scoring system** - do NOT apply Cryptoku's scoring methodology
- The leaderboard and stats should **display whatever score Ape In already calculates** during gameplay
- **Do NOT recalculate scores** - only read and display the scores that Ape In has already computed and stored
- This prompt is for displaying data only - all scoring logic remains in Ape In's existing game code

---

## 1. Leaderboard Button Implementation

### Current Issue
- Leaderboard button exists but does nothing
- Needs to show actual game data from on-chain leaderboard logging

### Data Source
**Yes, you are correct** - the data should come from on-chain leaderboard logging. However, during development, you can:
1. **Initially**: Fetch from Supabase `game_sessions` table filtered by `game_type: "ape_in"`
2. **Later**: Switch to on-chain data via your Thirdweb developer wallet integration

**⚠️ CRITICAL: Use Ape In's Existing Scores**
- Fetch the `score` field that Ape In has already calculated and stored
- **Do NOT recalculate or modify scores** - just display what's already there
- Ape In's scoring methodology is already implemented in your game code - preserve it

### Required Implementation

#### Leaderboard Modal Structure
Similar to Cryptoku's leaderboard modal, but with Ape In-specific tabs:

```typescript
// Leaderboard tabs/columns:
1. "Overall" - All Ape In modes combined (single-player, PvP, multiplayer)
2. "Single-Player" - Aida, Lana, En-J1n, Nifty (exclude Sandy/tutorial)
3. "PvP" - Player vs Player matches
4. "Multiplayer" - Multiplayer mode matches
```

#### Data Fetching

**Option A: From Supabase (Development)**
```typescript
// Fetch from Supabase game_sessions table
async function fetchApeInLeaderboard(
  subtype: "all" | "single_player" | "pvp" | "multiplayer" = "all",
  limit: number = 50
) {
  try {
    // Build query based on subtype
    const query = supabase
      .from("game_sessions")
      .select(`
        user_id,
        score,
        game_mode,
        duration_seconds,
        result,
        created_at,
        profiles!inner(wallet_address, username, avatar_url)
      `)
      .eq("game_type", "ape_in")
      .eq("result", "won") // Only show wins
      .order("score", { ascending: false })
      .limit(limit * 2) // Get more to handle duplicates
    
    // Filter by subtype if not "all"
    if (subtype === "single_player") {
      query.eq("game_subtype", "single_player")
        .neq("game_mode", "sandy") // Exclude tutorial
    } else if (subtype === "pvp") {
      query.eq("game_subtype", "pvp")
    } else if (subtype === "multiplayer") {
      query.eq("game_subtype", "multiplayer")
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    // Group by user_id to get best score per user
    const userScores = new Map()
    data.forEach((entry) => {
      const userId = entry.user_id
      const current = userScores.get(userId)
      if (!current || entry.score > current.score) {
        userScores.set(userId, {
          user_id: userId,
          wallet_address: entry.profiles.wallet_address,
          username: entry.profiles.username,
          avatar_url: entry.profiles.avatar_url,
          score: entry.score,
          game_mode: entry.game_mode,
          time_seconds: entry.duration_seconds,
          date: entry.created_at,
        })
      }
    })
    
    // Convert to array, sort, and assign ranks
    const entries = Array.from(userScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }))
    
    return entries
  } catch (error) {
    console.error("Error fetching Ape In leaderboard:", error)
    return []
  }
}
```

**Option B: From On-Chain (Production)**
```typescript
// When on-chain logging is ready, fetch from on-chain leaderboard contract
async function fetchApeInLeaderboardOnChain(
  subtype: "all" | "single_player" | "pvp" | "multiplayer" = "all"
) {
  // Fetch from your on-chain leaderboard contract
  // This will be implemented when Thirdweb developer wallet integration is ready
  // For now, use Supabase as fallback
  return fetchApeInLeaderboard(subtype)
}
```

#### UI Implementation

```typescript
// State management
const [showLeaderboard, setShowLeaderboard] = useState(false)
const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([])
const [leaderboardType, setLeaderboardType] = useState<"all" | "single_player" | "pvp" | "multiplayer">("all")
const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)

// Fetch function
const fetchLeaderboard = async (type: "all" | "single_player" | "pvp" | "multiplayer") => {
  setLoadingLeaderboard(true)
  try {
    const entries = await fetchApeInLeaderboard(type, 50)
    setLeaderboardEntries(entries)
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
  } finally {
    setLoadingLeaderboard(false)
  }
}

// Leaderboard Modal UI
{showLeaderboard && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
    <div className="bg-gradient-to-b from-slate-900 to-black border-2 border-purple-500/50 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.5)]">
      <h2 className="text-3xl font-bold mb-4 text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        🏆 Ape In Leaderboard
      </h2>
      
      {/* Tabs for different leaderboard types */}
      <div className="flex gap-2 mb-4 justify-center flex-wrap">
        <button
          onClick={() => {
            setLeaderboardType("all")
            fetchLeaderboard("all")
          }}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            leaderboardType === "all"
              ? "bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          Overall
        </button>
        <button
          onClick={() => {
            setLeaderboardType("single_player")
            fetchLeaderboard("single_player")
          }}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            leaderboardType === "single_player"
              ? "bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          Single-Player
        </button>
        <button
          onClick={() => {
            setLeaderboardType("pvp")
            fetchLeaderboard("pvp")
          }}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            leaderboardType === "pvp"
              ? "bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          PvP
        </button>
        <button
          onClick={() => {
            setLeaderboardType("multiplayer")
            fetchLeaderboard("multiplayer")
          }}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            leaderboardType === "multiplayer"
              ? "bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          Multiplayer
        </button>
      </div>
      
      {/* Leaderboard entries */}
      <div className="bg-slate-800/50 rounded-lg p-4 max-h-96 overflow-y-auto">
        {loadingLeaderboard ? (
          <div className="text-center text-slate-400 py-8">Loading leaderboard...</div>
        ) : leaderboardEntries.length === 0 ? (
          <div className="text-center text-slate-400 py-8">No entries yet. Be the first!</div>
        ) : (
          <div className="space-y-2">
            {leaderboardEntries.map((entry) => (
              <div
                key={`${entry.user_id}-${entry.rank}`}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  entry.rank <= 3
                    ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50"
                    : "bg-slate-700/50 border-slate-600"
                } hover:bg-slate-700/70 transition-all`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* Rank */}
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                    entry.rank === 1 ? "bg-yellow-500 text-black" :
                    entry.rank === 2 ? "bg-gray-400 text-black" :
                    entry.rank === 3 ? "bg-orange-600 text-white" :
                    "bg-slate-600 text-slate-300"
                  }`}>
                    {entry.rank <= 3 ? "🏆" : entry.rank}
                  </div>
                  
                  {/* Avatar */}
                  <img
                    src={entry.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.wallet_address}`}
                    alt={entry.username || "Player"}
                    className="w-10 h-10 rounded-full border-2 border-purple-500/50"
                  />
                  
                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">
                      {entry.username || `${entry.wallet_address.slice(0, 6)}...${entry.wallet_address.slice(-4)}`}
                    </div>
                    <div className="text-xs text-slate-400">
                      {entry.game_mode} • {formatTime(entry.time_seconds)}
                    </div>
                  </div>
                </div>
                
                {/* Score */}
                <div className="text-right">
                  <div className="text-xl font-bold text-purple-400">{entry.score.toLocaleString()}</div>
                  <div className="text-xs text-slate-400">points</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Close button */}
      <div className="flex justify-center mt-4">
        <button
          onClick={() => setShowLeaderboard(false)}
          className="px-6 py-2 rounded-lg border-2 border-purple-500/50 bg-slate-800 hover:bg-slate-700 font-bold text-purple-300 hover:text-purple-200 transition-all"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
```

---

## 2. My Stats Button Implementation

### Current Issue
- "My Stats" button in profile dropdown does nothing
- Needs to show comprehensive player statistics

### Required Implementation

#### Stats Data Structure

```typescript
interface ApeInPlayerStats {
  // Overall stats
  totalGames: number
  totalWins: number
  totalLosses: number
  winRate: number
  
  // Points & scores
  totalPoints: number
  averageScore: number
  bestScore: number
  
  // Time stats
  totalPlayTime: number // in seconds
  averageGameTime: number
  bestTime: number // fastest win
  
  // Streaks
  currentWinStreak: number
  bestWinStreak: number
  
  // Mode-specific stats
  gamesPerMode: {
    sandy: { played: number; won: number; lost: number }
    aida: { played: number; won: number; lost: number; bestScore: number }
    lana: { played: number; won: number; lost: number; bestScore: number }
    "en-j1n": { played: number; won: number; lost: number; bestScore: number }
    nifty: { played: number; won: number; lost: number; bestScore: number }
  }
  
  // Subtype stats
  singlePlayer: { games: number; wins: number; bestScore: number }
  pvp: { games: number; wins: number; bestScore: number }
  multiplayer: { games: number; wins: number; bestScore: number }
  
  // Errors & performance
  totalErrors: number
  averageErrorsPerGame: number
  
  // Last played
  lastPlayed?: Date
}

// Fetch stats from game sessions
async function getApeInPlayerStats(walletAddress: string): Promise<ApeInPlayerStats> {
  try {
    const { data: sessions, error } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("game_type", "ape_in")
      .eq("wallet_address", walletAddress.toLowerCase())
      .order("created_at", { ascending: false })
    
    if (error) throw error
    
    // Initialize stats
    const stats: ApeInPlayerStats = {
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      winRate: 0,
      totalPoints: 0,
      averageScore: 0,
      bestScore: 0,
      totalPlayTime: 0,
      averageGameTime: 0,
      bestTime: Infinity,
      currentWinStreak: 0,
      bestWinStreak: 0,
      gamesPerMode: {
        sandy: { played: 0, won: 0, lost: 0 },
        aida: { played: 0, won: 0, lost: 0, bestScore: 0 },
        lana: { played: 0, won: 0, lost: 0, bestScore: 0 },
        "en-j1n": { played: 0, won: 0, lost: 0, bestScore: 0 },
        nifty: { played: 0, won: 0, lost: 0, bestScore: 0 },
      },
      singlePlayer: { games: 0, wins: 0, bestScore: 0 },
      pvp: { games: 0, wins: 0, bestScore: 0 },
      multiplayer: { games: 0, wins: 0, bestScore: 0 },
      totalErrors: 0,
      averageErrorsPerGame: 0,
    }
    
    // Process sessions
    let currentStreak = 0
    const wins: boolean[] = []
    
    sessions.forEach((session) => {
      stats.totalGames++
      const isWin = session.result === "won"
      
      if (isWin) {
        stats.totalWins++
        currentStreak++
        wins.push(true)
      } else {
        stats.totalLosses++
        currentStreak = 0
        wins.push(false)
      }
      
      if (currentStreak > stats.bestWinStreak) {
        stats.bestWinStreak = currentStreak
      }
      
      if (session.points_earned) {
        stats.totalPoints += session.points_earned
      }
      
      if (session.score && session.score > stats.bestScore) {
        stats.bestScore = session.score
      }
      
      if (session.duration_seconds) {
        stats.totalPlayTime += session.duration_seconds
        if (isWin && session.duration_seconds < stats.bestTime) {
          stats.bestTime = session.duration_seconds
        }
      }
      
      if (session.errors) {
        stats.totalErrors += session.errors || 0
      }
      
      // Mode-specific stats
      const mode = (session.game_mode || "").toLowerCase()
      if (stats.gamesPerMode[mode]) {
        stats.gamesPerMode[mode].played++
        if (isWin) {
          stats.gamesPerMode[mode].won++
          if (session.score && session.score > (stats.gamesPerMode[mode].bestScore || 0)) {
            stats.gamesPerMode[mode].bestScore = session.score
          }
        } else {
          stats.gamesPerMode[mode].lost++
        }
      }
      
      // Subtype stats
      const subtype = session.game_subtype || "single_player"
      if (subtype === "single_player") {
        stats.singlePlayer.games++
        if (isWin) {
          stats.singlePlayer.wins++
          if (session.score && session.score > stats.singlePlayer.bestScore) {
            stats.singlePlayer.bestScore = session.score
          }
        }
      } else if (subtype === "pvp") {
        stats.pvp.games++
        if (isWin) {
          stats.pvp.wins++
          if (session.score && session.score > stats.pvp.bestScore) {
            stats.pvp.bestScore = session.score
          }
        }
      } else if (subtype === "multiplayer") {
        stats.multiplayer.games++
        if (isWin) {
          stats.multiplayer.wins++
          if (session.score && session.score > stats.multiplayer.bestScore) {
            stats.multiplayer.bestScore = session.score
          }
        }
      }
    })
    
    // Calculate current streak (from most recent games)
    for (let i = wins.length - 1; i >= 0; i--) {
      if (wins[i]) {
        stats.currentWinStreak++
      } else {
        break
      }
    }
    
    // Calculate averages
    stats.winRate = stats.totalGames > 0 ? Math.round((stats.totalWins / stats.totalGames) * 100) : 0
    
    // ⚠️ IMPORTANT: Calculate average score from actual game scores, not points
    // Ape In calculates scores using its own methodology - we just aggregate them
    let totalScore = 0
    let scoreCount = 0
    sessions.forEach((session) => {
      if (session.result === "won" && session.score) {
        totalScore += session.score
        scoreCount++
      }
    })
    stats.averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0
    
    stats.averageGameTime = stats.totalGames > 0 ? Math.round(stats.totalPlayTime / stats.totalGames) : 0
    stats.averageErrorsPerGame = stats.totalGames > 0 ? Math.round(stats.totalErrors / stats.totalGames * 10) / 10 : 0
    
    if (stats.bestTime === Infinity) stats.bestTime = 0
    
    // Last played
    if (sessions.length > 0) {
      stats.lastPlayed = new Date(sessions[0].created_at)
    }
    
    return stats
  } catch (error) {
    console.error("Error fetching player stats:", error)
    return getDefaultStats()
  }
}
```

#### Stats Modal UI

```typescript
const [showStats, setShowStats] = useState(false)
const [playerStats, setPlayerStats] = useState<ApeInPlayerStats | null>(null)
const [loadingStats, setLoadingStats] = useState(false)

const loadStats = async () => {
  const walletAddress = getWalletAddressFromSession() // Get from arcade session
  if (!walletAddress) return
  
  setLoadingStats(true)
  try {
    const stats = await getApeInPlayerStats(walletAddress)
    setPlayerStats(stats)
  } catch (error) {
    console.error("Error loading stats:", error)
  } finally {
    setLoadingStats(false)
  }
}

// Stats Modal UI
{showStats && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
    <div className="bg-gradient-to-b from-slate-900 to-black border-2 border-purple-500/50 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(168,85,247,0.5)]">
      <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        📊 My Statistics
      </h2>
      
      {loadingStats ? (
        <div className="text-center text-slate-400 py-12">Loading stats...</div>
      ) : playerStats ? (
        <>
          {/* Overall Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-500/30">
              <div className="text-2xl font-bold text-purple-400">{playerStats.totalGames}</div>
              <div className="text-sm text-slate-300">Total Games</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-green-500/30">
              <div className="text-2xl font-bold text-green-400">{playerStats.totalWins}</div>
              <div className="text-sm text-slate-300">Wins</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-yellow-500/30">
              <div className="text-2xl font-bold text-yellow-400">{playerStats.winRate}%</div>
              <div className="text-sm text-slate-300">Win Rate</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-pink-500/30">
              <div className="text-2xl font-bold text-pink-400">{playerStats.totalPoints.toLocaleString()}</div>
              <div className="text-sm text-slate-300">Total Points</div>
            </div>
          </div>
          
          {/* Score Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-cyan-500/30">
              <div className="text-xl font-bold text-cyan-400">{playerStats.averageScore.toLocaleString()}</div>
              <div className="text-sm text-slate-300">Average Score</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-orange-500/30">
              <div className="text-xl font-bold text-orange-400">{playerStats.bestScore.toLocaleString()}</div>
              <div className="text-sm text-slate-300">Best Score</div>
            </div>
          </div>
          
          {/* Streaks */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-red-500/30">
              <div className="text-xl font-bold text-red-400">{playerStats.currentWinStreak}</div>
              <div className="text-sm text-slate-300">Current Streak 🔥</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-pink-500/30">
              <div className="text-xl font-bold text-pink-400">{playerStats.bestWinStreak}</div>
              <div className="text-sm text-slate-300">Best Streak</div>
            </div>
          </div>
          
          {/* Mode Breakdown */}
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 text-purple-300">Mode Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(playerStats.gamesPerMode).map(([mode, stats]) => (
                mode !== "sandy" && (
                  <div key={mode} className="bg-slate-800/50 rounded-lg p-3 flex justify-between items-center border border-slate-700">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-purple-400 capitalize">{mode}</span>
                      <span className="text-sm text-slate-400">
                        {stats.won}/{stats.played} wins
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-yellow-400">{stats.bestScore.toLocaleString()}</div>
                      <div className="text-xs text-slate-400">Best Score</div>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
          
          {/* Subtype Breakdown */}
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 text-purple-300">Game Type Breakdown</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/50 rounded-lg p-3 border border-blue-500/30">
                <div className="text-sm font-bold text-blue-400">Single-Player</div>
                <div className="text-xs text-slate-300 mt-1">{playerStats.singlePlayer.wins}/{playerStats.singlePlayer.games} wins</div>
                <div className="text-xs text-yellow-400 mt-1">Best: {playerStats.singlePlayer.bestScore.toLocaleString()}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 border border-green-500/30">
                <div className="text-sm font-bold text-green-400">PvP</div>
                <div className="text-xs text-slate-300 mt-1">{playerStats.pvp.wins}/{playerStats.pvp.games} wins</div>
                <div className="text-xs text-yellow-400 mt-1">Best: {playerStats.pvp.bestScore.toLocaleString()}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 border border-purple-500/30">
                <div className="text-sm font-bold text-purple-400">Multiplayer</div>
                <div className="text-xs text-slate-300 mt-1">{playerStats.multiplayer.wins}/{playerStats.multiplayer.games} wins</div>
                <div className="text-xs text-yellow-400 mt-1">Best: {playerStats.multiplayer.bestScore.toLocaleString()}</div>
              </div>
            </div>
          </div>
          
          {/* Time Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-lg p-3 border border-indigo-500/30">
              <div className="text-sm font-bold text-indigo-400">Average Time</div>
              <div className="text-lg mt-1">{formatTime(playerStats.averageGameTime)}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-violet-500/30">
              <div className="text-sm font-bold text-violet-400">Best Time</div>
              <div className="text-lg mt-1">{playerStats.bestTime > 0 ? formatTime(playerStats.bestTime) : "--:--"}</div>
            </div>
          </div>
          
          {/* Errors */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-red-500/30 mb-6">
            <div className="text-sm font-bold text-red-400">Average Errors Per Game</div>
            <div className="text-lg mt-1">{playerStats.averageErrorsPerGame}</div>
          </div>
        </>
      ) : (
        <div className="text-center text-slate-400 py-12">No stats available</div>
      )}
      
      {/* Close button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => setShowStats(false)}
          className="px-6 py-2 rounded-lg border-2 border-purple-500/50 bg-slate-800 hover:bg-slate-700 font-bold text-purple-300 hover:text-purple-200 transition-all"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

// When "My Stats" button is clicked
const handleStatsClick = () => {
  setShowStats(true)
  loadStats()
}
```

---

## 3. Data Source Clarification

### Current: Supabase Database
- **Development**: Fetch from Supabase `game_sessions` table
- **Query**: Filter by `game_type: "ape_in"` and `game_subtype`
- **Fields**: `score`, `points_earned`, `game_mode`, `duration_seconds`, `result`, etc.

**⚠️ CRITICAL REMINDER: Use Ape In's Scores**
- The `score` field in `game_sessions` should already contain Ape In's calculated score
- When Ape In completes a game, it should save the score using Ape In's existing scoring logic
- The leaderboard/stats should **only read and display** these pre-calculated scores
- **Do NOT implement any scoring calculation** - that's Ape In's responsibility

### Future: On-Chain Leaderboard
- **Production**: Fetch from on-chain leaderboard contract (via Thirdweb developer wallets)
- **Benefits**: 
  - Permanent, verifiable data
  - Decentralized storage
  - Cannot be manipulated
- **Implementation**: Switch to on-chain when ready, with Supabase as fallback

### Hybrid Approach (Recommended)
```typescript
async function fetchLeaderboardWithFallback(subtype: string) {
  try {
    // Try on-chain first
    const onChainData = await fetchFromOnChainLeaderboard(subtype)
    if (onChainData && onChainData.length > 0) {
      return onChainData
    }
  } catch (error) {
    console.log("On-chain fetch failed, falling back to Supabase:", error)
  }
  
  // Fallback to Supabase
  return await fetchApeInLeaderboard(subtype)
}
```

---

## 4. Button Wiring

### Leaderboard Button
```typescript
// In your header/navigation component
<button
  onClick={() => {
    setShowLeaderboard(true)
    fetchLeaderboard("all") // Load overall leaderboard by default
  }}
  className="px-4 py-2 rounded-lg border border-purple-500/50 bg-slate-800 hover:bg-slate-700 font-bold text-purple-300 hover:text-purple-200 transition-all"
>
  🏆 Leaderboard
</button>
```

### My Stats Button (in profile dropdown)
```typescript
// In profile dropdown menu
<button
  onClick={() => {
    setShowStats(true)
    loadStats()
  }}
  className="w-full px-4 py-2 text-left rounded-lg hover:bg-slate-700 transition-all"
>
  📊 My Stats
</button>
```

---

## 5. Utility Functions

```typescript
// Format time helper
function formatTime(seconds: number): string {
  if (!seconds || seconds === 0) return "--:--"
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

// Format duration helper (for total play time)
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

// Get wallet address from arcade session
function getWalletAddressFromSession(): string | null {
  const session = getArcadeSession() // Your existing function
  return session?.address || null
}
```

---

## 6. Enhanced UX Features

### Loading States
- Show skeleton loaders while fetching
- Smooth transitions when data loads
- Error states with retry buttons

### Empty States
- Friendly messages when no data exists
- Call-to-action to play games
- Visual indicators (icons, illustrations)

### Animations
- Smooth modal transitions
- Entry animations for leaderboard items
- Highlight current player's rank with special styling

### Responsive Design
- Mobile-friendly modals
- Scrollable tables for small screens
- Touch-friendly buttons

### Real-time Updates (Optional)
- Refresh leaderboard when game ends
- Update stats immediately after game completion
- Show notification when rank changes

---

## Summary Checklist

### Leaderboard Implementation
- [ ] Create leaderboard modal component
- [ ] Implement 4 tabs: Overall, Single-Player, PvP, Multiplayer
- [ ] Fetch data from Supabase (initially) or on-chain (later)
- [ ] Display entries with rank, avatar, username, score, time
- [ ] Show loading and empty states
- [ ] Style with Ape In theme (purple/pink gradients)
- [ ] Make responsive for mobile

### Stats Implementation
- [ ] Create stats modal component
- [ ] Calculate comprehensive player statistics
- [ ] Display overall stats (games, wins, points, streaks)
- [ ] Show mode-specific breakdown
- [ ] Show subtype breakdown (single-player, PvP, multiplayer)
- [ ] Display time and error statistics
- [ ] Style with Ape In theme
- [ ] Make responsive for mobile

### Button Wiring
- [ ] Wire "Leaderboard" button to open leaderboard modal
- [ ] Wire "My Stats" button (in profile dropdown) to open stats modal
- [ ] Ensure buttons are visible and functional

### Data Integration
- [ ] Ensure game sessions are logged with correct `game_type: "ape_in"`
- [ ] Ensure game sessions include `game_mode` and `game_subtype`
- [ ] **Verify Ape In's existing scoring logic saves scores to `game_sessions.score`**
- [ ] Verify scores are being saved using Ape In's existing scoring methodology (not Cryptoku's)
- [ ] Test with real game data and verify scores match Ape In's calculations

### On-Chain Integration (Future)
- [ ] Prepare for on-chain leaderboard integration
- [ ] Implement fallback to Supabase if on-chain fails
- [ ] Update fetch functions to use on-chain data when available

---

## Example: Cryptoku Pattern Reference

Cryptoku implements leaderboard and stats similarly. Use it as a reference for **UI structure only**:
- **Location**: `features/games/cryptoku/cryptokugame.tsx`
- **Leaderboard**: Lines 1387-2069 (fetchLeaderboard function and modal)
- **Stats**: Lines 2071-2185 (showStatsModal and stats calculation)

**⚠️ IMPORTANT: UI Only, Not Scoring Logic**
- Use Cryptoku's UI/UX pattern as a reference for how to structure modals and display data
- **Do NOT copy Cryptoku's scoring calculations** - Ape In has its own scoring system
- Adapt the UI structure for Ape In with:
  - Ape In-specific game modes
  - Multiple leaderboard tabs/columns
  - Enhanced stats breakdown
- But always use Ape In's existing scores that are already calculated and stored

---

## Notes

1. **Data Source Priority**: Start with Supabase, transition to on-chain when ready
2. **Performance**: Cache leaderboard data, refresh periodically
3. **Privacy**: Only show public stats in leaderboard, detailed stats in "My Stats"
4. **UX**: Make modals dismissible with ESC key, click outside, or close button
5. **Accessibility**: Ensure keyboard navigation works, proper ARIA labels

### ⚠️ CRITICAL: Scoring System Reminder

**Ape In must use its OWN scoring methodology:**
- Ape In's scoring is already implemented in your game code - **do not change it**
- When saving game sessions, ensure you're saving the score that Ape In calculates
- Leaderboard and stats should **only read and display** existing scores - never recalculate
- The examples in this document are for **displaying data** - all scoring logic stays in Ape In

**What Ape In should do:**
1. Calculate score using Ape In's existing scoring system (already implemented)
2. Save score to `game_sessions.score` when game ends
3. Leaderboard/Stats buttons should fetch and display these pre-calculated scores

**What NOT to do:**
- Do NOT implement Cryptoku's scoring formulas
- Do NOT recalculate scores in leaderboard/stats code
- Do NOT modify Ape In's existing scoring logic

