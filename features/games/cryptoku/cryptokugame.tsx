"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react"
import { useAccount, useChainId, useSendTransaction, useSwitchChain } from "wagmi"
import { ensureApeChain } from "@/lib/wallet-chain"

import SplashScreen from "@/features/games/cryptoku/components/SplashScreen"
import RabbitAvatar, { RABBIT_COLORS } from "@/features/games/cryptoku/components/RabbitAvatar"
import {
  completeGameSession,
  formatTime,
  forfeitGameSession,
  getPlayerStats,
  startGameSession,
  type Difficulty,
  type GameSession,
} from "./components/logic/playerStats"
import { getRewardForDifficulty } from "./components/logic/tokenRewards"
import { mockVerifySudoku, verifySudokuWithZkVerify } from "./components/logic/zkverify"

export interface CryptokuGameProps {
  playerAddress: string | null // Hub identity - required
  profileUsername?: string // Hub identity - optional
  profileAvatarUrl?: string // Hub identity - optional
  onGameStart?: () => void
  onGameEnd?: (result: {
    score: number
    metadata?: any
  }) => void
  onClose?: () => void // Callback to close game and return to menu/hub
}

export interface CryptokuGameHandle {
  handleGameExit: () => boolean // Returns true if forfeit confirmation is shown, false otherwise
}

type Board = number[][]
type NotesBoard = Set<number>[][]

const TOKENS = [
  {
    id: 1,
    name: "ApeCoin",
    color: "#2D6AFF",
    img: "/images/assets/cryptoku-tokens/ApeCoin.png",
  },
  {
    id: 2,
    name: "Nifty",
    color: "#20B2AA",
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Nifty-DjEf0c7MQWc9AOsoD5nME54Gnkk5ij.png",
  },
  {
    id: 3,
    name: "Ethereum",
    color: "#8A92B2",
    img: "https://upload.wikimedia.org/wikipedia/commons/6/6f/Ethereum-icon-purple.svg",
  },
  {
    id: 4,
    name: "CxRH",
    color: "#C0C0C0",
    img: "/images/assets/cryptoku-tokens/CxRH-Token.png",
  },
  {
    id: 5,
    name: "Bullish",
    color: "#35ff8a",
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Bullish%20Token-TONuTJTOxJLYOy9xZmNInQ3bnBFj3E.png",
  },
  {
    id: 6,
    name: "Bearish",
    color: "#ff3b6a",
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Bearish%20Token-W7qm9LCPPvMOHbaJGPueclHuGgS6Oj.png",
  },
  {
    id: 7,
    name: "Historacle",
    color: "#ffd35c",
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Historacle%20Token-YFWLKZaAkXXAl9IZBmEDgfhUcW0k4p.png",
  },
  {
    id: 8,
    name: "Bitcoin",
    color: "#FF9500",
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Bitcoin-buEOkR9laapreTAisasidwsvH2xEEJ.png",
  },
  {
    id: 9,
    name: "Reaction",
    color: "#FF00FF",
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Reaction%20Token-vurHbES3b7BmXnMxBwn1ckgf4t12CD.png",
  },
] as const

const DIFF: Record<Difficulty, number> = {
  noob: 40,
  degen: 40, // Changed to 40 clues (same as Noob) for easier testing
  ape: 32,
}

const TUTORIAL_SLIDES = [
  {
    emoji: "🎮",
    title: "Welcome to Cryptoku!",
    content:
      "Cryptoku is Sudoku reimagined with crypto tokens. This tutorial will show you everything you need to know to play.",
    details: [],
  },
  {
    emoji: "🎯",
    title: "The Game Board",
    content: "Your 9×9 grid where you'll place tokens.",
    details: [
      "• Navy cells are presets and cannot be changed",
      "• Empty cells are where you place tokens",
      "• Click any empty cell to select it",
      "• Selected cells show a cyan border",
    ],
  },
  {
    emoji: "🪙",
    title: "Nine Crypto Tokens",
    content: "Each token appears exactly 9 times on a solved board.",
    details: [
      "• ApeCoin, Nifty, Ethereum, CxRH, Bullish, Bearish, Historacle, Bitcoin, Reaction",
      "• Select a cell, then click a token to place it",
      "• Each token can only be used 9 times total",
    ],
  },
  {
    emoji: "↔️",
    title: "Rule 1: Rows",
    content: "Each horizontal row must contain all 9 different tokens.",
    details: [
      "• 9 rows total",
      "• No duplicates allowed in any row",
      "• When complete, the row glows to celebrate",
    ],
  },
  {
    emoji: "↕️",
    title: "Rule 2: Columns",
    content: "Each vertical column must contain all 9 different tokens.",
    details: [
      "• 9 columns total",
      "• No duplicates allowed in any column",
      "• Use columns to cross-check possibilities",
    ],
  },
  {
    emoji: "📦",
    title: "Rule 3: 3×3 Boxes",
    content: "Each 3×3 box must contain all 9 different tokens.",
    details: [
      "• 9 boxes outlined in cyan",
      "• No duplicates allowed in a box",
      "• Boxes are the key to spotting forced moves",
    ],
  },
  {
    emoji: "📝",
    title: "Notes Mode",
    content: "Track possibilities with pencil marks.",
    details: [
      "• Toggle Notes: ON to enter notes mode",
      "• Click a token to add or remove it from the cell's candidates",
      "• Notes automatically clear when you place a real token",
    ],
  },
  {
    emoji: "💡",
    title: "Hints",
    content: "Stuck? Use hints to reveal a correct token.",
    details: [
      "• Each game starts with 3 free hints",
      "• After that, hints cost 0.10 $APE each (connected players only)",
      "• A 30-second cooldown prevents hint spamming",
    ],
  },
] as const

// Utility helpers ------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function deepCloneNotes(board: NotesBoard): NotesBoard {
  return board.map((row) => row.map((cell) => new Set(cell)))
}

function emptyBoard(): Board {
  return Array.from({ length: 9 }, () => Array(9).fill(0))
}

function findEmpty(board: Board): [number, number] | null {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) return [r, c]
    }
  }
  return null
}

function getBoxIndex(r: number, c: number): number {
  return Math.floor(r / 3) * 3 + Math.floor(c / 3)
}

function getBoxStartCoords(boxIndex: number): [number, number] {
  const boxRow = Math.floor(boxIndex / 3)
  const boxCol = boxIndex % 3
  return [boxRow * 3, boxCol * 3]
}

function countPresetsInBox(board: Board, boxIndex: number): number {
  const [startR, startC] = getBoxStartCoords(boxIndex)
  let count = 0
  for (let r = startR; r < startR + 3; r++) {
    for (let c = startC; c < startC + 3; c++) {
      if (board[r][c] !== 0) count++
    }
  }
  return count
}

function getBoxPresetCounts(board: Board): number[] {
  const counts = Array(9).fill(0)
  for (let boxIndex = 0; boxIndex < 9; boxIndex++) {
    counts[boxIndex] = countPresetsInBox(board, boxIndex)
  }
  return counts
}

// Ensure per-box preset constraints by difficulty, matching original implementation
function checkBoxConstraints(board: Board, difficulty: Difficulty): boolean {
  const boxCounts = getBoxPresetCounts(board)

  switch (difficulty) {
    case "noob":
      // Each box must have ≥2 presets
      return boxCounts.every((count) => count >= 2)

    case "degen":
      // Each box must have ≥2 presets (same as Noob for easier testing)
      return boxCounts.every((count) => count >= 2)

    case "ape": {
      // Each box must have ≥1 preset except exactly one box with 0
      const emptyBoxes = boxCounts.filter((count) => count === 0).length
      const validBoxes = boxCounts.filter((count) => count >= 1).length
      return emptyBoxes === 1 && validBoxes === 8
    }

    default:
      return true
  }
}

function isSafe(board: Board, r: number, c: number, val: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (board[r][i] === val || board[i][c] === val) return false
  }
  const br = Math.floor(r / 3) * 3
  const bc = Math.floor(c / 3) * 3
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[br + i][bc + j] === val) return false
    }
  }
  return true
}

function solve(board: Board): boolean {
  const pos = findEmpty(board)
  if (!pos) return true
  const [r, c] = pos
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
  for (const v of nums) {
    if (isSafe(board, r, c, v)) {
      board[r][c] = v
      if (solve(board)) return true
      board[r][c] = 0
    }
  }
  return false
}

function generateCompleted(): Board {
  const b = emptyBoard()
  const seed = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
  b[0] = seed.slice()
  solve(b)
  return b
}

function countSolutions(board: Board): number {
  let count = 0
  let nodesExplored = 0
  const MAX_NODES = 10000

  function backtrack(b: Board) {
    if (count > 1 || nodesExplored > MAX_NODES) return
    nodesExplored++
    const pos = findEmpty(b)
    if (!pos) {
      count++
      return
    }
    const [r, c] = pos
    for (let v = 1; v <= 9; v++) {
      if (isSafe(b, r, c, v)) {
        b[r][c] = v
        backtrack(b)
        b[r][c] = 0
        if (count > 1) return
      }
    }
  }

  backtrack(deepClone(board))
  return count
}

function digHoles(full: Board, clues: number, difficulty: Difficulty = "noob"): Board {
  const puzzle = deepClone(full)
  const targetToRemove = 81 - clues // How many cells we need to remove to get exactly 'clues' presets

  // Phase 1: Remove cells while maintaining box constraints
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => i))
  let removed = 0
  let attempts = 0
  const maxAttempts = 200 // Reduced from 500 to prevent freezing

  // For APE difficulty, we need to ensure exactly one box becomes empty
  const targetEmptyBox = difficulty === "ape" ? Math.floor(Math.random() * 9) : -1

  for (const idx of cells) {
    if (removed >= targetToRemove) break // Stop when we've removed enough cells
    if (attempts >= maxAttempts) break

    const r = Math.floor(idx / 9)
    const c = idx % 9
    const boxIndex = getBoxIndex(r, c)
    const backup = puzzle[r][c]

    // Try removing this cell
    puzzle[r][c] = 0

    // Check if removal violates constraints
    let violatesConstraints = false

    // Check unique solution constraint
    if (countSolutions(puzzle) !== 1) {
      violatesConstraints = true
    }

    // Check box constraints for current difficulty
    if (!violatesConstraints) {
      const boxCounts = getBoxPresetCounts(puzzle)

      switch (difficulty) {
        case "noob":
          // Each box must have ≥2 presets
          if (boxCounts.some((count) => count < 2)) {
            violatesConstraints = true
          }
          break

        case "degen":
          // Each box must have ≥2 presets (same as Noob for easier testing)
          if (boxCounts.some((count) => count < 2)) {
            violatesConstraints = true
          }
          break

        case "ape": {
          // Exactly one box should be empty, others ≥1
          const emptyBoxes = boxCounts.filter((count) => count === 0).length
          if (emptyBoxes > 1) {
            violatesConstraints = true
          }
          // If we're targeting a specific box to be empty, only allow removal from that box once others are satisfied
          if (targetEmptyBox !== -1 && emptyBoxes === 0 && boxIndex !== targetEmptyBox && boxCounts[boxIndex] === 1) {
            violatesConstraints = true
          }
          break
        }
      }
    }

    if (violatesConstraints) {
      puzzle[r][c] = backup
      attempts++
    } else {
      removed++
      attempts = 0
    }
  }

  // Phase 2: Additional removal passes to reach exact target clue count
  if (removed < targetToRemove) {
    const maxPasses = 5

    for (let pass = 0; pass < maxPasses && removed < targetToRemove; pass++) {
      const remainingCells: [number, number][] = []
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (puzzle[r][c] !== 0) {
            remainingCells.push([r, c])
          }
        }
      }

      shuffle(remainingCells)
      let passAttempts = 0
      const maxPassAttempts = 100 // Reduced from 200 to prevent freezing

      for (const [r, c] of remainingCells) {
        if (removed >= targetToRemove) break // Stop when target reached
        if (passAttempts >= maxPassAttempts) break

        const backup = puzzle[r][c]
        puzzle[r][c] = 0

        // Check constraints as before
        let violatesConstraints = false

        if (countSolutions(puzzle) !== 1) {
          violatesConstraints = true
        }

        if (!violatesConstraints && !checkBoxConstraints(puzzle, difficulty)) {
          violatesConstraints = true
        }

        if (violatesConstraints) {
          puzzle[r][c] = backup
          passAttempts++
        } else {
          removed++
        }
      }
    }
  }

  // Phase 3: Final verification and exact count enforcement
  const actualClues = 81 - removed
  const finalBoxCounts = getBoxPresetCounts(puzzle)
  // eslint-disable-next-line no-console
  console.log(
    `Generated ${difficulty} puzzle with ${actualClues} clues (target: ${clues}). Box preset counts:`,
    finalBoxCounts,
  )

  // If we didn't hit the exact target, try retry mechanism (limit retries to prevent freezing)
  if (actualClues !== clues || !checkBoxConstraints(puzzle, difficulty)) {
    // eslint-disable-next-line no-console
    console.warn(`Clue count mismatch or box constraints not satisfied. Retrying...`)
    return digHolesWithRetry(full, clues, difficulty, 1) // Reduced from 2 to 1 retry
  }

  return puzzle
}

// Fallback function that retries puzzle generation if constraints aren't met
function digHolesWithRetry(
  full: Board,
  clues: number,
  difficulty: Difficulty,
  maxRetries: number = 1,
): Board {
  for (let retry = 0; retry < maxRetries; retry++) {
    const result = digHoles(full, clues, difficulty)
    if (checkBoxConstraints(result, difficulty)) {
      return result
    }
    // eslint-disable-next-line no-console
    console.log(`Retry ${retry + 1} for ${difficulty} puzzle generation...`)
  }

  // If all retries fail, return a simpler version that at least has unique solution
  // eslint-disable-next-line no-console
  console.warn(
    `Failed to generate ${difficulty} puzzle with proper box constraints after ${maxRetries} retries. Using fallback.`,
  )
  return digHolesSimple(full, clues)
}

// Simple fallback that just ensures unique solution (original logic)
function digHolesSimple(full: Board, clues: number): Board {
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => i))
  const puzzle = deepClone(full)
  let removed = 0
  let attempts = 0
  const maxAttempts = 200

  for (const idx of cells) {
    if (81 - removed <= clues) break
    if (attempts >= maxAttempts) break

    const r = Math.floor(idx / 9)
    const c = idx % 9
    const backup = puzzle[r][c]
    puzzle[r][c] = 0

    if (countSolutions(puzzle) !== 1) {
      puzzle[r][c] = backup
      attempts++
    } else {
      removed++
      attempts = 0
    }
  }

  return puzzle
}

// Client-side scoring removed - all scoring is now server-side via API

// Main game component --------------------------------------------------------

export const CryptokuGame = forwardRef<CryptokuGameHandle, CryptokuGameProps>(({
  playerAddress,
  profileUsername,
  profileAvatarUrl,
  onGameStart,
  onGameEnd,
  onClose,
}, ref) => {
  // Wagmi hooks for wallet operations
  const { address: wagmiAddress, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const { sendTransactionAsync, isPending: isSendingTransaction } = useSendTransaction()

  const APE_CHAIN_ID = 33139 // ApeChain mainnet
  const PENDING_HINT_PURCHASE_KEY = "cryptoku:pendingHintPurchase"

  type PendingHintPurchase = {
    address: string
    intentId: string
    txHash: `0x${string}`
  }
  const [solutionBoard, setSolutionBoard] = useState<Board>(() => emptyBoard())
  const [puzzleBoard, setPuzzleBoard] = useState<Board>(() => emptyBoard())
  const [userBoard, setUserBoard] = useState<Board>(() => emptyBoard())
  const [givenMask, setGivenMask] = useState<boolean[][]>(() =>
    Array.from({ length: 9 }, () => Array(9).fill(false)),
  )
  const [notes, setNotes] = useState<NotesBoard>(() =>
    Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>())),
  )
  const [notesMode, setNotesMode] = useState(false)
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>("noob")
  const [errors, setErrors] = useState(0)
  const [hintBalance, setHintBalance] = useState(3)
  const [gamesUntilNextFreeHint, setGamesUntilNextFreeHint] = useState(0)
  const [hintCooldownTime, setHintCooldownTime] = useState(0)
  const [hintsUsedInGame, setHintsUsedInGame] = useState(0)
  const [isPurchasingHints, setIsPurchasingHints] = useState(false)
  const [runId, setRunId] = useState<string | null>(null)
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null)
  const [gameEndTime, setGameEndTime] = useState<Date | null>(null)
  const [currentScore, setCurrentScore] = useState<number | null>(null)
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null)
  const [gameHasStarted, setGameHasStarted] = useState(false)
  const [isGamePrepared, setIsGamePrepared] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null)
  const [activeElapsedMs, setActiveElapsedMs] = useState(0)
  const [lastResumeAtMs, setLastResumeAtMs] = useState<number | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationAttempted, setVerificationAttempted] = useState(false)
  const [verificationProofId, setVerificationProofId] = useState<string | null>(null)
  const [showVictory, setShowVictory] = useState(false)
  const [pointsEarned, setPointsEarned] = useState<number | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardEntries, setLeaderboardEntries] = useState<Array<{
    rank: number
    runId: string
    address: string
    mode: string
    score: number
    timeSeconds: number
    hintsUsed: number
    errors: number
    timestamp: number
  }>>([])
  const [leaderboardMode, setLeaderboardMode] = useState<"ALL" | "DEGEN" | "APE">("ALL")
  const [showStatsModal, setShowStatsModal] = useState(false)

  const [toast, setToast] = useState("")
  const [timerTicks, setTimerTicks] = useState(0)
  const [tokenUsage, setTokenUsage] = useState<Record<number, number>>(() => {
    const usage: Record<number, number> = {}
    for (let i = 1; i <= 9; i++) usage[i] = 0
    return usage
  })
  const [completedTokens, setCompletedTokens] = useState<Set<number>>(new Set())
  const [showSplash, setShowSplash] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialSlide, setTutorialSlide] = useState(0)
  const [highlightClear, setHighlightClear] = useState(false)
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set())
  const [showConfetti, setShowConfetti] = useState(false)
  const [hintedCell, setHintedCell] = useState<[number, number] | null>(null)
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false)

  const animatedTokensRef = useRef<Set<number>>(new Set())
  const completedSectionsRef = useRef<Set<string>>(new Set())
  const confirmingRef = useRef(false) // Prevent parallel confirm calls

  // Load hints balance from API (only on mount or when playerAddress changes)
  useEffect(() => {
    if (!playerAddress) return

    const fetchHintsBalance = async () => {
      try {
        const response = await fetch(`/api/cryptoku/hints/balance?address=${encodeURIComponent(playerAddress)}`)
        if (response.ok) {
          const data = await response.json()
          // Validate and set balance - don't allow it to increase unexpectedly
          if (data.hintBalance !== undefined && typeof data.hintBalance === 'number' && data.hintBalance >= 0) {
            setHintBalance(data.hintBalance)
          }
          if (data.gamesUntilNextFreeHint !== undefined) {
            setGamesUntilNextFreeHint(data.gamesUntilNextFreeHint)
          }
        }
      } catch (error) {
        console.error("Error fetching hints balance:", error)
        // Don't reset balance on error - keep current state
      }
    }

    fetchHintsBalance()
  }, [playerAddress]) // Only fetch when playerAddress changes, not on every render


  // Timer ticking
  useEffect(() => {
    if (!gameStartTime || showVictory || isPaused || gameEndTime) return
    const interval = setInterval(() => {
      setTimerTicks((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [gameStartTime, showVictory, isPaused, gameEndTime])

  // Hint cooldown ticking
  useEffect(() => {
    if (hintCooldownTime <= 0) return
    const interval = setInterval(() => {
      setHintCooldownTime((prev) => {
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [hintCooldownTime])

  // Stop active timer: freeze accumulator when game ends
  const stopActiveTimer = useCallback((atMs?: number) => {
    const now = atMs ?? Date.now()
    // If currently running, lock in elapsed time up to now
    if (!isPaused && lastResumeAtMs != null) {
      setActiveElapsedMs(prev => prev + (now - lastResumeAtMs))
    }
    setLastResumeAtMs(null) // critical: prevents further ticking
  }, [isPaused, lastResumeAtMs])

  // Accumulator-based timer: tracks only active (non-paused) elapsed time
  const getActiveElapsedMs = useCallback(() => {
    let total = activeElapsedMs
    // Guard: don't tick if game has ended
    if ((showVictory || gameEndTime) || isPaused || lastResumeAtMs == null) {
      return total
    }
    // Add running time only if game is active and not paused
    if (!isPaused && lastResumeAtMs != null) {
      total += Date.now() - lastResumeAtMs
    }
    return total
  }, [activeElapsedMs, isPaused, lastResumeAtMs, showVictory, gameEndTime])

  const getCurrentGameTimeSeconds = useCallback(() => {
    return Math.floor(getActiveElapsedMs() / 1000)
  }, [getActiveElapsedMs])

  // Legacy function name for display purposes - now uses accumulator
  const getCurrentGameTime = useCallback(() => {
    return getCurrentGameTimeSeconds()
  }, [getCurrentGameTimeSeconds])

  const showToastMessage = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(""), 1800)
  }, [])

  // Recovery effect: auto-confirm pending purchases on mount
  useEffect(() => {
    if (!playerAddress) return

    const maybeRecover = async () => {
      try {
        const raw = localStorage.getItem(PENDING_HINT_PURCHASE_KEY)
        if (!raw) return

        const pending: PendingHintPurchase = JSON.parse(raw)
        if (!pending?.address || !pending?.intentId || !pending?.txHash) {
          localStorage.removeItem(PENDING_HINT_PURCHASE_KEY)
          return
        }

        // Only recover for the currently active player
        if (pending.address.toLowerCase() !== playerAddress.toLowerCase()) {
          return
        }

        // Prevent parallel confirmations
        if (confirmingRef.current) return
        confirmingRef.current = true

        console.log("[PurchaseHint] Recovering pending purchase:", pending)

        // Try confirm
        const confirmResponse = await fetch("/api/cryptoku/hints/confirm-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pending),
        })

        if (!confirmResponse.ok) {
          // Leave it in localStorage so the user can retry later
          console.log("[PurchaseHint] Recovery failed, keeping in localStorage")
          return
        }

        const confirmData = await confirmResponse.json()
        if (confirmData?.success && typeof confirmData?.hintBalance === "number") {
          setHintBalance(confirmData.hintBalance)
          localStorage.removeItem(PENDING_HINT_PURCHASE_KEY)
          showToastMessage("✅ Purchase finalized. Hints added.")
          console.log("[PurchaseHint] Recovery successful, hints credited")
        }
      } catch (e) {
        // Don't spam users with recovery errors
        console.error("[PurchaseHint] Recovery failed:", e)
      } finally {
        confirmingRef.current = false
      }
    }

    maybeRecover()
  }, [playerAddress, showToastMessage])

  // Handle game exit/forfeit confirmation
  const handleGameExit = useCallback(() => {
    // If game is in progress, show forfeit confirmation
    if (gameHasStarted && currentSession && currentSession.status === "in-progress" && !showVictory && !showWelcome) {
      setShowForfeitConfirm(true)
      return true // Return true to indicate forfeit confirmation is showing
    } else {
      // No active game, just close
      onClose?.()
      return false
    }
  }, [gameHasStarted, currentSession, showVictory, showWelcome, onClose])

  // Expose handleGameExit via ref for parent component
  useImperativeHandle(ref, () => ({
    handleGameExit,
  }), [handleGameExit])

  // Confirm forfeit - actually forfeit the game
  const confirmForfeit = useCallback(() => {
    if (currentSession && currentSession.status === "in-progress" && gameHasStarted && playerAddress) {
      // Stop the timer immediately when forfeiting
      stopActiveTimer()
      
      const timeInSeconds = getCurrentGameTimeSeconds()
      
      // Forfeit the session
      forfeitGameSession(currentSession.id, errors, hintsUsedInGame)

      // Submit forfeit to API (won't be logged to leaderboard)
      fetch("/api/cryptoku/submit-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerAddress,
          mode: currentDifficulty.toUpperCase(),
          runId: runId || `run_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
          timeSeconds: timeInSeconds,
          hintsUsed: hintsUsedInGame,
          errors,
          completed: false,
          forfeited: true,
        }),
      }).catch(console.error)

      // Call onGameEnd with forfeit result
      onGameEnd?.({
        score: 0,
        metadata: {
          outcome: "forfeit",
          difficulty: currentDifficulty,
          timeInSeconds,
          errors,
          hintsUsed: hintsUsedInGame,
          points: 0,
        },
      })

      // Reset game state and return to menu
      setShowForfeitConfirm(false)
      setShowWelcome(true)
      setShowSplash(false)
      setGameHasStarted(false)
      setIsGamePrepared(false)
      setCurrentSession(null)
      setCurrentScore(null)
      setRunId(null)
      setGameStartTime(null)
      setErrors(0)
      setHintsUsedInGame(0)
    } else {
      // No active game, just close
      onClose?.()
    }
  }, [currentSession, gameHasStarted, playerAddress, errors, hintsUsedInGame, getCurrentGameTimeSeconds, stopActiveTimer, currentDifficulty, runId, onGameEnd, onClose])

  // Cancel forfeit - return to game
  const cancelForfeit = useCallback(() => {
    setShowForfeitConfirm(false)
  }, [])

  // Listen for ESC key to trigger forfeit confirmation if game is in progress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && gameHasStarted && currentSession && currentSession.status === "in-progress" && !showVictory && !showWelcome && !showForfeitConfirm) {
        e.preventDefault()
        handleGameExit()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [gameHasStarted, currentSession, showVictory, showWelcome, showForfeitConfirm, handleGameExit])

  // Expose handleGameExit via window event or prop - simpler approach
  // Instead, we'll have parent call a prop callback
  // For now, handle it when onClose is passed as a callback

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false)
    setShowWelcome(true)
  }, [])

  const startNewGame = useCallback(
    (diffKey: Difficulty) => {
      // If there is an in-progress session, treat this as a forfeit
      if (currentSession && currentSession.status === "in-progress" && gameHasStarted && playerAddress) {
        forfeitGameSession(currentSession.id, errors, hintsUsedInGame)

        // Stop the timer immediately when forfeiting
        stopActiveTimer()
        
        const timeInSeconds = getCurrentGameTimeSeconds()

        // Submit forfeit to API (won't be logged to leaderboard)
        fetch("/api/cryptoku/submit-result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerAddress,
            mode: currentDifficulty.toUpperCase(),
            runId: runId || `run_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
            timeSeconds: timeInSeconds,
            hintsUsed: hintsUsedInGame,
            errors,
            completed: false,
            forfeited: true,
          }),
        }).catch(console.error)

        onGameEnd?.({
          score: 0,
          metadata: {
            outcome: "forfeit",
            difficulty: currentDifficulty,
            timeInSeconds,
            errors,
            hintsUsed: hintsUsedInGame,
          },
        })
      }

      // Create new runId
      const newRunId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
      setRunId(newRunId)

      setCurrentDifficulty(diffKey)
      const newSolution = generateCompleted()
      const newPuzzle = digHoles(newSolution, DIFF[diffKey], diffKey)
      const newUser = deepClone(newPuzzle)
      const newGiven = newPuzzle.map((row) => row.map((v) => v !== 0))

      setSolutionBoard(newSolution)
      setPuzzleBoard(newPuzzle)
      setUserBoard(newUser)
      setGivenMask(newGiven)
      setNotes(
        Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>())),
      )
      setErrors(0)
      setSelected(null)
      setShowVictory(false)
      setGameStartTime(null)
      setGameEndTime(null)
      setCurrentScore(null)
      setPointsEarned(null)
      setHintCooldownTime(0)
      setHintsUsedInGame(0)
      setVerificationProofId(null)
      setVerificationAttempted(false)
      setIsVerifying(false)
      setGameHasStarted(false)
      setIsGamePrepared(true)
      setIsPaused(false)
      setPauseStartTime(null)
      setTimerTicks(0)
      setActiveElapsedMs(0)
      setLastResumeAtMs(null)
      animatedTokensRef.current = new Set()
      setCompletedTokens(new Set())
      setCompletedSections(new Set())
      completedSectionsRef.current = new Set()

      setCurrentSession(null)
      setShowWelcome(false)
    },
    [
      currentSession,
      gameHasStarted,
      errors,
      hintsUsedInGame,
      getCurrentGameTimeSeconds,
      stopActiveTimer,
      onGameEnd,
      currentDifficulty,
      runId,
      playerAddress,
    ],
  )

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

    // Initialize accumulator-based timer
    setActiveElapsedMs(0)
    setLastResumeAtMs(Date.now())

    const session = startGameSession(currentDifficulty)
    setCurrentSession(session)

    setGameHasStarted(true)
    setIsGamePrepared(false)
    onGameStart?.()
  }, [currentDifficulty, gameHasStarted, isGamePrepared, onGameStart])

  const togglePause = useCallback(() => {
    // Hard guard: don't allow pause/resume after game has ended
    if (!gameHasStarted || showVictory || gameEndTime) return

    const now = Date.now()

    if (isPaused) {
      // Resume: record resume time
      setIsPaused(false)
      setPauseStartTime(null)
      setLastResumeAtMs(now)
    } else {
      // Pause: accumulate active time up to now
      if (lastResumeAtMs != null) {
        setActiveElapsedMs(prev => prev + (now - lastResumeAtMs))
      }
      setIsPaused(true)
      setPauseStartTime(new Date())
      setLastResumeAtMs(null)
    }
  }, [gameHasStarted, showVictory, gameEndTime, isPaused, lastResumeAtMs])

  const placeValue = useCallback(
    (v: number) => {
      if (!gameHasStarted) {
        showToastMessage("Press Start Game to begin")
        return
      }
      if (isPaused) {
        showToastMessage("Game is paused")
        return
      }
      if (!selected) {
        showToastMessage("Select a cell")
        return
      }
      const [r, c] = selected
      if (givenMask[r][c]) {
        showToastMessage("Preset cell")
        return
      }

      if (notesMode) {
        if (userBoard[r][c] !== 0) {
          showToastMessage("Clear cell first")
          return
        }
        setNotes((prev) => {
          const newNotes = deepCloneNotes(prev)
          if (newNotes[r][c].has(v)) newNotes[r][c].delete(v)
          else newNotes[r][c].add(v)
          return newNotes
        })
        return
      }

      setUserBoard((prev) => {
        const newBoard = deepClone(prev)
        newBoard[r][c] = v
        return newBoard
      })

      setNotes((prev) => {
        const newNotes = deepCloneNotes(prev)
        newNotes[r][c].clear()
        for (let i = 0; i < 9; i++) {
          newNotes[r][i].delete(v)
          newNotes[i][c].delete(v)
        }
        const br = Math.floor(r / 3) * 3
        const bc = Math.floor(c / 3) * 3
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            newNotes[br + i][bc + j].delete(v)
          }
        }
        return newNotes
      })

      if (solutionBoard[r][c] !== v) {
        setErrors((prev) => prev + 1)
        setHighlightClear(true)
      }
    },
    [selected, givenMask, notesMode, userBoard, showToastMessage, isPaused, solutionBoard, gameHasStarted],
  )

  const eraseCell = useCallback(() => {
    if (!gameHasStarted) return
    if (!selected) return
    const [r, c] = selected
    if (givenMask[r][c]) return

    setUserBoard((prev) => {
      const newBoard = deepClone(prev)
      newBoard[r][c] = 0
      return newBoard
    })
    setNotes((prev) => {
      const newNotes = deepCloneNotes(prev)
      newNotes[r][c].clear()
      return newNotes
    })
  }, [selected, givenMask])

  const doHint = useCallback(async () => {
    if (!gameHasStarted) {
      showToastMessage("Press Start Game to begin")
      return
    }
    if (hintCooldownTime > 0) {
      showToastMessage(`Hint cooling down... ${hintCooldownTime}s remaining`)
      return
    }
    if (hintBalance <= 0) {
      showToastMessage("No hints remaining. Purchase more hints to continue.")
      return
    }
    if (!playerAddress) {
      showToastMessage("Player address required")
      return
    }

    const empties: [number, number][] = []
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (userBoard[r][c] === 0) empties.push([r, c])
      }
    }

    if (!empties.length) {
      showToastMessage("Board is full")
      return
    }

    // Use hint via API
    try {
      const response = await fetch("/api/cryptoku/hints/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: playerAddress }),
      })

      if (!response.ok) {
        const data = await response.json()
        showToastMessage(data.error || "No hints remaining")
        return
      }

      const data = await response.json()
      
      // Validate the API response - ensure balance is correctly decremented
      const newBalance = data.hintBalance !== undefined ? data.hintBalance : hintBalance - 1
      if (newBalance < 0) {
        console.error("Invalid hint balance from API:", newBalance)
        showToastMessage("Error: Invalid hint balance")
        return
      }
      
      setHintBalance(Math.max(0, newBalance))

      // Apply hint to board
      const [r, c] = empties[Math.floor(Math.random() * empties.length)]
      setUserBoard((prev) => {
        const newBoard = deepClone(prev)
        newBoard[r][c] = solutionBoard[r][c]
        return newBoard
      })
      setNotes((prev) => {
        const newNotes = deepCloneNotes(prev)
        newNotes[r][c].clear()
        return newNotes
      })
      setHintCooldownTime(30)
      setHintsUsedInGame((prev) => prev + 1)
      
      // Set hinted cell for green pulse animation (3 seconds)
      setHintedCell([r, c])
      setTimeout(() => {
        setHintedCell(null)
      }, 3000)
    } catch (error) {
      console.error("Error using hint:", error)
      showToastMessage("Failed to use hint")
    }
  }, [gameHasStarted, hintCooldownTime, hintBalance, userBoard, solutionBoard, playerAddress, showToastMessage])

  const purchaseHint = useCallback(async () => {
    if (!playerAddress) return showToastMessage("Player address required")

    if (!isConnected || !wagmiAddress) return showToastMessage("Please connect your wallet first")

    if (wagmiAddress.toLowerCase() !== playerAddress.toLowerCase()) {
      return showToastMessage("Wallet address mismatch. Please reconnect your wallet.")
    }

    if (isPurchasingHints) return
    setIsPurchasingHints(true)

    try {
      // 1) Create intent
      const intentResponse = await fetch("/api/cryptoku/hints/purchase-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: playerAddress }),
      })

      if (!intentResponse.ok) {
        const data = await intentResponse.json().catch(() => ({}))
        throw new Error(data?.error || "Failed to create purchase intent")
      }

      const intentData = await intentResponse.json()

      if (!intentData?.intentId || !intentData?.recipient || !intentData?.priceWei) {
        throw new Error("Invalid purchase intent response")
      }

      console.log("[PurchaseHint] Intent created:", {
        intentId: intentData.intentId,
        recipient: intentData.recipient,
        priceWei: intentData.priceWei,
      })

      // 2) Ensure ApeChain
      if (chainId !== APE_CHAIN_ID) {
        try {
          if (switchChainAsync) {
            await switchChainAsync({ chainId: APE_CHAIN_ID })
          } else {
            await ensureApeChain()
          }
          // Give providers a moment to settle (some wallets lag after switch)
          await new Promise((r) => setTimeout(r, 750))
        } catch (switchError: any) {
          if (switchError?.code === 4001 || String(switchError?.message || "").toLowerCase().includes("reject")) {
            throw new Error("Chain switch was rejected. Please switch to ApeChain and try again.")
          }
          throw new Error(switchError?.message || "Failed to switch to ApeChain. Please switch manually and try again.")
        }
      }

      // 3) Send tx (await hash!) - must use sendTransactionAsync for deterministic flow
      if (!sendTransactionAsync) {
        throw new Error("sendTransactionAsync not available. Please update wagmi or use a compatible wallet.")
      }
      
      const txHash = await sendTransactionAsync({
        to: intentData.recipient as `0x${string}`,
        value: BigInt(intentData.priceWei),
        chainId: APE_CHAIN_ID,
      })

      console.log("[PurchaseHint] Transaction sent, hash:", txHash)

      // 4) Persist pending immediately (this is your "never lose credit" guarantee)
      const pending: PendingHintPurchase = {
        address: playerAddress,
        intentId: intentData.intentId,
        txHash: txHash as `0x${string}`,
      }
      localStorage.setItem(PENDING_HINT_PURCHASE_KEY, JSON.stringify(pending))

      // 5) Confirm (with lock to prevent parallel calls)
      if (confirmingRef.current) {
        throw new Error("Purchase confirmation already in progress")
      }
      confirmingRef.current = true

      try {
        const confirmResponse = await fetch("/api/cryptoku/hints/confirm-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pending),
        })

        if (!confirmResponse.ok) {
          const errorData = await confirmResponse.json().catch(() => ({}))
          // keep localStorage so recovery effect can finalize later
          // Throw user-friendly message - catch will show it (avoid double toast)
          throw new Error(errorData?.error || "Payment sent. Finalizing hints… If they don't appear, refresh the page.")
        }

        const confirmData = await confirmResponse.json()
        if (confirmData?.success && typeof confirmData?.hintBalance === "number") {
          setHintBalance(confirmData.hintBalance)
          localStorage.removeItem(PENDING_HINT_PURCHASE_KEY)
          showToastMessage("Purchased 10 hints for 1.0 $APE")
          console.log("[PurchaseHint] Purchase completed successfully")
          
          // Optionally re-fetch balance to ensure UI is in sync
          try {
            const balanceResponse = await fetch(`/api/cryptoku/hints/balance?address=${encodeURIComponent(playerAddress)}`)
            if (balanceResponse.ok) {
              const balanceData = await balanceResponse.json()
              if (balanceData.hintBalance !== undefined && typeof balanceData.hintBalance === "number") {
                setHintBalance(balanceData.hintBalance)
              }
            }
          } catch (e) {
            // Non-critical - we already have the balance from confirm response
            console.warn("[PurchaseHint] Failed to re-fetch balance:", e)
          }
          
          return
        }
        
        throw new Error(confirmData?.error || "Purchase verification failed")
      } finally {
        confirmingRef.current = false
      }
    } catch (err: any) {
      const msg = String(err?.message || "Failed to purchase hints")
      const lower = msg.toLowerCase()

      // Detect actual user rejection (wallet tx rejection, not chain switch)
      const isUserRejected =
        lower.includes("user rejected") ||
        lower.includes("user denied") ||
        lower.includes("denied transaction") ||
        lower.includes("rejected request") ||
        String(err?.code || "") === "4001" ||
        err?.name === "UserRejectedRequestError"

      // Handle errors with appropriate messages
      if (lower.includes("chain switch was rejected")) {
        showToastMessage("Chain switch was rejected. Please switch to ApeChain and try again.")
      } else if (isUserRejected) {
        showToastMessage("Transaction rejected by user")
      } else if (lower.includes("insufficient")) {
        showToastMessage("Insufficient funds. Please ensure you have enough APE.")
      } else {
        showToastMessage(msg)
      }

      console.error("[PurchaseHint] Error:", err)
    } finally {
      setIsPurchasingHints(false)
    }
  }, [
    playerAddress,
    isConnected,
    wagmiAddress,
    isPurchasingHints,
    chainId,
    switchChainAsync,
    sendTransactionAsync,
    showToastMessage,
  ])

  // Track token usage and completed tokens (all 9 correctly placed)
  useEffect(() => {
    const newTokenUsage: Record<number, number> = {}
    for (let tokenId = 1; tokenId <= 9; tokenId++) newTokenUsage[tokenId] = 0

    // Count ALL tokens on the board (both presets and user-placed)
    // This includes tokens that are correctly placed
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = userBoard[r][c]
        if (val !== 0) {
          newTokenUsage[val] = (newTokenUsage[val] || 0) + 1
        }
      }
    }

    // Track correctly placed tokens separately for completion detection
    const correctlyPlacedCount: Record<number, number> = {}
    for (let tokenId = 1; tokenId <= 9; tokenId++) correctlyPlacedCount[tokenId] = 0
    
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = userBoard[r][c]
        if (val !== 0 && val === solutionBoard[r][c]) {
          correctlyPlacedCount[val] = (correctlyPlacedCount[val] || 0) + 1
        }
      }
    }

    const newlyCompletedTokens: number[] = []
    for (let tokenId = 1; tokenId <= 9; tokenId++) {
      // A token is completed when all 9 instances are correctly placed
      if (correctlyPlacedCount[tokenId] === 9 && !animatedTokensRef.current.has(tokenId)) {
        newlyCompletedTokens.push(tokenId)
        animatedTokensRef.current.add(tokenId)
      }
    }

    setTokenUsage(newTokenUsage)

    if (newlyCompletedTokens.length > 0) {
      // Spin all tokens of this type on the board and in the selector
      newlyCompletedTokens.forEach((tokenId) => {
        const boardTokens = document.querySelectorAll<HTMLElement>(
          `[data-token-value="${tokenId}"]`,
        )
        boardTokens.forEach((el) => {
          el.classList.add("spin-token")
          setTimeout(() => el.classList.remove("spin-token"), 800)
        })
        const selectorTokens = document.querySelectorAll<HTMLElement>(
          `[data-selector-token="${tokenId}"]`,
        )
        selectorTokens.forEach((el) => {
          el.classList.add("spin-token")
          setTimeout(() => el.classList.remove("spin-token"), 800)
        })
      })

      setCompletedTokens((prev) => {
        const updated = new Set(prev)
        newlyCompletedTokens.forEach((token) => updated.add(token))
        return updated
      })
    }
  }, [userBoard, solutionBoard])

  // Detect board completion
  useEffect(() => {
    let isFull = true
    let isCorrect = true

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (userBoard[r][c] === 0) {
          isFull = false
          break
        }
        if (userBoard[r][c] !== solutionBoard[r][c]) {
          isCorrect = false
        }
      }
      if (!isFull) break
    }

    if (isFull && isCorrect && !isVerifying && !verificationAttempted && gameHasStarted) {
      ;(async () => {
        await handleZkVerifyValidation()
      })()
    }
  }, [userBoard, solutionBoard, isVerifying, verificationAttempted, gameHasStarted])

  // Row / column / box completion effects
  useEffect(() => {
    if (!gameHasStarted) return

    const newlyCompletedSections: string[] = []
    const nextCompleted = new Set<string>()

    // Rows
    for (let r = 0; r < 9; r++) {
      let full = true
      let correct = true
      for (let c = 0; c < 9; c++) {
        const v = userBoard[r][c]
        if (v === 0) {
          full = false
          break
        }
        if (v !== solutionBoard[r][c]) {
          correct = false
        }
      }
      if (full && correct) {
        const key = `row-${r}`
        nextCompleted.add(key)
        if (!completedSectionsRef.current.has(key)) newlyCompletedSections.push(key)
      }
    }

    // Columns
    for (let c = 0; c < 9; c++) {
      let full = true
      let correct = true
      for (let r = 0; r < 9; r++) {
        const v = userBoard[r][c]
        if (v === 0) {
          full = false
          break
        }
        if (v !== solutionBoard[r][c]) {
          correct = false
        }
      }
      if (full && correct) {
        const key = `col-${c}`
        nextCompleted.add(key)
        if (!completedSectionsRef.current.has(key)) newlyCompletedSections.push(key)
      }
    }

    // 3x3 boxes
    for (let boxR = 0; boxR < 3; boxR++) {
      for (let boxC = 0; boxC < 3; boxC++) {
        let full = true
        let correct = true
        for (let r = boxR * 3; r < boxR * 3 + 3; r++) {
          for (let c = boxC * 3; c < boxC * 3 + 3; c++) {
            const v = userBoard[r][c]
            if (v === 0) {
              full = false
              break
            }
            if (v !== solutionBoard[r][c]) {
              correct = false
            }
          }
          if (!full) break
        }
        if (full && correct) {
          const key = `box-${boxR}-${boxC}`
          nextCompleted.add(key)
          if (!completedSectionsRef.current.has(key)) newlyCompletedSections.push(key)
        }
      }
    }

    // Apply visual effects for newly completed sections
    newlyCompletedSections.forEach((section) => {
      let selector = ""
      if (section.startsWith("row-")) {
        selector = `[data-section="${section}"]`
      } else if (section.startsWith("col-")) {
        selector = `[data-col-section="${section}"]`
      } else if (section.startsWith("box-")) {
        selector = `[data-box-section="${section}"]`
      }
      if (!selector) return

      const cells = document.querySelectorAll<HTMLElement>(selector)
      cells.forEach((cell) => {
        cell.classList.add("section-flash")
        const token = cell.querySelector<HTMLElement>("[data-token-value]")
        if (token) {
          token.classList.add("spin-token")
          setTimeout(() => {
            token.classList.remove("spin-token")
          }, 800)
        }
        setTimeout(() => {
          cell.classList.remove("section-flash")
        }, 400)
      })
    })

    setCompletedSections(nextCompleted)
    completedSectionsRef.current = nextCompleted
  }, [userBoard, solutionBoard, gameHasStarted])

  // Clear button highlight timeout
  useEffect(() => {
    if (!highlightClear) return
    const id = setTimeout(() => setHighlightClear(false), 1500)
    return () => clearTimeout(id)
  }, [highlightClear])

  const handleZkVerifyValidation = useCallback(async () => {
    if (!gameStartTime || !playerAddress || !runId || verificationAttempted) return

    setIsVerifying(true)
    setVerificationAttempted(true)

    // Mark game end time, then stop the timer at exactly that time
    const endTime = new Date()
    setGameEndTime(endTime)
    stopActiveTimer(endTime.getTime())

    // Use accumulator-based timer (excludes paused time)
    const timeInSeconds = getCurrentGameTimeSeconds()

    const hasApiKey =
      typeof process !== "undefined" &&
      typeof process.env !== "undefined" &&
      !!process.env.NEXT_PUBLIC_ZKVERIFY_API_KEY &&
      process.env.NEXT_PUBLIC_ZKVERIFY_API_KEY.length > 0
    const useZkVerify =
      (!process.env.NEXT_PUBLIC_USE_ZKVERIFY || process.env.NEXT_PUBLIC_USE_ZKVERIFY !== "false") &&
      hasApiKey

    let verificationResult
    if (useZkVerify) {
      verificationResult = await verifySudokuWithZkVerify(puzzleBoard, userBoard)
    } else {
      verificationResult = mockVerifySudoku(puzzleBoard, userBoard)
    }

    try {
      if (verificationResult.isValid) {
        setVerificationProofId(verificationResult.proofId || null)

        // Complete the local game session & stats
        if (currentSession) {
          completeGameSession(
            currentSession.id,
            timeInSeconds,
            errors,
            hintsUsedInGame,
            0, // Score now calculated server-side
            verificationResult.proofId,
          )
          setCurrentSession(null)
        }

        // Submit result to API (server-side scoring)
        const mode = currentDifficulty.toUpperCase() as "NOOB" | "DEGEN" | "APE"
        const isRanked = mode !== "NOOB"

        if (isRanked) {
          try {
            const response = await fetch("/api/cryptoku/submit-result", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                playerAddress,
                mode,
                runId,
                timeSeconds: timeInSeconds,
                hintsUsed: hintsUsedInGame,
                errors,
                completed: true,
                forfeited: false,
              }),
            })

            if (response.ok) {
              const data = await response.json()
              // API returns 'pointsEarned', not 'score'
              const serverScore = data.pointsEarned || 0
              setCurrentScore(serverScore)

              // Update hints balance if earned
              if (data.hintBalance !== undefined) {
                setHintBalance(data.hintBalance)
                setGamesUntilNextFreeHint(data.gamesUntilNextFreeHint || 0)
              }

              // Use the actual server-calculated score as points (only for ranked modes)
              // For NOOB mode, points are 0 (unranked)
              const earned = currentDifficulty === "noob" ? 0 : serverScore
              setPointsEarned(earned)

              // Show confetti for 5 seconds, then reveal victory modal
              setShowConfetti(true)
              setShowVictory(false)
              setTimeout(() => {
                setShowConfetti(false)
                setShowVictory(true)
              }, 5000)

              onGameEnd?.({
                score: serverScore,
                metadata: {
                  outcome: "win",
                  difficulty: currentDifficulty,
                  timeInSeconds,
                  errors,
                  hintsUsed: hintsUsedInGame,
                  proofId: verificationResult.proofId ?? null,
                  playerAddress,
                  cleanStreak: data.cleanStreak,
                  hintsEarned: data.hintsEarned || 0,
                  points: earned, // Use actual calculated score, not the legacy reward function
                },
              })
            } else {
              console.error("Failed to submit result to API")
              // Calculate points locally if API submission failed (only for ranked modes)
              // Use a simplified calculation that matches the server formula
              let earned = 0
              if (currentDifficulty === "degen" || currentDifficulty === "ape") {
                const startingPoints = currentDifficulty === "degen" ? 500 : 800
                const timeDecay = timeInSeconds * 0.2
                const hintPenalty = 15 * hintsUsedInGame
                const errorPenalty = 20 * errors
                const isCleanRun = hintsUsedInGame === 0 && errors === 0
                const cleanRunBonus = isCleanRun ? 50 : 0
                const baseTimeScore = Math.max(0, startingPoints - timeDecay)
                const rawScore = baseTimeScore - hintPenalty - errorPenalty + cleanRunBonus
                earned = Math.max(20, Math.round(rawScore)) // Minimum 20
                setPointsEarned(earned)
              } else {
                setPointsEarned(0) // NOOB mode = 0 points
              }
              
              // Still show victory modal even if submission failed
              setCurrentScore(0)
              setShowConfetti(true)
              setShowVictory(false)
              setTimeout(() => {
                setShowConfetti(false)
                setShowVictory(true)
              }, 5000)
              
              onGameEnd?.({
                score: 0,
                metadata: {
                  outcome: "win",
                  difficulty: currentDifficulty,
                  timeInSeconds,
                  errors,
                  hintsUsed: hintsUsedInGame,
                  proofId: verificationResult.proofId ?? null,
                  playerAddress,
                  submissionFailed: true,
                  points: earned,
                },
              })
              showToastMessage("Game completed but failed to submit score")
            }
          } catch (error) {
            console.error("Error submitting result:", error)
            // Calculate points locally if API submission failed (only for ranked modes)
            let earned = 0
            if (currentDifficulty === "degen" || currentDifficulty === "ape") {
              const startingPoints = currentDifficulty === "degen" ? 500 : 800
              const timeDecay = timeInSeconds * 0.2
              const hintPenalty = 15 * hintsUsedInGame
              const errorPenalty = 20 * errors
              const isCleanRun = hintsUsedInGame === 0 && errors === 0
              const cleanRunBonus = isCleanRun ? 50 : 0
              const baseTimeScore = Math.max(0, startingPoints - timeDecay)
              const rawScore = baseTimeScore - hintPenalty - errorPenalty + cleanRunBonus
              earned = Math.max(20, Math.round(rawScore)) // Minimum 20
              setPointsEarned(earned)
            } else {
              setPointsEarned(0) // NOOB mode = 0 points
            }
            
            // Still show victory modal even if submission failed
            setCurrentScore(0)
            setShowConfetti(true)
            setShowVictory(false)
            setTimeout(() => {
              setShowConfetti(false)
              setShowVictory(true)
            }, 5000)
            
            onGameEnd?.({
              score: 0,
              metadata: {
                outcome: "win",
                difficulty: currentDifficulty,
                timeInSeconds,
                errors,
                hintsUsed: hintsUsedInGame,
                proofId: verificationResult.proofId ?? null,
                playerAddress,
                submissionFailed: true,
                points: earned,
              },
            })
            showToastMessage("Game completed but failed to submit score")
          }
        } else {
          // NOOB mode - unranked, show local result only
          // NOOB mode = 0 points (unranked)
          setPointsEarned(0)
          
          setCurrentScore(0)
          setShowConfetti(true)
          setShowVictory(false)
          setTimeout(() => {
            setShowConfetti(false)
            setShowVictory(true)
          }, 5000)

          onGameEnd?.({
            score: 0,
            metadata: {
              outcome: "win",
              difficulty: currentDifficulty,
              timeInSeconds,
              errors,
              hintsUsed: hintsUsedInGame,
              proofId: verificationResult.proofId ?? null,
              playerAddress,
              unranked: true,
              points: 0, // NOOB mode always 0 points
            },
          })
        }
      } else {
        showToastMessage(verificationResult.message || "Solution verification failed")
      }
    } finally {
      setIsVerifying(false)
    }
  }, [
    gameStartTime,
    currentDifficulty,
    errors,
    puzzleBoard,
    userBoard,
    currentSession,
    hintsUsedInGame,
    showToastMessage,
    onGameEnd,
    playerAddress,
    runId,
    verificationAttempted,
    getCurrentGameTimeSeconds,
    stopActiveTimer,
  ])

  // Fetch leaderboard from API
  const fetchLeaderboard = useCallback(async (mode: "ALL" | "DEGEN" | "APE" = "ALL") => {
    try {
      const response = await fetch(`/api/cryptoku/leaderboard?mode=${mode}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        setLeaderboardEntries(data.entries || [])
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    }
  }, [])

  useEffect(() => {
    if (showLeaderboard) {
      fetchLeaderboard(leaderboardMode)
    }
  }, [showLeaderboard, leaderboardMode, fetchLeaderboard])


  const currentTimeLabel = formatTime(getCurrentGameTime())

  // UI -----------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      <style jsx global>{`
        @keyframes incorrect-glow {
          0% {
            box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.0);
          }
          50% {
            box-shadow: 0 0 18px 6px rgba(248, 113, 113, 0.9);
          }
          100% {
            box-shadow: 0 0 10px 3px rgba(248, 113, 113, 0.5);
          }
        }

        .incorrect-cell {
          border-color: #f97373 !important;
          box-shadow: 0 0 10px 3px rgba(248, 113, 113, 0.6);
          animation: incorrect-glow 0.5s ease-out;
        }

        @keyframes clear-pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(248, 250, 252, 0.0);
          }
          100% {
            transform: scale(1.05);
            box-shadow: 0 0 16px 4px rgba(248, 250, 252, 0.6);
          }
        }

        .clear-highlight {
          animation: clear-pulse 0.6s ease-in-out infinite alternate;
        }

        @keyframes spin-token {
          0% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(360deg) scale(1.1);
          }
          100% {
            transform: rotate(720deg) scale(1);
          }
        }

        .spin-token {
          animation: spin-token 0.8s ease-out;
        }

        @keyframes section-flash {
          0% {
            box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.0);
          }
          50% {
            box-shadow: 0 0 24px 6px rgba(56, 189, 248, 0.9);
          }
          100% {
            box-shadow: 0 0 8px 2px rgba(56, 189, 248, 0.4);
          }
        }

        .section-flash {
          animation: section-flash 0.6s ease-out;
        }

        .confetti {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: visible;
          z-index: 9999;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
        }

        .confetti-piece {
          position: absolute;
          width: 12px;
          height: 12px;
          background: #fbbf24;
          opacity: 0.9;
          border-radius: 2px;
          top: -20px;
          animation: confetti-fall 5s linear forwards;
        }

        .confetti-piece:nth-child(4n) {
          background: #22c55e;
        }
        .confetti-piece:nth-child(4n + 1) {
          background: #38bdf8;
        }
        .confetti-piece:nth-child(4n + 2) {
          background: #f97316;
        }
        .confetti-piece:nth-child(4n + 3) {
          background: #a855f7;
        }

        @keyframes confetti-fall {
          0% {
            transform: translate3d(0, -20px, 0) rotateZ(0deg) rotateY(0deg);
            opacity: 1;
          }
          100% {
            transform: translate3d(0, calc(100vh + 20px), 0) rotateZ(720deg) rotateY(360deg);
            opacity: 0;
          }
        }

        @keyframes hint-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7), 0 0 0 0 rgba(34, 197, 94, 0.5);
            transform: scale(1);
          }
          33% {
            box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.4), 0 0 0 12px rgba(34, 197, 94, 0.25);
            transform: scale(1.08);
          }
          66% {
            box-shadow: 0 0 0 8px rgba(34, 197, 94, 0.3), 0 0 0 16px rgba(34, 197, 94, 0.15);
            transform: scale(1.05);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0), 0 0 0 0 rgba(34, 197, 94, 0);
            transform: scale(1);
          }
        }

        .hint-pulse {
          animation: hint-pulse 3s ease-in-out;
          border-color: #22c55e !important;
        }
      `}</style>
      {showSplash && <SplashScreen onEnter={handleSplashComplete} />}

      {showConfetti && (
        <div className="confetti">
          {Array.from({ length: 300 }, (_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${-20 - Math.random() * 100}px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Welcome / Difficulty Modal */}
      {showWelcome && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-40">
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 p-8 rounded-2xl w-full max-w-lg text-center">
            <div className="text-6xl mb-4">🎮</div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-yellow-400 bg-clip-text text-transparent">
              Welcome to Cryptoku
            </h1>

            {playerAddress && (
              <div className="mb-6 flex flex-col items-center gap-3">
                {profileAvatarUrl ? (
                  <img
                    src={profileAvatarUrl}
                    alt={profileUsername || "Profile avatar"}
                    className="w-16 h-16 rounded-full object-cover border-2 border-cyan-400 shadow-lg shadow-cyan-400/30"
                  />
                ) : (
                  <RabbitAvatar color={RABBIT_COLORS[0]} size={64} />
                )}
                <div className="text-sm font-semibold text-slate-100">
                  {profileUsername ||
                    (playerAddress
                      ? `${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}`
                      : "Player")}
                </div>
                <div className="text-xs text-slate-400">
                  Hints: {hintBalance} {gamesUntilNextFreeHint > 0 && `• ${gamesUntilNextFreeHint} games until next free hint`}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setShowTutorial(true)
                setTutorialSlide(0)
              }}
              className="w-full mb-4 px-6 py-3 rounded-lg border-2 border-purple-400 bg-gradient-to-b from-purple-900/50 to-purple-800/50 font-bold text-sm hover:shadow-lg hover:shadow-purple-400/40 transition-all"
            >
              📖 How to Play (Tutorial)
            </button>

            <div className="space-y-3 mb-2">
              <button
                onClick={() => startNewGame("noob")}
                className="w-full px-6 py-3 rounded-lg border-2 border-green-400 bg-gradient-to-b from-green-900/50 to-green-800/50 font-bold text-sm hover:shadow-lg hover:shadow-green-400/40 transition-all"
              >
                🟢 Noob — 40 clues (Easy) • Unranked
              </button>
              <button
                onClick={() => {
                  if (!playerAddress) {
                    showToastMessage("Please connect your wallet to play Degen mode")
                    return
                  }
                  startNewGame("degen")
                }}
                disabled={!playerAddress}
                className={`w-full px-6 py-3 rounded-lg border-2 border-cyan-400 bg-gradient-to-b from-cyan-900/50 to-cyan-800/50 font-bold text-sm transition-all ${
                  playerAddress
                    ? "hover:shadow-lg hover:shadow-cyan-400/40 cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
                🔵 Degen — 40 clues (Easy) • Ranked {!playerAddress && "(Login Required)"}
              </button>
              <button
                onClick={() => {
                  if (!playerAddress) {
                    showToastMessage("Please connect your wallet to play Ape mode")
                    return
                  }
                  startNewGame("ape")
                }}
                disabled={!playerAddress}
                className={`w-full px-6 py-3 rounded-lg border-2 border-yellow-400 bg-gradient-to-b from-yellow-900/50 to-yellow-800/50 font-bold text-sm transition-all ${
                  playerAddress
                    ? "hover:shadow-lg hover:shadow-yellow-400/40 cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
                🟡 Ape — 32 clues (Hard) • Ranked {!playerAddress && "(Login Required)"}
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-4 mb-4">
              Start with 3 free hints • Earn +1 hint every 10 completed ranked games • Verified with zkVerify
            </p>

            {onClose && (
              <button
                onClick={onClose}
                className="w-full mt-4 px-6 py-2.5 rounded-lg border border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 font-semibold text-sm text-slate-300 hover:text-white transition-all hover:shadow-lg hover:shadow-slate-500/20"
              >
                Return to Arcade Hub
              </button>
            )}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto p-4 md:p-6">
        {/* Top row: New Game, Playing, My Stats, Leaderboard */}
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-2">
          <button
            onClick={() => {
              setShowWelcome(true)
              setShowSplash(false)
            }}
            className="px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg border-2 border-cyan-400 bg-gradient-to-b from-slate-800 to-slate-900 font-bold text-xs md:text-sm hover:shadow-lg hover:shadow-cyan-400/30 transition-all"
          >
            🎮 New Game
          </button>

          {gameHasStarted && (
            <div className="px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg border border-slate-600 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs md:text-sm">Playing:</span>
                <span
                  className={`font-bold text-xs md:text-sm ${
                    currentDifficulty === "noob"
                      ? "text-green-400"
                      : currentDifficulty === "degen"
                        ? "text-cyan-400"
                        : "text-yellow-400"
                  }`}
                >
                  {currentDifficulty === "noob"
                    ? "🟢 Noob"
                    : currentDifficulty === "degen"
                      ? "🔵 Degen"
                      : "🟡 Ape"}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowStatsModal(true)}
            className="px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg border border-slate-600 bg-gradient-to-b from-slate-800 to-slate-900 font-bold text-xs md:text-sm hover:shadow-lg hover:shadow-cyan-400/20 transition-all"
          >
            📊 My Stats
          </button>

          <button
            onClick={() => setShowLeaderboard(true)}
            className="px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg border border-slate-600 bg-gradient-to-b from-slate-800 to-slate-900 font-bold text-xs md:text-sm hover:shadow-lg hover:shadow-cyan-400/20 transition-all"
          >
            🏆 Leaderboard
          </button>
        </div>

        {/* Second row: Pause, Notes, Hints, Timer, Errors */}
        <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3 mb-3 md:mb-4 max-w-xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
            <button
              onClick={togglePause}
              disabled={!gameHasStarted || showVictory}
              className="px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg border border-purple-400 bg-gradient-to-b from-purple-900/50 to-purple-800/50 font-bold text-xs md:text-sm text-purple-400 hover:shadow-lg hover:shadow-purple-400/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPaused ? "▶️ Resume" : "⏸️ Pause"}
            </button>

            <button
              onClick={() => setNotesMode((prev) => !prev)}
              className={`px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg border-2 font-bold text-[11px] md:text-xs hover:shadow-lg transition-all ${
                notesMode
                  ? "border-cyan-400 bg-gradient-to-b from-cyan-900/50 to-cyan-800/50 text-cyan-400 shadow-lg shadow-cyan-400/30"
                  : "border-slate-600 bg-gradient-to-b from-slate-800 to-slate-900 hover:shadow-cyan-400/20"
              }`}
            >
              📝 {notesMode ? "Notes: ON" : "Notes: OFF"}
            </button>

            <button
              onClick={doHint}
              disabled={hintCooldownTime > 0 || isPaused || hintBalance <= 0}
              className={`px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg border-2 font-bold text-[11px] md:text-xs transition-all ${
                hintCooldownTime > 0 || isPaused || hintBalance <= 0
                  ? "border-slate-700 bg-slate-900 text-slate-500 cursor-not-allowed"
                  : "border-yellow-400 bg-gradient-to-b from-yellow-900/50 to-yellow-800/50 hover:shadow-lg hover:shadow-yellow-400/30 text-yellow-400"
              }`}
            >
              {hintCooldownTime > 0
                ? `💡 Hint (${hintCooldownTime}s)`
                : `💡 Hint (${hintBalance} available)`}
            </button>
            <button
              onClick={purchaseHint}
              disabled={isPurchasingHints || isSendingTransaction}
              className={`px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg border font-bold text-[11px] md:text-xs transition-all ${
                isPurchasingHints || isSendingTransaction
                  ? "border-emerald-600 bg-gradient-to-b from-emerald-900/30 to-emerald-800/30 text-emerald-600 cursor-not-allowed opacity-50"
                  : "border-emerald-400 bg-gradient-to-b from-emerald-900/50 to-emerald-800/50 text-emerald-400 hover:shadow-lg hover:shadow-emerald-400/30"
              }`}
              title={isPurchasingHints || isSendingTransaction ? "Processing purchase..." : "Purchase 10 hints for 1.0 $APE"}
            >
              {isPurchasingHints || isSendingTransaction ? "⏳ Processing..." : "💰 Buy Hints"}
            </button>
          </div>

          <div className="flex gap-2 md:gap-4 text-slate-400 text-xs md:text-sm flex-wrap items-center">
            <span>
              Time: <strong className="text-white">{currentTimeLabel}</strong>
            </span>
            <span>
              Errors: <strong className="text-white">{errors}</strong>
            </span>
          </div>
        </div>

        {/* Game board */}
        <div className="mb-4 md:mb-6">
          <div className="relative max-w-md mx-auto">
            {isGamePrepared && !gameHasStarted && !showVictory && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 rounded-2xl backdrop-blur-md">
                <div className="text-center">
                  <div className="text-5xl mb-4">🎮</div>
                  <div className="text-3xl font-bold mb-2">Ready to Start</div>
                  <div className="text-sm text-slate-300 mb-4">
                    Press Start Game to begin and start the timer.
                  </div>
                  <button
                    onClick={beginGame}
                    className="px-8 py-3 rounded-lg border-2 border-cyan-400 bg-gradient-to-b from-cyan-900 to-cyan-800 font-bold text-base text-cyan-100 hover:shadow-lg hover:shadow-cyan-400/30 transition-all"
                  >
                    START GAME
                  </button>
                </div>
              </div>
            )}
            {isPaused && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 rounded-2xl backdrop-blur-md">
                <div className="text-center">
                  <div className="text-5xl mb-4">⏸️</div>
                  <div className="text-3xl font-bold mb-2">Game Paused</div>
                  <div className="text-sm text-slate-300 mb-4">Click Resume to continue playing.</div>
                  <button
                    onClick={togglePause}
                    className="px-6 py-3 rounded-lg border-2 border-purple-400 bg-gradient-to-b from-purple-900 to-purple-800 font-bold text-base text-purple-200 hover:shadow-lg hover:shadow-purple-400/30 transition-all"
                  >
                    ▶️ Resume Game
                  </button>
                </div>
              </div>
            )}

            <div
              className={`grid grid-cols-9 grid-rows-9 w-full max-w-md aspect-square mx-auto bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-1.5 md:p-2 shadow-2xl shadow-cyan-400/10 border border-slate-700/50 transition-all duration-300 ${
                isPaused ? "blur-sm" : ""
              }`}
            >
              {Array.from({ length: 9 }, (_, r) =>
                Array.from({ length: 9 }, (_, c) => {
                  const val = userBoard[r][c]
                  const isGiven = givenMask[r][c]
                  const isSelected = selected && selected[0] === r && selected[1] === c
                  const hasConflict = val !== 0 && !isSafe(userBoard, r, c, val)
                  const isSameSymbol =
                    selected && val !== 0 && val === userBoard[selected[0]][selected[1]]
                  const isIncorrect = val !== 0 && !isGiven && solutionBoard[r][c] !== val
                  const isHintedCell = hintedCell && hintedCell[0] === r && hintedCell[1] === c

                  const boxR = Math.floor(r / 3)
                  const boxC = Math.floor(c / 3)

                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`
                        border border-slate-600 flex items-center justify-center cursor-pointer relative
                        ${isGiven ? "bg-[#1e3a5f]" : "hover:bg-slate-700/50"}
                        ${isSelected ? "ring-2 ring-cyan-400 ring-offset-0 z-10" : ""}
                        ${hasConflict ? "bg-red-500/20" : ""}
                        ${isSameSymbol ? "bg-cyan-500/10" : ""}
                        ${isIncorrect ? "incorrect-cell" : ""}
                        ${(c + 1) % 3 === 0 && c < 8 ? "border-r-2 border-r-cyan-300" : ""}
                        ${(r + 1) % 3 === 0 && r < 8 ? "border-b-2 border-b-cyan-300" : ""}
                      `}
                      data-section={`row-${r}`}
                      data-col-section={`col-${c}`}
                      data-box-section={`box-${boxR}-${boxC}`}
                      onClick={() => {
                        if (!isPaused) setSelected([r, c])
                      }}
                    >
                      {val !== 0 ? (
                        <div
                          className={`w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center token-glow border-2 ${
                            isSameSymbol ? "ring-2 ring-cyan-400 ring-offset-2" : ""
                          } ${isHintedCell ? "hint-pulse ring-2 ring-green-500 ring-offset-2" : ""}`}
                          data-token-value={val}
                          style={{
                            color: TOKENS[val - 1].color,
                            borderColor: isHintedCell ? "#22c55e" : TOKENS[val - 1].color,
                            background:
                              "radial-gradient(60% 60% at 50% 35%, rgba(255,255,255,0.12), transparent), #0c1122",
                          }}
                        >
                          <img
                            src={TOKENS[val - 1].img || "/placeholder.svg"}
                            alt={TOKENS[val - 1].name}
                            className="w-5 h-5 md:w-8 md:h-8 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-0.5 md:gap-0.5 w-10 h-10 md:w-14 md:h-14 opacity-90">
                          {Array.from({ length: 9 }, (_, i) => (
                            <div
                              key={i}
                              className={`w-full aspect-square rounded-full border border-dashed border-slate-600 ${
                                notes[r][c].has(i + 1) ? "opacity-70" : ""
                              }`}
                              style={{
                                background: notes[r][c].has(i + 1)
                                  ? TOKENS[i].color
                                  : "transparent",
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }),
              )}
            </div>
          </div>
        </div>

        {/* Token selector bar below board */}
        <div className="w-full max-w-lg mx-auto mb-4 md:mb-6">
          <div className="rounded-2xl border border-cyan-400/40 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/90 px-2 md:px-4 py-2 shadow-[0_0_25px_rgba(34,211,238,0.25)] overflow-hidden">
            <div 
              className="flex items-center justify-start md:justify-center gap-1 md:gap-1.5 overflow-x-auto scrollbar-hide pb-1 md:pb-0" 
              style={{ 
                WebkitOverflowScrolling: 'touch' // iOS smooth momentum scrolling
              }}
            >
              {TOKENS.map((token) => {
                const tokenCount = tokenUsage[token.id] || 0
                // Only disable if all 9 instances are correctly placed (token is completed)
                // Don't disable based on total count, because user might need to replace incorrectly placed tokens
                const isTypeCompleted = completedTokens.has(token.id)
                const isHighlighted =
                  selected && userBoard[selected[0]][selected[1]] === token.id
                return (
                  <button
                    key={token.id}
                    data-selector-token={token.id}
                    onClick={() => placeValue(token.id)}
                    disabled={isTypeCompleted}
                    className={`relative flex-shrink-0 rounded-full p-0.5 md:p-1 transition-transform touch-manipulation ${
                      isTypeCompleted
                        ? "opacity-30 cursor-not-allowed grayscale"
                        : "cursor-pointer hover:scale-105 active:scale-95"
                    } ${isHighlighted ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-900" : ""}`}
                    title={`${token.name} (${tokenCount}/9)${
                      isTypeCompleted ? " - All placed!" : ""
                    }`}
                  >
                    <span
                      className="flex items-center justify-center rounded-full bg-slate-950/80"
                      style={{
                        width: "1.75rem",
                        height: "1.75rem",
                        borderColor: token.color,
                        borderWidth: 2,
                        borderStyle: "solid",
                      }}
                    >
                      <img
                        src={token.img || "/placeholder.svg"}
                        alt={token.name}
                        className="w-4 h-4 md:w-6 md:h-6 object-contain"
                      />
                    </span>
                  </button>
                )
              })}
              <button
                onClick={eraseCell}
                className={`flex-shrink-0 ml-1 md:ml-2 px-2.5 py-1 md:px-4 md:py-1.5 rounded-full border border-dashed border-slate-500 bg-slate-900/70 text-[0.7rem] md:text-sm font-semibold hover:shadow-lg hover:shadow-cyan-400/25 transition-all touch-manipulation active:scale-95 ${
                  highlightClear ? "clear-highlight" : ""
                }`}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Verification overlay */}
      {isVerifying && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 p-8 rounded-2xl max-w-md text-center">
            <div className="text-4xl mb-4 animate-spin">🔄</div>
            <h2 className="text-xl font-bold mb-2">Verifying Solution...</h2>
            <p className="text-slate-300 text-sm">
              {process.env.NEXT_PUBLIC_ZKVERIFY_API_KEY &&
              process.env.NEXT_PUBLIC_ZKVERIFY_API_KEY.length > 0
                ? "Generating zero-knowledge proof via zkVerify (this may take a few seconds)."
                : "Validating Sudoku rules locally (mock mode)."}
            </p>
          </div>
        </div>
      )}

      {/* Victory modal */}
      {showVictory && currentScore !== null && gameStartTime && gameEndTime && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-[100]">
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 p-8 rounded-2xl w-full max-w-md text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold mb-3">You solved the puzzle!</h2>
            {verificationProofId && (
              <div className="mb-4 px-3 py-2 bg-green-900/30 border border-green-500/30 rounded-lg text-xs text-slate-300">
                ✓ Verified via zkVerify
              </div>
            )}
            <div className="bg-slate-700/50 rounded-lg p-4 mb-4 text-left">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-300">Score:</span>
                <span className="text-cyan-400 font-bold">{currentScore}</span>
                {(currentDifficulty === "degen" || currentDifficulty === "ape") && pointsEarned !== null && (
                  <>
                    <span className="text-slate-300">Points Earned:</span>
                    <span className="text-yellow-400 font-bold">+{pointsEarned}</span>
                  </>
                )}
                <span className="text-slate-300">Time:</span>
                <span className="font-bold">
                  {formatTime(
                    Math.floor((gameEndTime.getTime() - gameStartTime.getTime()) / 1000),
                  )}
                </span>
                <span className="text-slate-300">Mistakes:</span>
                <span className="font-bold">{errors}</span>
                <span className="text-slate-300">Difficulty:</span>
                <span className="font-bold capitalize">{currentDifficulty}</span>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowVictory(false)}
                className="px-4 py-2 rounded-lg border border-slate-600 bg-gradient-to-b from-slate-800 to-slate-900 font-bold hover:shadow-lg hover:shadow-cyan-400/20 transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowVictory(false)
                  startNewGame(currentDifficulty)
                }}
                className="px-4 py-2 rounded-lg border border-slate-600 bg-gradient-to-b from-slate-800 to-slate-900 font-bold hover:shadow-lg hover:shadow-cyan-400/20 transition-all"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-40">
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 p-8 rounded-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Leaderboard</h2>
            <div className="flex gap-2 mb-4 justify-center">
              <button
                onClick={() => {
                  setLeaderboardMode("ALL")
                  fetchLeaderboard("ALL")
                }}
                className={`px-3 py-1 rounded text-xs font-bold ${
                  leaderboardMode === "ALL"
                    ? "bg-cyan-500 text-white"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  setLeaderboardMode("DEGEN")
                  fetchLeaderboard("DEGEN")
                }}
                className={`px-3 py-1 rounded text-xs font-bold ${
                  leaderboardMode === "DEGEN"
                    ? "bg-cyan-500 text-white"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                Degen
              </button>
              <button
                onClick={() => {
                  setLeaderboardMode("APE")
                  fetchLeaderboard("APE")
                }}
                className={`px-3 py-1 rounded text-xs font-bold ${
                  leaderboardMode === "APE"
                    ? "bg-cyan-500 text-white"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                Ape
              </button>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 mb-4 max-h-80 overflow-y-auto">
              {leaderboardEntries.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-4">No entries yet</div>
              ) : (
                <ul className="space-y-2 text-sm">
                  {leaderboardEntries.map((entry) => (
                    <li key={entry.runId} className="text-slate-300 flex justify-between items-center">
                      <span className="font-bold text-cyan-400">#{entry.rank}</span>
                      <span className="flex-1 ml-2">
                        {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                      </span>
                      <span className="text-yellow-400 font-bold">{entry.score}</span>
                      <span className="text-xs text-slate-400 ml-2">
                        {formatTime(entry.timeSeconds)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowLeaderboard(false)}
                className="px-4 py-2 rounded-lg border border-slate-600 bg-gradient-to-b from-slate-800 to-slate-900 font-bold hover:shadow-lg hover:shadow-cyan-400/20 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player stats modal */}
      {showStatsModal && (() => {
        const stats = getPlayerStats()
        const completionRate =
          stats.totalGames > 0 ? Math.round((stats.completions / stats.totalGames) * 100) : 0
        const forfeitRate =
          stats.totalGames > 0 ? Math.round((stats.forfeits / stats.totalGames) * 100) : 0

        return (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-40">
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 p-8 rounded-2xl w-full max-w-2xl text-center max-h-[90vh] overflow-y-auto">
              <div className="text-4xl mb-4">📊</div>
              <h2 className="text-2xl font-bold mb-4">Your Statistics</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-cyan-400">{stats.totalGames}</div>
                  <div className="text-sm text-slate-300">Total Games</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">{stats.completions}</div>
                  <div className="text-sm text-slate-300">Completed</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-400">{stats.forfeits}</div>
                  <div className="text-sm text-slate-300">Forfeited</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-400">{completionRate}%</div>
                  <div className="text-sm text-slate-300">Completion</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-xl font-bold text-purple-400">
                    {stats.averageTime > 0
                      ? `${Math.floor(stats.averageTime / 60)}:${(stats.averageTime % 60)
                          .toString()
                          .padStart(2, "0")}`
                      : "--:--"}
                  </div>
                  <div className="text-sm text-slate-300">Average Time</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-xl font-bold text-blue-400">
                    {stats.bestTime > 0
                      ? `${Math.floor(stats.bestTime / 60)}:${(stats.bestTime % 60)
                          .toString()
                          .padStart(2, "0")}`
                      : "--:--"}
                  </div>
                  <div className="text-sm text-slate-300">Best Time</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-xl font-bold text-orange-400">{stats.currentStreak}</div>
                  <div className="text-sm text-slate-300">Current Streak 🔥</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-xl font-bold text-pink-400">{stats.bestStreak}</div>
                  <div className="text-sm text-slate-300">Best Streak</div>
                </div>
              </div>

              <div className="text-left mb-6">
                <h3 className="text-lg font-bold mb-3">Difficulty Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="bg-slate-700/50 rounded-lg p-3 flex justify-between">
                    <span className="font-bold text-green-400">Noob</span>
                    <span className="text-slate-300">
                      {stats.gamesPerDifficulty.noob.completed}/
                      {stats.gamesPerDifficulty.noob.played} completed
                    </span>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 flex justify-between">
                    <span className="font-bold text-cyan-400">Degen</span>
                    <span className="text-slate-300">
                      {stats.gamesPerDifficulty.degen.completed}/
                      {stats.gamesPerDifficulty.degen.played} completed
                    </span>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 flex justify-between">
                    <span className="font-bold text-yellow-400">Ape</span>
                    <span className="text-slate-300">
                      {stats.gamesPerDifficulty.ape.completed}/
                      {stats.gamesPerDifficulty.ape.played} completed
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-lg font-bold text-red-400">{stats.totalErrors}</div>
                  <div className="text-xs text-slate-300">Total Errors</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-lg font-bold text-yellow-400">{stats.totalHintsUsed}</div>
                  <div className="text-xs text-slate-300">Hints Used</div>
                </div>
              </div>

              <button
                onClick={() => setShowStatsModal(false)}
                className="px-6 py-2 rounded-lg border border-slate-600 bg-gradient-to-b from-slate-800 to-slate-900 font-bold hover:shadow-lg hover:shadow-cyan-400/20 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )
      })()}


      {/* Tutorial modal */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-cyan-400 rounded-2xl p-8 max-w-2xl w-full shadow-2xl shadow-cyan-400/50 max-h-[90vh] overflow-y-auto">
            <div className="text-6xl text-center mb-4">{TUTORIAL_SLIDES[tutorialSlide].emoji}</div>
            <h2 className="text-3xl font-bold text-center mb-3 text-cyan-400">
              {TUTORIAL_SLIDES[tutorialSlide].title}
            </h2>
            <p className="text-lg text-slate-200 text-center mb-6 leading-relaxed">
              {TUTORIAL_SLIDES[tutorialSlide].content}
            </p>
            {TUTORIAL_SLIDES[tutorialSlide].details.length > 0 && (
              <div className="bg-slate-900/50 rounded-lg p-4 mb-6">
                <div className="space-y-2 text-left text-slate-200 text-base leading-relaxed">
                  {TUTORIAL_SLIDES[tutorialSlide].details.map((detail, idx) => (
                    <div key={idx}>{detail}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <div className="flex justify-center gap-2 mb-2">
                {TUTORIAL_SLIDES.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      index === tutorialSlide
                        ? "w-8 bg-cyan-400"
                        : index < tutorialSlide
                          ? "w-2 bg-cyan-600"
                          : "w-2 bg-slate-600"
                    }`}
                  />
                ))}
              </div>
              <div className="text-center text-sm text-slate-400">
                {tutorialSlide + 1} of {TUTORIAL_SLIDES.length}
              </div>
            </div>

            <div className="flex gap-4 justify-between items-center">
              <button
                onClick={() => {
                  setShowTutorial(false)
                  setTutorialSlide(0)
                }}
                className="px-4 py-2 rounded-lg border border-slate-600 bg-gradient-to-b from-slate-800 to-slate-900 font-bold hover:shadow-lg hover:shadow-red-400/20 transition-all text-slate-300"
              >
                Close
              </button>
              <div className="flex gap-3">
                {tutorialSlide > 0 && (
                  <button
                    onClick={() => setTutorialSlide((prev) => prev - 1)}
                    className="px-6 py-2 rounded-lg border border-slate-600 bg-gradient-to-b from-slate-800 to-slate-900 font-bold hover:shadow-lg hover:shadow-cyan-400/20 transition-all"
                  >
                    ← Previous
                  </button>
                )}
                {tutorialSlide < TUTORIAL_SLIDES.length - 1 ? (
                  <button
                    onClick={() => setTutorialSlide((prev) => prev + 1)}
                    className="px-6 py-2 rounded-lg border-2 border-cyan-400 bg-gradient-to-b from-cyan-900/50 to-cyan-800/50 font-bold hover:shadow-lg hover:shadow-cyan-400/50 transition-all text-cyan-400"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowTutorial(false)
                      setTutorialSlide(0)
                    }}
                    className="px-6 py-2 rounded-lg border-2 border-green-400 bg-gradient-to-b from-green-900/50 to-green-800/50 font-bold hover:shadow-lg hover:shadow-green-400/50 transition-all text-green-400"
                  >
                    Got It! 🚀
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forfeit Confirmation Dialog */}
      {showForfeitConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-[200]">
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 p-8 rounded-2xl w-full max-w-md text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-3">Forfeit Game?</h2>
            <p className="text-slate-300 mb-4">
              This game is about to be forfeited and <span className="font-bold text-red-400">0 points will be gained</span>.
            </p>
            <p className="text-slate-400 mb-6">Do you wish to forfeit?</p>
            <div className="bg-slate-700/50 rounded-lg p-4 mb-6 text-left">
              <div className="text-sm text-slate-300 mb-2">Current Progress:</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-400">Difficulty:</span>
                <span className="font-bold capitalize">{currentDifficulty}</span>
                <span className="text-slate-400">Time:</span>
                <span className="font-bold">{formatTime(getCurrentGameTime())}</span>
                <span className="text-slate-400">Errors:</span>
                <span className="font-bold">{errors}</span>
                <span className="text-slate-400">Hints Used:</span>
                <span className="font-bold">{hintsUsedInGame}</span>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={cancelForfeit}
                className="flex-1 px-6 py-3 rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-700 font-bold text-slate-300 hover:text-white transition-all"
              >
                No
              </button>
              <button
                onClick={confirmForfeit}
                className="flex-1 px-6 py-3 rounded-lg border-2 border-red-500 bg-red-600/20 hover:bg-red-600/30 font-bold text-red-400 hover:text-red-300 transition-all shadow-lg hover:shadow-red-500/30"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed right-4 bottom-4 bg-slate-800 border border-slate-600 px-4 py-3 rounded-lg shadow-2xl z-50 text-sm">
          {toast}
        </div>
      )}
    </div>
  )
})

CryptokuGame.displayName = "CryptokuGame"

export default CryptokuGame


