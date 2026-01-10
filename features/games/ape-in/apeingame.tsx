"use client"

import React, { useCallback, useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react"
import { motion, AnimatePresence } from "framer-motion"
import GameBoard from "./components/GameBoard"
import SmartBotIntro from "./components/SmartBotIntro"
import WelcomeSplash from "./components/WelcomeSplash"
import MainMenu from "./components/MainMenu"
import { useGameStore } from "./store/gameStore"
import { GameMode } from "./types/game"
import { isRankedMode } from "./utils/constants"
import { calculatePoints } from "./utils/scoring"
import { useIntroTracking } from "./hooks/useIntroTracking"
import { gameAPI } from "./lib/api"
import { BOT_CONFIGS } from "./utils/botConfig"

export interface ApeInGameProps {
  playerAddress: string | null // Hub identity - required
  profileUsername?: string // Hub identity - optional
  profileAvatarUrl?: string // Hub identity - optional
  mode?: GameMode // Game mode (optional - if not provided, shows mode selection)
  onGameStart?: () => void
  onGameEnd?: (result: {
    score: number
    mode: string
    metadata?: any
    points?: number // Points earned
  }) => void
  onClose?: () => void // Callback to close Ape In and return to Arcade Hub
}

export interface ApeInGameHandle {
  handleGameExit: () => boolean // Returns true if forfeit confirmation is shown, false otherwise
}

const gameNames: Record<GameMode, string> = {
  sandy: 'Sandy',
  aida: 'Aida',
  lana: 'Lana',
  enj1n: 'En-J1n',
  nifty: 'Nifty',
  pvp: 'PvP',
  multiplayer: 'Multiplayer',
  tournament: 'Tournament',
}

export const ApeInGame = forwardRef<ApeInGameHandle, ApeInGameProps>(({
  playerAddress,
  profileUsername,
  profileAvatarUrl,
  mode = 'sandy', // Default to Sandy (tutorial)
  onGameStart,
  onGameEnd,
  onClose,
}, ref) => {
  console.log('🎯 ApeInGame component rendered', { mode, playerAddress, profileUsername })
  
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMode, setSelectedMode] = useState<GameMode | undefined>(mode) // Use prop if provided, otherwise undefined
  const [playerName, setPlayerName] = useState('')
  const [gameId, setGameId] = useState('')
  const [showIntro, setShowIntro] = useState(false) // Don't auto-show intro
  const [showSplash, setShowSplash] = useState(true)
  const [showMainMenu, setShowMainMenu] = useState(false) // Main menu after splash
  const [playTokenError, setPlayTokenError] = useState<string | null>(null)
  const [gameInitError, setGameInitError] = useState<string | null>(null)
  const [showForfeitConfirmFromModal, setShowForfeitConfirmFromModal] = useState(false)
  const { setGameState, gameStatus, setPlayToken, setRunId, resetGame } = useGameStore()
  const { hasCompletedIntro, markIntroCompleted } = useIntroTracking()
  const gameStartTimeRef = useRef<number | null>(null)
  const hasCalledOnGameStart = useRef(false)
  const isInitializingRef = useRef(false)
  const initGameIdRef = useRef<string>('')
  const cancelInitRef = useRef(false)

  // Handle mode selection from main menu (original Ape In flow)
  const handleModeSelected = useCallback((selectedMode: GameMode) => {
    console.log('✅ Mode selected from main menu:', selectedMode)
    setSelectedMode(selectedMode)
    setShowMainMenu(false)
    // Will trigger game initialization in useEffect when selectedMode changes
  }, [])

  // Initialize game when mode is selected
  useEffect(() => {
    // Wait for mode selection if not provided
    if (!selectedMode) {
      console.log('⏳ Waiting for mode selection...')
      setIsLoading(false)
      return
    }

    // Prevent multiple initializations - check if we're already initializing this exact mode
    const currentInitKey = `${selectedMode}-${playerAddress || 'guest'}`
    if (isInitializingRef.current && initGameIdRef.current === currentInitKey) {
      console.log('⚠️ Already initializing this mode, skipping')
      return
    }
    
    if (gameId && !isLoading) {
      console.log('⚠️ Already initialized, skipping')
      return
    }

    // Mark as initializing and reset cancel flag
    isInitializingRef.current = true
    initGameIdRef.current = currentInitKey
    cancelInitRef.current = false

    const initGame = async () => {
      setIsLoading(true)
      try {
        console.log('🎮 Initializing game for mode:', selectedMode)
        console.log('👤 Player address:', playerAddress)
        
        // Check if cancelled before proceeding
        if (cancelInitRef.current || initGameIdRef.current !== currentInitKey) {
          console.log('⚠️ Initialization cancelled')
          return
        }
        
        // Sandy (tutorial) should always launch, no checks
        if (selectedMode === 'sandy') {
          console.log('✅ Launching Sandy tutorial (always allowed, no checks)')
          
          // Get player name - Sandy works without address
          let name = profileUsername || 'Player'
          if (!name || name === 'Player') {
            name = playerAddress 
              ? `Player ${playerAddress.slice(0, 6)}`
              : 'Player'
          }
          console.log('📝 Player name for Sandy:', name)
          setPlayerName(name)
          
          // Check if cancelled before API call
          if (cancelInitRef.current || initGameIdRef.current !== currentInitKey) {
            console.log('⚠️ Initialization cancelled before API call')
            return
          }
          
          // Create game via API
          console.log('🚀 Creating Sandy tutorial game via API...')
          const game = await gameAPI.createGame('sandy', name, undefined, false)
          
          // Check if cancelled after API call
          if (cancelInitRef.current || initGameIdRef.current !== currentInitKey) {
            console.log('⚠️ Initialization cancelled after API call')
            return
          }
          
          if (!game || !game.gameId) {
            throw new Error('Game creation failed: No game ID returned')
          }
          
          setGameId(game.gameId)
          setGameState(game)
          
          // Initialize intro state (only if not completed before)
          // Use hasCompletedIntro directly (memoized) - don't call it in dependency array
          const shouldShowIntro = !hasCompletedIntro('sandy')
          console.log('🎬 Should show intro:', shouldShowIntro)
          if (shouldShowIntro) {
            setShowIntro(true)
            setIsLoading(false) // Wait for intro
          } else {
            setShowIntro(false)
            setIsLoading(false) // Game ready
          }
          
          console.log('✅ Sandy tutorial initialization complete')
          gameStartTimeRef.current = Date.now()
          isInitializingRef.current = false
          return
        }
        
        // For ranked modes, we'll need payment/play token logic
        // This will be implemented when we create the API routes
        console.log('🚀 Proceeding to game creation for ranked mode:', selectedMode)
        
        // Get player name
        let name = profileUsername || 'Player'
        if (!name || name === 'Player') {
          name = playerAddress 
            ? `Player ${playerAddress.slice(0, 6)}`
            : 'Player'
        }
        console.log('📝 Player name:', name)
        setPlayerName(name)

        // Check if cancelled before proceeding
        if (cancelInitRef.current || initGameIdRef.current !== currentInitKey) {
          console.log('⚠️ Initialization cancelled before ranked mode setup')
          return
        }

        // TODO: Check if ranked mode requires play token
        const isRanked = isRankedMode(selectedMode)
        console.log('🎯 Mode is ranked:', isRanked)
        
        if (isRanked && !playerAddress) {
          setPlayTokenError('Player address required for ranked games')
          setIsLoading(false)
          isInitializingRef.current = false
          return
        }

        // TODO: Request play token for ranked modes
        // TODO: Process payment if needed
        
        // Check if cancelled before API call
        if (cancelInitRef.current || initGameIdRef.current !== currentInitKey) {
          console.log('⚠️ Initialization cancelled before ranked API call')
          return
        }
        
        // Create game via API
        console.log('🚀 Creating game via API...')
        const game = await gameAPI.createGame(selectedMode, name, playerAddress || undefined, false)
        
        // Check if cancelled after API call
        if (cancelInitRef.current || initGameIdRef.current !== currentInitKey) {
          console.log('⚠️ Initialization cancelled after ranked API call')
          return
        }
        
        if (!game || !game.gameId) {
          throw new Error('Game creation failed: No game ID returned')
        }
        
        setGameId(game.gameId)
        setGameState(game)
        
        // Initialize intro state (only if not completed before)
        const shouldShowIntro = !hasCompletedIntro(selectedMode)
        console.log('🎬 Should show intro:', shouldShowIntro)
        if (shouldShowIntro) {
          setShowIntro(true)
          setIsLoading(false) // Wait for intro
        } else {
          setShowIntro(false)
          setIsLoading(false) // Game ready
        }
        
        console.log('✅ Game initialization complete')
        gameStartTimeRef.current = Date.now()
        isInitializingRef.current = false
        
      } catch (error) {
        // Only set error if initialization wasn't cancelled
        if (!cancelInitRef.current && initGameIdRef.current === currentInitKey) {
          console.error('❌ Failed to initialize game:', error)
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize game. Please try again.'
          setGameInitError(errorMessage)
          setIsLoading(false)
        }
        isInitializingRef.current = false
      }
    }

    initGame()

    // Cleanup function to cancel initialization if dependencies change
    return () => {
      // Only cancel if this is still the current initialization
      if (initGameIdRef.current === currentInitKey) {
        cancelInitRef.current = true
        isInitializingRef.current = false
      }
    }
  }, [selectedMode, playerAddress, profileUsername]) // Removed hasCompletedIntro and setGameState from deps to prevent re-runs

  // Call onGameStart callback
  useEffect(() => {
    if (!isLoading && gameId && !hasCalledOnGameStart.current) {
      hasCalledOnGameStart.current = true
      onGameStart?.()
    }
  }, [isLoading, gameId, onGameStart])

  // Handle splash screen
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false)
    // After splash, always show main menu (original Ape In flow)
    setShowMainMenu(true)
  }, [])

  // Handle intro completion (SmartBotIntro passes skip: boolean)
  const handleIntroComplete = useCallback(async (skip: boolean = false) => {
    console.log('🎬 Intro completed, starting game...', { skip, selectedMode, gameId })
    setShowIntro(false)
    if (selectedMode) {
      markIntroCompleted(selectedMode)
    }
    
    // Ensure game state is set to playing after intro completes
    const currentGameId = gameId // Capture in closure
    if (currentGameId) {
      try {
        // Refresh game state to ensure it's properly initialized
        const gameState = await gameAPI.getGameState(currentGameId)
        if (gameState) {
          // Use Zustand's setGameState directly (stable reference, no need in deps)
          useGameStore.getState().setGameState(gameState)
          // If game is still in waiting state, we'll transition to playing on first card draw
          // The draw card route will handle the transition
        }
      } catch (error) {
        console.error('Failed to refresh game state after intro:', error)
      }
    }
  }, [selectedMode, markIntroCompleted, gameId]) // Removed setGameState - use Zustand's stable action directly

  // Handle game end (called from GameBoard)
  const handleGameEnd = useCallback((result: {
    winner: string
    playerScore: number
    opponentScore: number
    hasForfeited: boolean
  }) => {
    const { winner, playerScore, opponentScore, hasForfeited } = result
    const { roundCount, maxRounds } = useGameStore.getState()
    
    const gameDuration = gameStartTimeRef.current 
      ? Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
      : 0
    
    const roundsRemaining = Math.max(0, maxRounds - roundCount)
    
    // Calculate points
    const points = calculatePoints({
      gameMode: selectedMode || 'sandy',
      roundsRemaining,
      maxRounds,
      hasForfeited,
    })
    
    console.log('🎮 Game ended:', {
      mode: selectedMode,
      winner,
      playerScore,
      opponentScore,
      points,
      roundsRemaining,
      hasForfeited,
    })
    
    // If forfeited, return to main menu after a short delay
    if (hasForfeited) {
      setTimeout(() => {
        resetGame()
        setGameId('')
        setSelectedMode(undefined)
        setShowMainMenu(true)
      }, 2500) // Wait 2.5 seconds to show forfeit message
    }
    
    // Call parent callback
    onGameEnd?.({
      score: playerScore,
      mode: selectedMode || 'sandy',
      metadata: {
        winner,
        opponentScore,
        roundsPlayed: roundCount,
        roundsRemaining,
        duration: gameDuration,
        hasForfeited,
      },
      points,
    })
  }, [selectedMode, onGameEnd, resetGame])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-purple-300">Loading game...</p>
        </div>
      </div>
    )
  }

  // Error state - return to menu instead of hub
  if (playTokenError || gameInitError) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center max-w-md mx-auto p-6 bg-slate-800/90 rounded-xl border border-red-500/30">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-3">Game Error</h2>
          <p className="text-red-300 mb-6">{playTokenError || gameInitError}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setPlayTokenError(null)
                setGameInitError(null)
                resetGame()
                setGameId('')
                setSelectedMode(undefined)
                setShowMainMenu(true)
              }}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-all"
            >
              Return to Menu
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-semibold transition-all"
              >
                Exit to Hub
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Splash screen
  if (showSplash) {
    return <WelcomeSplash onStart={handleSplashComplete} />
  }

  // Main menu screen (original Ape In menu after splash)
  if (showMainMenu) {
    return (
      <MainMenu
        onSelectMode={handleModeSelected}
        playerAddress={playerAddress}
        onClose={onClose}
      />
    )
  }

  // Intro screen - ensure selectedMode is valid before rendering
  if (showIntro && selectedMode && BOT_CONFIGS[selectedMode]) {
    return (
      <SmartBotIntro
        gameMode={selectedMode}
        onComplete={handleIntroComplete}
        autoPlay={true} // Auto-start game after intro completes (matches original behavior)
      />
    )
  }

  // Main game
  if (!gameId) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <p className="text-red-500">Game ID not found</p>
        </div>
      </div>
    )
  }

  // Handle return to menu (for forfeited games)
  const handleReturnToMenu = useCallback(() => {
    resetGame()
    setGameId('')
    setSelectedMode(undefined)
    setShowMainMenu(true)
  }, [resetGame])

  // Handle game exit/forfeit confirmation when X button is clicked from game modal
  const handleGameExit = useCallback(() => {
    // Get current state directly from store to check game status
    const currentState = useGameStore.getState()
    const currentGameId = gameId // Capture current gameId
    
    // Check if game is in progress
    // Only show forfeit confirmation if we have a gameId and the game is actually playing/waiting
    // We check the store state directly to avoid dependency issues
    const isGameInProgress = currentGameId && (currentState.gameStatus === 'playing' || currentState.gameStatus === 'waiting')
    
    if (isGameInProgress) {
      // Game is in progress, show forfeit confirmation dialog
      setShowForfeitConfirmFromModal(true)
      return true // Return true to indicate forfeit confirmation is showing
    } else {
      // No active game - determine what to do based on current state
      if (!currentGameId) {
        // No game ID means we're in menu, close to hub
        onClose?.()
      } else {
        // Has gameId but game not in progress - return to menu
        resetGame()
        setGameId('')
        setSelectedMode(undefined)
        setShowMainMenu(true)
      }
      return false
    }
  }, [gameId, onClose, resetGame]) // Minimal dependencies to prevent infinite loops

  // Expose handleGameExit via ref for parent component (game modal)
  useImperativeHandle(ref, () => ({
    handleGameExit,
  }), [handleGameExit])

  // Confirm forfeit from game modal X button
  const confirmForfeitFromModal = useCallback(async () => {
    if (!gameId) {
      onClose?.()
      return
    }

    try {
      await gameAPI.forfeitGame(gameId)
      
      // Get current game state for forfeit result
      const currentState = useGameStore.getState()
      const currentRoundCount = currentState.roundCount
      const currentMaxRounds = currentState.maxRounds
      const currentPlayerScore = currentState.playerScore
      const currentOpponentScore = currentState.opponentScore
      const currentOpponentName = currentState.opponentName // Get from store state
      
      // Reset game state and return to menu
      setShowForfeitConfirmFromModal(false)
      resetGame()
      setGameId('')
      setSelectedMode(undefined)
      setShowMainMenu(true)
      
      // Call onGameEnd with forfeit result
      if (onGameEnd) {
        const gameDuration = gameStartTimeRef.current 
          ? Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
          : 0
        const roundsRemaining = Math.max(0, currentMaxRounds - currentRoundCount)
        
        onGameEnd({
          score: currentPlayerScore,
          mode: selectedMode || 'sandy',
          metadata: {
            winner: currentOpponentName || 'Opponent',
            opponentScore: currentOpponentScore,
            roundsPlayed: currentRoundCount,
            roundsRemaining,
            duration: gameDuration,
            hasForfeited: true,
          },
          points: 0, // Forfeits earn 0 points
        })
      }
    } catch (error) {
      console.error('Failed to forfeit from modal:', error)
      setShowForfeitConfirmFromModal(false)
    }
  }, [gameId, onGameEnd, onClose, resetGame, selectedMode])

  // Cancel forfeit from game modal - return to game
  const cancelForfeitFromModal = useCallback(() => {
    setShowForfeitConfirmFromModal(false)
  }, [])

  return (
    <div className="min-h-[600px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
      {/* Forfeit Confirmation Dialog from Game Modal X button */}
      {showForfeitConfirmFromModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-[200]">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 p-8 rounded-2xl w-full max-w-md text-center"
          >
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-3">Forfeit Game?</h2>
            <p className="text-slate-300 mb-4">
              This game is about to be forfeited and <span className="font-bold text-red-400">0 points will be gained</span>.
            </p>
            <p className="text-slate-400 mb-6">Do you wish to forfeit?</p>
            <div className="bg-slate-700/50 rounded-lg p-4 mb-6 text-left">
              <div className="text-sm text-slate-300 mb-2">Current Progress:</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-400">Mode:</span>
                <span className="font-bold capitalize">{selectedMode || 'Sandy'}</span>
                <span className="text-slate-400">Round:</span>
                <span className="font-bold">{useGameStore.getState().roundCount}/{useGameStore.getState().maxRounds}</span>
                <span className="text-slate-400">Your Score:</span>
                <span className="font-bold text-cyan-400">{useGameStore.getState().playerScore}</span>
                <span className="text-slate-400">Opponent Score:</span>
                <span className="font-bold text-purple-400">{useGameStore.getState().opponentScore}</span>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={cancelForfeitFromModal}
                className="flex-1 px-6 py-3 rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-700 font-bold text-slate-300 hover:text-white transition-all"
              >
                No
              </button>
              <button
                onClick={confirmForfeitFromModal}
                className="flex-1 px-6 py-3 rounded-lg border-2 border-red-500 bg-red-600/20 hover:bg-red-600/30 font-bold text-red-400 hover:text-red-300 transition-all shadow-lg hover:shadow-red-500/30"
              >
                Yes
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <GameBoard
        gameId={gameId}
        playerName={playerName}
        opponentName={useGameStore.getState().opponentName || (selectedMode ? gameNames[selectedMode] : 'Opponent') || 'Opponent'}
        gameMode={selectedMode}
        onPlayIntro={handleIntroComplete}
        onGameEnd={handleGameEnd}
        onReturnToMenu={handleReturnToMenu}
      />
    </div>
  )
})

ApeInGame.displayName = "ApeInGame"

// Export as default for consistency with CryptokuGame
export default ApeInGame

