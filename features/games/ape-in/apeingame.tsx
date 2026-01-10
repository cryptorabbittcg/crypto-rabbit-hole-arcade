"use client"

import React, { useCallback, useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import GameBoard from "./components/GameBoard"
import SmartBotIntro from "./components/SmartBotIntro"
import WelcomeSplash from "./components/WelcomeSplash"
import { useGameStore } from "./store/gameStore"
import { GameMode } from "./types/game"
import { isRankedMode } from "./utils/constants"
import { calculatePoints } from "./utils/scoring"
import { useIntroTracking } from "./hooks/useIntroTracking"
import { gameAPI } from "./lib/api"

export interface ApeInGameProps {
  playerAddress: string | null // Hub identity - required
  profileUsername?: string // Hub identity - optional
  profileAvatarUrl?: string // Hub identity - optional
  mode?: GameMode // Game mode (defaults to 'sandy')
  onGameStart?: () => void
  onGameEnd?: (result: {
    score: number
    mode: string
    metadata?: any
    points?: number // Points earned
  }) => void
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

export function ApeInGame({
  playerAddress,
  profileUsername,
  profileAvatarUrl,
  mode = 'sandy', // Default to Sandy (tutorial)
  onGameStart,
  onGameEnd,
}: ApeInGameProps) {
  console.log('🎯 ApeInGame component rendered', { mode, playerAddress, profileUsername })
  
  const [isLoading, setIsLoading] = useState(true)
  const [playerName, setPlayerName] = useState('')
  const [gameId, setGameId] = useState('')
  const [showIntro, setShowIntro] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
  const [playTokenError, setPlayTokenError] = useState<string | null>(null)
  const { setGameState, gameStatus, setPlayToken, setRunId, resetGame } = useGameStore()
  const { hasCompletedIntro, markIntroCompleted } = useIntroTracking()
  const gameStartTimeRef = useRef<number | null>(null)
  const hasCalledOnGameStart = useRef(false)

  // Initialize game
  useEffect(() => {
    if (!mode) {
      console.error('❌ No mode provided')
      setIsLoading(false)
      return
    }

    // Prevent multiple initializations
    if (isLoading === false) {
      console.log('⚠️ Already initialized, skipping')
      return
    }

    const initGame = async () => {
      try {
        console.log('🎮 Initializing game for mode:', mode)
        console.log('👤 Player address:', playerAddress)
        
        // Sandy (tutorial) should always launch, no checks
        if (mode === 'sandy') {
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
          
          // Create game via API
          console.log('🚀 Creating Sandy tutorial game via API...')
          const game = await gameAPI.createGame('sandy', name, undefined, false)
          
          if (!game || !game.gameId) {
            throw new Error('Game creation failed: No game ID returned')
          }
          
          setGameId(game.gameId)
          setGameState(game)
          
          // Initialize intro state
          const shouldShowIntro = !hasCompletedIntro('sandy')
          console.log('🎬 Should show intro:', shouldShowIntro)
          setShowIntro(shouldShowIntro)
          
          console.log('✅ Sandy tutorial initialization complete')
          setIsLoading(false)
          gameStartTimeRef.current = Date.now()
          return
        }
        
        // For ranked modes, we'll need payment/play token logic
        // This will be implemented when we create the API routes
        console.log('🚀 Proceeding to game creation for ranked mode:', mode)
        
        // Get player name
        let name = profileUsername || 'Player'
        if (!name || name === 'Player') {
          name = playerAddress 
            ? `Player ${playerAddress.slice(0, 6)}`
            : 'Player'
        }
        console.log('📝 Player name:', name)
        setPlayerName(name)

        // TODO: Check if ranked mode requires play token
        const isRanked = isRankedMode(mode)
        console.log('🎯 Mode is ranked:', isRanked)
        
        if (isRanked && !playerAddress) {
          setPlayTokenError('Player address required for ranked games')
          setIsLoading(false)
          return
        }

        // TODO: Request play token for ranked modes
        // TODO: Process payment if needed
        
        // Create game via API
        console.log('🚀 Creating game via API...')
        const game = await gameAPI.createGame(mode, name, playerAddress || undefined, false)
        
        if (!game || !game.gameId) {
          throw new Error('Game creation failed: No game ID returned')
        }
        
        setGameId(game.gameId)
        setGameState(game)
        
        // Initialize intro state
        const shouldShowIntro = !hasCompletedIntro(mode)
        console.log('🎬 Should show intro:', shouldShowIntro)
        setShowIntro(shouldShowIntro)
        
        console.log('✅ Game initialization complete')
        setIsLoading(false)
        gameStartTimeRef.current = Date.now()
        
      } catch (error) {
        console.error('❌ Failed to initialize game:', error)
        setIsLoading(false)
      }
    }

    initGame()
  }, [mode, playerAddress, profileUsername, isLoading, setGameState, hasCompletedIntro])

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
  }, [])

  // Handle intro completion
  const handleIntroComplete = useCallback(() => {
    setShowIntro(false)
    markIntroCompleted(mode)
  }, [mode, markIntroCompleted])

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
      gameMode: mode,
      roundsRemaining,
      maxRounds,
      hasForfeited,
    })
    
    console.log('🎮 Game ended:', {
      mode,
      winner,
      playerScore,
      opponentScore,
      points,
      roundsRemaining,
      hasForfeited,
    })
    
    // Call parent callback
    onGameEnd?.({
      score: playerScore,
      mode,
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
  }, [mode, onGameEnd])

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

  // Error state
  if (playTokenError) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <p className="text-red-500 mb-4">{playTokenError}</p>
          <button
            onClick={() => {
              setPlayTokenError(null)
              setIsLoading(true)
              resetGame()
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Splash screen
  if (showSplash) {
    return <WelcomeSplash onStart={handleSplashComplete} />
  }

  // Intro screen
  if (showIntro) {
    return (
      <SmartBotIntro
        mode={mode}
        onComplete={handleIntroComplete}
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

  return (
    <div className="min-h-[600px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <GameBoard
        gameId={gameId}
        playerName={playerName}
        opponentName={(gameState as any)?.opponentName || gameNames[mode] || 'Opponent'}
        gameMode={mode}
        onPlayIntro={handleIntroComplete}
        onGameEnd={handleGameEnd}
      />
    </div>
  )
}

// Export as default for consistency with CryptokuGame
export default ApeInGame

