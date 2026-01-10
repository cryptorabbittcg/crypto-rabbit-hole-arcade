import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import Card from './Card'
import Dice from './Dice'
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { gameAPI } from '../services/api'
import { GameMode } from '../types/game'
import { verifyApeInGameWithZkVerify, mockVerifyApeInGame, createGameStateFromGame, type ApeInGameState, type GameMove } from '../lib/zkverify'
import { useIdentity } from '../hooks/useIdentity'
import { useNavigate } from 'react-router-dom'
import { submitResult } from '../services/resultSubmissionService'
import { isRankedMode } from '../config/gameModes'
import type { GameResult } from '../types/result'
import { calculatePoints, sendPointsToArcade } from '../services/pointsService'
import { PlayBalanceService } from '../services/playBalanceService'

interface GameBoardProps {
  gameId: string
  playerName: string
  opponentName: string
  gameMode?: GameMode
  onPlayIntro?: () => void
}

export default function GameBoard({ gameId, playerName, opponentName, gameMode, onPlayIntro }: GameBoardProps) {
  const identity = useIdentity()
  const navigate = useNavigate()
  const [playerProfile, setPlayerProfile] = useState<{pfp?: string, avatar?: string} | null>(null)
  const [gameStartTime, setGameStartTime] = useState(() => Date.now()) // Track game start for duration
  const [resultSubmissionState, setResultSubmissionState] = useState<{
    isSubmitting: boolean
    submitted: boolean
    error: string | null
  }>({
    isSubmitting: false,
    submitted: false,
    error: null,
  })
  const [hasForfeited, setHasForfeited] = useState(false) // Track if player forfeited
  const submitLockRef = useRef(false) // Ref-based lock to prevent double submission across renders
  
  const {
    playerScore,
    opponentScore,
    playerTurnScore,
    currentCard,
    lastRoll,
    isPlayerTurn,
    gameStatus,
    winner,
    apeInActive,
    roundCount,
    maxRounds,
    unlimitedRounds,
    playToken,
    runId,
    setCurrentCard,
    setLastRoll,
    updateScore,
    toggleTurn,
    setGameState,
  } = useGameStore()

  // Load player profile for PFP display
  useEffect(() => {
    if (identity.address) {
      const savedProfile = localStorage.getItem(`profile_${identity.address}`)
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile)
          setPlayerProfile(profile)
        } catch (error) {
          console.error('Failed to parse player profile:', error)
        }
      }
    }
  }, [identity.address])

  const [isDrawing, setIsDrawing] = useState(false)
  const [isRolling, setIsRolling] = useState(false)
  const [floatingMessage, setFloatingMessage] = useState<{text: string, sats?: number} | null>(null)
  const [botTurnData, setBotTurnData] = useState<{card: any, roll: number | null, turnSats: number, isRolling?: boolean} | null>(null)
  const [showEnlargedAvatar, setShowEnlargedAvatar] = useState(false)
  const [isBotPlaying, setIsBotPlaying] = useState(false)
  const [showRoundPopup, setShowRoundPopup] = useState(false)
  const [currentRound, setCurrentRound] = useState(1)
  
  // zkVerify verification state
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationProofId, setVerificationProofId] = useState<string | null>(null)
  const [gameMoves, setGameMoves] = useState<GameMove[]>([])
  const [cardsDrawn, setCardsDrawn] = useState<number[]>([])
  const [diceRolls, setDiceRolls] = useState<number[]>([])
  const [pointsSynced, setPointsSynced] = useState(false)

  // Refresh game state from backend
  const refreshGameState = async () => {
    try {
      const gameData = await gameAPI.getGameState(gameId)
      setGameState(gameData)
    } catch (error) {
      console.error('Failed to refresh game state:', error)
    }
  }

  // Detect round changes and show popup
  React.useEffect(() => {
    if (roundCount > currentRound && !isBotPlaying) {
      setCurrentRound(roundCount)
      setShowRoundPopup(true)
      setTimeout(() => setShowRoundPopup(false), 2500)
    }
  }, [roundCount, currentRound, isBotPlaying])

  const handleDrawCard = async () => {
    if (!isPlayerTurn || isDrawing) return

    setIsDrawing(true)
    setFloatingMessage(null)

    try {
      const card = await gameAPI.drawCard(gameId)
      
      // Track move for zkVerify
      const move: GameMove = {
        type: 'draw_card',
        value: card.value,
        timestamp: Date.now(),
        round: roundCount
      }
      setGameMoves(prev => [...prev, move])
      setCardsDrawn(prev => [...prev, card.value])
      
      // Refresh game state to sync
      await refreshGameState()

      if (card.name === 'Ape In!') {
        // Ape In! card - show message, keep card visible until next draw
        setFloatingMessage({text: '🚀 APE IN ACTIVATED! Next card value DOUBLED!'})
        useGameStore.getState().activateApeIn()
        
        // Clear the floating message after 2 seconds but keep the Ape In! card visible
        setTimeout(() => {
          setFloatingMessage(null)
        }, 2000)
      }

      setIsDrawing(false)
    } catch (error) {
      console.error('Failed to draw card:', error)
      setFloatingMessage({text: 'Failed to draw card. Please try again.'})
      setIsDrawing(false)
    }
  }

  const handleRollDice = async () => {
    if (!isPlayerTurn || !currentCard || currentCard.type === 'Special' || isRolling) return

    setIsRolling(true)
    setFloatingMessage(null)

    try {
      const result = await gameAPI.rollDice(gameId)
      console.log('Roll result:', result) // Debug logging
      setLastRoll(result.value)
      
      // Track dice roll for zkVerify
      const move: GameMove = {
        type: 'roll_dice',
        value: result.value,
        timestamp: Date.now(),
        round: roundCount
      }
      setGameMoves(prev => [...prev, move])
      setDiceRolls(prev => [...prev, result.value])

      setTimeout(async () => {
        setIsRolling(false)

        if (result.success) {
          // Show floating success message with sats gained (KEEP CARD VISIBLE)
          const satsGained = result.satsGained !== undefined ? result.satsGained : currentCard.value
          console.log('Sats gained:', satsGained, 'Current card value:', currentCard.value, 'Ape In active:', apeInActive) // Debug
          setFloatingMessage({
            text: `Great roll! +${satsGained} sats`,
            sats: result.turnScore
          })
          
          // Wait for message to display, THEN clear card (but keep Ape In! cards visible)
          setTimeout(async () => {
            setFloatingMessage(null)
            // Only clear card if it's not an Ape In! card - Ape In! cards stay until next draw
            if (!currentCard || currentCard.name !== "Ape In!") {
              setCurrentCard(null)
            }
            await refreshGameState()
          }, 2000)
        } else {
          // Player busted - show message then replay bot turn
          setFloatingMessage({text: result.message || 'Busted! Turn ended.'})
          // Only clear card if it's not an Ape In! card - Ape In! cards stay until next draw
          if (!currentCard || currentCard.name !== "Ape In!") {
            setCurrentCard(null)
          }
          
          setTimeout(async () => {
            setFloatingMessage(null)
            
            // Replay bot's turn if actions are provided
            if (result.botActions && result.botActions.length > 0) {
              await replayBotTurn(result.botActions)
            } else {
              await refreshGameState()
            }
          }, 1500)
        }
      }, 1000)
    } catch (error) {
      console.error('Failed to roll dice:', error)
      setFloatingMessage({text: 'Failed to roll dice. Please try again.'})
      setIsRolling(false)
    }
  }

  // Replay bot's turn with SLOW, clear sequential animations (1 second per step)
  const replayBotTurn = async (botActions: any[]) => {
    if (!botActions || botActions.length === 0) return
    
    setIsBotPlaying(true)
    let previousTurnScore = 0
    
    // Step 1: Announce bot's turn
    setFloatingMessage({text: `${opponentName}'s turn...`})
    await new Promise(resolve => setTimeout(resolve, 1500))
    setFloatingMessage(null)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Process each action sequentially
    for (let i = 0; i < botActions.length; i++) {
      const action = botActions[i]
      
      if (action.type === 'ape_in') {
        // Handle Ape In card special case
        const cardData = action.card
        setBotTurnData({card: cardData, roll: null, turnSats: previousTurnScore, isRolling: false})
        setFloatingMessage({text: `${opponentName} draws APE IN! 🚀`})
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Show "Next card doubled" message but keep Ape In! card visible
        setFloatingMessage({text: `Next card value doubled!`})
        await new Promise(resolve => setTimeout(resolve, 1500))
        setFloatingMessage(null)
        // Don't clear the Ape In! card - it stays visible until next card is drawn
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } else if (action.type === 'draw') {
        // Step 2: Show card being drawn
        const cardData = action.card
        setBotTurnData({card: cardData, roll: null, turnSats: previousTurnScore, isRolling: false})
        setFloatingMessage({text: `${opponentName} draws a card...`})
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Step 3: Pause to show the card clearly
        setFloatingMessage(null)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Step 4: Look for the corresponding roll action
        const nextAction = botActions[i + 1]
        if (nextAction && nextAction.type === 'roll') {
          i++ // Skip the roll action in next iteration
          
          const rollValue = nextAction.value
          const isSuccess = nextAction.success
          const currentTurnScore = nextAction.turnScore || 0
          const satsGained = currentTurnScore - previousTurnScore
          
          // Step 5: Announce rolling
          setFloatingMessage({text: `${opponentName} rolls...`})
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Step 6: Start dice rolling animation
          setBotTurnData(prev => prev ? {...prev, isRolling: true} : null)
          await new Promise(resolve => setTimeout(resolve, 800))
          
          // Step 7: Show the roll result
          setBotTurnData(prev => prev ? {...prev, roll: rollValue, isRolling: false} : null)
          setFloatingMessage({text: `Rolled: ${rollValue}`})
          await new Promise(resolve => setTimeout(resolve, 1200))
          
          // Step 8: Show outcome
          if (isSuccess) {
            previousTurnScore = currentTurnScore
            setBotTurnData(prev => prev ? {...prev, turnSats: currentTurnScore} : null)
            setFloatingMessage({text: `+${satsGained} sats`, sats: currentTurnScore})
            await new Promise(resolve => setTimeout(resolve, 1500))
          } else {
            const message = nextAction.message || 'Busted!'
            setFloatingMessage({text: `${opponentName}: ${message}`})
            await new Promise(resolve => setTimeout(resolve, 1800))
            break // Bot busted, end turn
          }
        }
        
        // Step 9: Clear card and pause before next action
        setFloatingMessage(null)
        setBotTurnData(prev => prev ? {...prev, card: null, roll: null, isRolling: false} : null)
        await new Promise(resolve => setTimeout(resolve, 800))
        
      } else if (action.type === 'stack') {
        // Bot decided to stack
        const finalScore = action.finalScore || 0
        setFloatingMessage({text: `${opponentName} stacks ${previousTurnScore} sats!`})
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    // Step 9: Clean up and return to player's turn
    setBotTurnData(null)
    setIsBotPlaying(false)
    setFloatingMessage({text: 'Your turn!'})
    await new Promise(resolve => setTimeout(resolve, 1200))
    setFloatingMessage(null)
    await refreshGameState()
  }

  const handleStackSats = async () => {
    if (!isPlayerTurn || playerTurnScore === 0 || currentCard !== null) return

    try {
      setFloatingMessage({text: 'Banking sats...'})
      const result = await gameAPI.stackSats(gameId)
      
      setTimeout(async () => {
        setFloatingMessage(null)
        
        // Replay bot's turn if actions are provided
        if (result.botActions && result.botActions.length > 0) {
          await replayBotTurn(result.botActions)
        }
        
        // Final state update
        await refreshGameState()
      }, 800)
    } catch (error) {
      console.error('Failed to stack sats:', error)
      setFloatingMessage({text: 'Failed to stack sats. Please try again.'})
    }
  }

  const handleForfeit = async () => {
    if (window.confirm('Are you sure you want to forfeit?')) {
      try {
        // Mark as forfeited for result submission
        setHasForfeited(true)
        
        // Track forfeit move for zkVerify
        const move: GameMove = {
          type: 'forfeit',
          timestamp: Date.now(),
          round: roundCount
        }
        setGameMoves(prev => [...prev, move])
        
        await gameAPI.forfeitGame(gameId)
        setFloatingMessage({text: 'Game forfeited.'})
        // Game will end and result submission will pick up FORFEIT status
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      } catch (error) {
        console.error('Failed to forfeit:', error)
        setHasForfeited(false) // Reset on error
      }
    }
  }

  // zkVerify verification handler
  const handleZkVerifyValidation = useCallback(async () => {
    if (isVerifying) return
    
    setIsVerifying(true)
    
    try {
      // Check if zkVerify is enabled - default to mock mode if no API key
      const hasApiKey = import.meta.env.VITE_ZKVERIFY_API_KEY && 
                        import.meta.env.VITE_ZKVERIFY_API_KEY.length > 0
      const useZkVerify = import.meta.env.VITE_USE_ZKVERIFY !== 'false' && hasApiKey

      // Create game state for verification
      const gameState = createGameStateFromGame(
        gameId,
        playerName,
        gameMode || 'sandy',
        useGameStore.getState().winningScore || 150, // Default winning score
        playerScore,
        roundCount,
        cardsDrawn,
        diceRolls,
        gameMoves,
        identity.address || '0x0000000000000000000000000000000000000000'
      )

      let verificationResult
      
      if (useZkVerify) {
        // Use real zkVerify verification
        console.log('Using zkVerify API for verification...')
        verificationResult = await verifyApeInGameWithZkVerify(gameState)
      } else {
        // Use mock verification for development (fast, local)
        console.log('Using mock verification (no API key set)...')
        verificationResult = mockVerifyApeInGame(gameState)
      }

      if (verificationResult.isValid) {
        // Store proof ID for display
        setVerificationProofId(verificationResult.proofId || null)
        console.log('✅ Game verified!', verificationResult.proofId)
      } else {
        // Verification failed - show error
        setFloatingMessage({text: verificationResult.message || 'Victory verification failed'})
        console.error('❌ zkVerify verification failed:', verificationResult.error)
      }
    } catch (error) {
      console.error('Verification error:', error)
      setFloatingMessage({text: 'Verification error - please try again'})
    } finally {
      setIsVerifying(false)
    }
  }, [gameId, playerName, gameMode, playerScore, roundCount, cardsDrawn, diceRolls, gameMoves, isVerifying, identity.address])

  // Check for victory condition and trigger verification
  useEffect(() => {
    if (gameStatus === 'finished' && winner === playerName && !isVerifying && !verificationProofId) {
      // Player won - trigger zkVerify validation
      handleZkVerifyValidation()
    }
  }, [gameStatus, winner, playerName, isVerifying, verificationProofId, handleZkVerifyValidation, identity.address])

  // Reset result submission state when game status changes away from finished or when new game starts
  useEffect(() => {
    if (gameStatus !== 'finished') {
      // Game is not finished - reset submission state for next run
      setResultSubmissionState({
        isSubmitting: false,
        submitted: false,
        error: null,
      })
      setHasForfeited(false)
      setGameStartTime(Date.now()) // Reset game start time for new game
      submitLockRef.current = false // Reset submission lock for new run
    }
  }, [gameStatus])

  // Submit result to Arcade Hub when game ends
  useEffect(() => {
    if (
      gameStatus === 'finished' &&
      !resultSubmissionState.isSubmitting &&
      !resultSubmissionState.submitted &&
      !submitLockRef.current && // Check ref lock to prevent double submission
      gameMode &&
      identity.address
    ) {
      const submitGameResult = async () => {
        // Set lock immediately to prevent duplicate submissions across renders
        submitLockRef.current = true
        // Set submitting state immediately to prevent double triggers from re-renders
        setResultSubmissionState({ isSubmitting: true, submitted: false, error: null })

        try {
          // Determine result type - check for forfeit first
          let result: GameResult
          if (hasForfeited) {
            result = 'FORFEIT'
          } else if (!winner) {
            result = 'DRAW'
          } else if (winner === playerName) {
            result = 'WIN'
          } else {
            result = 'LOSS'
          }

          // Check if mode is ranked
          const isRanked = isRankedMode(gameMode)

          // Sandy (tutorial/unranked) should NOT submit ranked results
          // Only submit if ranked mode OR if explicitly unranked (will be submitted with isRanked=false)
          if (!isRanked) {
            // Sandy/tutorial mode: Don't submit result at all (simplest approach)
            console.log('ℹ️ Skipping result submission for unranked mode (Sandy):', gameMode)
            setResultSubmissionState({ isSubmitting: false, submitted: false, error: null })
            submitLockRef.current = false // Release lock when skipping
            return
          }

          // Ranked modes require playToken
          if (!playToken) {
            const error = 'Play token required for ranked result submission'
            console.error('❌', error)
            setResultSubmissionState({ isSubmitting: false, submitted: false, error })
            submitLockRef.current = false // Release lock on error
            return
          }

          if (!runId) {
            const error = 'Run ID required for result submission'
            console.error('❌', error)
            setResultSubmissionState({ isSubmitting: false, submitted: false, error })
            submitLockRef.current = false // Release lock on error
            return
          }

          // Calculate game duration
          const durationMs = Date.now() - gameStartTime
          const timeSeconds = Math.floor(durationMs / 1000)

          // Determine opponent (bot id for single-player modes)
          const opponent = gameMode === 'pvp' 
            ? 'pvp' 
            : gameMode === 'multiplayer' || gameMode === 'tournament'
            ? gameMode
            : gameMode // Bot id: aida, lana, nifty, enj1n, sandy

          // Determine game subtype
          const gameSubtype: 'single_player' | 'pvp' | 'multiplayer' = gameMode === 'pvp' 
            ? 'pvp' 
            : gameMode === 'multiplayer' || gameMode === 'tournament'
            ? 'multiplayer'
            : 'single_player'

          // Map game mode for submission (enj1n -> en-j1n)
          const gameModeForSubmission = gameMode === 'enj1n' ? 'en-j1n' : gameMode

          // Get client version from package.json via Vite env or fallback
          const clientVersion = import.meta.env.VITE_APP_VERSION || '1.0.0'
          
          // Submit result
          const submissionPayload = {
            playerAddress: identity.address!,
            modeId: gameMode, // Uses same modeId as in GAME_MODE_CONFIGS
            isRanked: true,
            result,
            runId,
            playToken,
            game_type: 'ape_in' as const,
            game_mode: gameModeForSubmission as 'sandy' | 'aida' | 'lana' | 'en-j1n' | 'nifty',
            game_subtype: gameSubtype,
            meta: {
              durationMs,
              rawScore: playerScore,
              opponent,
              clientVersion,
              timeSeconds,
              roundsRemaining: Math.max(0, maxRounds - roundCount),
            },
          }

          console.log('📤 Submitting ranked result:', submissionPayload)

          const response = await submitResult(submissionPayload)

          if (response.success) {
            console.log('✅ Result submitted successfully:', response.message)
            setResultSubmissionState({ isSubmitting: false, submitted: true, error: null })
            // Keep lock true when successfully submitted to prevent re-submission
          } else {
            const error = response.error || 'Failed to submit result'
            console.error('❌ Result submission failed:', error)
            setResultSubmissionState({ isSubmitting: false, submitted: false, error })
            submitLockRef.current = false // Release lock on error so user can retry if needed
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error('❌ Exception during result submission:', error)
          setResultSubmissionState({ isSubmitting: false, submitted: false, error: errorMessage })
          submitLockRef.current = false // Release lock on exception
        }
      }

      submitGameResult()
    }
    // Remove resultSubmissionState from dependencies to prevent re-triggering
    // The state checks in the condition above prevent double submission
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameStatus,
    winner,
    playerName,
    gameMode,
    playerScore,
    identity.address,
    playToken,
    runId,
    gameStartTime,
    hasForfeited,
  ])

  // Calculate and send points to arcade hub when game ends (for all modes except Sandy)
  // Also record game completion for play balance rewards
  useEffect(() => {
    if (gameStatus === 'finished' && gameMode && identity.address) {
      // Record game completion (for reward tracking)
      const rewardResult = PlayBalanceService.recordGameCompleted(identity.address, gameMode)
      
      if (rewardResult.receivedReward) {
        console.log(`🎉 Reward! Received 5 free plays. New balance: ${rewardResult.newBalance}`)
        // Could show a notification here
      }

      // Calculate and send points (only if player won and didn't forfeit)
      if (winner === playerName && !hasForfeited && gameMode !== 'sandy') {
        // Calculate rounds remaining (bonus for completing in fewer rounds)
        const roundsRemaining = Math.max(0, maxRounds - roundCount)
        
        const points = calculatePoints({
          gameMode,
          roundsRemaining,
          maxRounds,
          hasForfeited,
        })
        
        const timeSeconds = Math.floor((Date.now() - gameStartTime) / 1000)
        
        // Send points to arcade hub via postMessage
        if (points > 0) {
          sendPointsToArcade({
            points,
            gameMode,
            score: playerScore,
            timeSeconds,
            roundsRemaining,
          })
          console.log('💰 Sent points to arcade hub:', { 
            points, 
            gameMode, 
            score: playerScore, 
            timeSeconds, 
            roundsRemaining,
            roundsUsed: roundCount,
            maxRounds 
          })
        }
      }
    }
  }, [gameStatus, winner, playerName, gameMode, playerScore, gameStartTime, hasForfeited, identity.address, roundCount, maxRounds])

  if (gameStatus === 'finished') {
    const playerWon = winner === playerName
    const isRanked = gameMode ? isRankedMode(gameMode) : false
    
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="game-board text-center py-12"
      >
        <h2 className="text-5xl font-bold mb-6">
          {playerWon ? '🎉 You Win!' : `${opponentName} Wins This Time!`}
        </h2>
        {!playerWon && (
          <p className="text-xl text-slate-300 mb-6">Better luck next game!</p>
        )}

        {/* Result Submission Status (for ranked modes) */}
        {isRanked && (
          <div className="mb-6 max-w-md mx-auto">
            {resultSubmissionState.isSubmitting && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 backdrop-blur-sm"
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin text-xl">⏳</div>
                  <span className="text-blue-300 font-medium">Submitting result...</span>
                </div>
              </motion.div>
            )}

            {resultSubmissionState.submitted && !resultSubmissionState.error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-4 backdrop-blur-sm"
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="text-xl">✅</div>
                  <span className="text-emerald-300 font-medium">Result submitted</span>
                </div>
              </motion.div>
            )}

            {resultSubmissionState.error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm"
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="text-xl">❌</div>
                  <span className="text-red-300 font-medium">
                    Submission failed: {resultSubmissionState.error}
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        )}
        
        {/* zkVerify Verification Status */}
        {playerWon && (
          <div className="mb-6">
            {isVerifying ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-6 mb-4 backdrop-blur-sm"
              >
                <div className="flex items-center justify-center gap-4">
                  <div className="relative">
                    <div className="animate-spin text-3xl">🔐</div>
                    <div className="absolute inset-0 animate-ping text-3xl opacity-20">🔐</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-blue-300 mb-1">Verifying Victory...</div>
                    <div className="text-sm text-blue-200/80">
                      {import.meta.env.VITE_ZKVERIFY_API_KEY && import.meta.env.VITE_ZKVERIFY_API_KEY.length > 0
                        ? "Generating zero-knowledge proof (3-7 seconds)"
                        : "Validating game rules"}
                    </div>
                    <div className="text-xs text-blue-300/60 mt-1">Every victory is cryptographically verified</div>
                  </div>
                </div>
              </motion.div>
            ) : verificationProofId ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-emerald-900/30 to-green-900/30 border border-emerald-500/40 rounded-xl p-6 mb-4 backdrop-blur-sm"
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="text-2xl">🔐</div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-emerald-300 mb-1">✓ Victory Verified!</div>
                    <div className="text-sm text-emerald-200/80">Cryptographically proven valid</div>
                    <div className="text-xs text-emerald-300/60 mt-1 font-mono">
                      Proof: {verificationProofId.slice(0, 16)}...
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </div>
        )}
        <div className="text-2xl mb-8">
          <div>Your Score: <span className="score-display">{playerScore}</span></div>
          <div className="flex items-center justify-center space-x-3">
            {/* Bot Avatar in Game Over Screen */}
            <img 
              src={`/assets/bots/${gameMode}.gif`} 
              alt={`${gameMode} avatar`} 
              className="w-8 h-8 object-cover rounded-full border-2 border-purple-500/50 shadow-lg" 
              onError={(e) => {
                console.log(`GIF failed for ${gameMode} Game Over, trying PNG...`);
                e.currentTarget.src = `/assets/bots/${gameMode}.png`;
              }}
              onLoad={(e) => {
                console.log(`Successfully loaded GIF Game Over portrait for ${gameMode}`);
              }}
            />
            <span>{opponentName} Score: <span className="score-display">{opponentScore}</span></span>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="btn-primary text-lg">
          Play Again
        </button>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Compact Score Display */}
      <div className="grid grid-cols-2 gap-3">
        <div className="game-board text-center py-3">
          {/* Player Avatar */}
          <div className="flex justify-center mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 shadow-lg flex items-center justify-center overflow-hidden">
              {playerProfile?.pfp ? (
                <img 
                  src={playerProfile.pfp} 
                  alt="Player profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm sm:text-lg">
                  {playerProfile?.avatar || '👤'}
                </span>
              )}
            </div>
          </div>
          <h3 className="text-base font-semibold mb-1 text-slate-300">{playerName}</h3>
          <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">{playerScore}</div>
          <div className="text-xs text-slate-400 mt-1">
            Turn: <span className="text-yellow-400 font-semibold">{playerTurnScore}</span>
          </div>
        </div>
        <div className="game-board text-center py-3">
          {/* Play Intro Link */}
          {onPlayIntro && (
            <div className="mb-2">
              <button
                onClick={onPlayIntro}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors underline hover:no-underline"
              >
                🎬 Play Intro
              </button>
            </div>
          )}
          
          {/* Bot Avatar */}
          <div className="flex justify-center mb-2">
            <img 
              src={`/assets/bots/${gameMode}.gif`} 
              alt={`${gameMode} avatar`} 
              className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded-full border-2 border-purple-500/50 shadow-lg cursor-pointer hover:scale-110 transition-transform duration-200" 
              onError={(e) => {
                console.log(`GIF failed for ${gameMode} GameBoard, trying PNG...`);
                e.currentTarget.src = `/assets/bots/${gameMode}.png`;
              }}
              onLoad={(e) => {
                console.log(`Successfully loaded GIF GameBoard score portrait for ${gameMode}`);
              }}
              onMouseEnter={() => setShowEnlargedAvatar(true)}
              onMouseLeave={() => setShowEnlargedAvatar(false)}
            />
          </div>
          <h3 className="text-base font-semibold mb-1 text-slate-300">{opponentName}</h3>
          <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">{opponentScore}</div>
          {isBotPlaying && botTurnData && (
            <div className="text-xs text-emerald-400 mt-1 animate-pulse">
              Turn: {botTurnData.turnSats}
            </div>
          )}
        </div>
      </div>

      {/* Compact Game Area */}
      <div className="game-board">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 py-4">
          {/* Card Section - Shows player OR bot card */}
          <div className="flex flex-col items-center space-y-2 w-full md:w-auto">
            <div className="transform-gpu">
              <Card
                card={isBotPlaying && botTurnData ? botTurnData.card : currentCard}
                isRevealing={isBotPlaying ? true : isDrawing}
                onClick={!isPlayerTurn || (!!currentCard && currentCard.type !== 'Special') || isDrawing || isBotPlaying ? undefined : handleDrawCard}
              />
            </div>
            {!currentCard && !isDrawing && !isBotPlaying && (
              <div className="text-xs text-slate-500 animate-pulse">👆 Click to draw</div>
            )}
            {isBotPlaying && (
              <div className="text-sm text-emerald-400 font-semibold animate-pulse">
                {opponentName}'s Turn
              </div>
            )}
          </div>

          {/* Dice and Buttons Section - Right side on desktop */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full md:w-auto">
            {/* Dice Section */}
            <div className="flex flex-col items-center space-y-2 w-full sm:w-auto">
              <div className="h-6 text-sm text-slate-400">
                {isRolling || (botTurnData?.isRolling ?? false) ? 'Rolling...' : 'Dice'}
              </div>
              
              <Dice 
                value={isBotPlaying && botTurnData ? botTurnData.roll : lastRoll} 
                isRolling={(() => {
                  const shouldRoll = isRolling || (botTurnData?.isRolling ?? false);
                  if (isBotPlaying) {
                    console.log('🎲 Dice Debug:', {
                      isBotPlaying,
                      isRolling,
                      botTurnDataIsRolling: botTurnData?.isRolling,
                      shouldRoll,
                      botRoll: botTurnData?.roll,
                      lastRoll
                    });
                  }
                  return shouldRoll;
                })()}
                onClick={!isPlayerTurn || !currentCard || currentCard.type === 'Special' || isRolling || isBotPlaying ? undefined : handleRollDice}
                disabled={!isPlayerTurn || !currentCard || currentCard.type === 'Special' || isRolling || isBotPlaying}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-1.5 sm:gap-2 w-full sm:w-auto sm:min-w-[160px]">
            {/* Dice Explanation Panel */}
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-3 mb-2 border border-slate-600/50">
              <div className="text-center">
                <div className="text-xs font-semibold text-slate-300 mb-1">🎲 Dice Rules</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  <span className="text-green-400 font-medium">2-6 = Safe</span> • Add card value to turn score<br/>
                  <span className="text-red-400 font-medium">1 = Bust!</span> • Lose turn score, end turn
                </div>
              </div>
            </div>
            <button
              onClick={handleDrawCard}
              disabled={!isPlayerTurn || (!!currentCard && currentCard.type !== 'Special') || isDrawing || isBotPlaying}
              className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm shadow-lg transition-all ${
                !isPlayerTurn || (!!currentCard && currentCard.type !== 'Special') || isDrawing || isBotPlaying
                  ? 'bg-slate-600 opacity-50 cursor-not-allowed'
                  : apeInActive
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 animate-pulse ring-2 ring-green-400'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 animate-pulse'
              }`}
            >
              {isDrawing ? '⏳ Drawing...' : apeInActive ? '🚀 Draw (APE IN!)' : '🎴 Draw Card'}
            </button>

            <button
              onClick={handleRollDice}
              disabled={!isPlayerTurn || !currentCard || currentCard.type === 'Special' || isRolling || isBotPlaying}
              className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm shadow-lg transition-all ${
                !isPlayerTurn || !currentCard || currentCard.type === 'Special' || isRolling || isBotPlaying
                  ? 'bg-slate-600 opacity-50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 animate-pulse'
              }`}
            >
              {isRolling ? '⏳ Rolling...' : '🎲 Roll Dice'}
            </button>

            <button
              onClick={handleStackSats}
              disabled={!isPlayerTurn || playerTurnScore === 0 || currentCard !== null || isBotPlaying}
              className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm shadow-lg transition-all ${
                !isPlayerTurn || playerTurnScore === 0 || currentCard !== null || isBotPlaying
                  ? 'bg-slate-600 opacity-50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 animate-pulse'
              }`}
            >
              💰 Stack {playerTurnScore > 0 ? `(${playerTurnScore})` : ''}
            </button>

              <button
                onClick={handleForfeit}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-xs sm:text-sm shadow-lg transition-all"
              >
                🏳️ Forfeit
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Floating Ape In Status Overlay */}
      {apeInActive && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="fixed top-20 sm:top-24 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-2xl border-2 border-yellow-400 font-bold text-center max-w-[90vw] mx-4"
        >
          <div className="text-base sm:text-lg">🚀 APE IN ACTIVE!</div>
          <div className="text-xs sm:text-sm">Next card value doubled!</div>
        </motion.div>
      )}

      {/* Floating Success Message */}
      {floatingMessage && (
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-2xl border-2 border-green-300 font-bold text-center max-w-[90vw] mx-4"
        >
          <div className="text-sm sm:text-lg">{floatingMessage.text}</div>
          {floatingMessage.sats !== undefined && (
            <div className="text-xs sm:text-sm mt-1">Turn Sats: {floatingMessage.sats}</div>
          )}
        </motion.div>
      )}

      {/* Floating Bearish Card Warning */}
      {currentCard?.type === 'Bearish' && isPlayerTurn && !lastRoll && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-gradient-to-br from-red-600 to-red-800 text-white px-4 sm:px-8 py-4 sm:py-6 rounded-2xl shadow-2xl border-4 border-red-400 max-w-[90vw] mx-4"
        >
          <div className="text-center">
            <div className="text-2xl sm:text-4xl mb-2 sm:mb-3">⚠️ BEARISH CARD!</div>
            <div className="text-lg sm:text-xl font-bold mb-2">{currentCard.penalty}</div>
            <div className="text-xs sm:text-sm opacity-90 mb-2 sm:mb-3">
              Roll an <span className="font-bold text-yellow-300">EVEN number (2, 4, or 6)</span> to dodge the penalty!
            </div>
            <div className="text-xs opacity-75">
              Rolling 1, 3, or 5 = Penalty applied!
            </div>
          </div>
        </motion.div>
      )}

      {/* Round Announcement Popup */}
      {showRoundPopup && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          className="fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-gradient-to-br from-purple-600 to-pink-600 text-white px-6 sm:px-12 py-6 sm:py-8 rounded-2xl shadow-2xl border-4 border-purple-300 max-w-[90vw] mx-4"
        >
          <div className="text-center">
            <div className="text-3xl sm:text-5xl font-black mb-2">
              ROUND {roundCount}
            </div>
            <div className="text-sm sm:text-lg opacity-90">
              {unlimitedRounds ? '∞' : `of ${maxRounds}`}
            </div>
          </div>
        </motion.div>
      )}

      {/* Enlarged Avatar Display */}
      {showEnlargedAvatar && gameMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onMouseLeave={() => setShowEnlargedAvatar(false)}
          onClick={() => setShowEnlargedAvatar(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-slate-800/95 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6 shadow-2xl max-w-sm w-full cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-purple-500/50 shadow-xl">
                <img 
                  src={`/assets/bots/${gameMode}.gif`} 
                  alt={`${gameMode} avatar`} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.log(`GIF failed for ${gameMode} enlarged, trying PNG...`);
                    e.currentTarget.src = `/assets/bots/${gameMode}.png`;
                  }}
                  onLoad={(e) => {
                    console.log(`Successfully loaded GIF enlarged portrait for ${gameMode}`);
                  }}
                />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{opponentName}</h3>
              <p className="text-slate-300 text-sm mb-4">
                {gameMode === 'sandy' && "🐰 Friendly tutorial bot - Perfect for beginners!"}
                {gameMode === 'aida' && "🧠 Strategic and analytical - Balanced challenge"}
                {gameMode === 'lana' && "🔧 High-risk, high-reward - Aggressive gameplay"}
                {gameMode === 'enj1n' && "🔥 Relentless and aggressive - Only for the brave!"}
                {gameMode === 'nifty' && "🎨 Unpredictable and creative - Unique strategies"}
              </p>
              <div className="text-xs text-slate-400 space-y-2">
                <div className="border-t border-slate-600 pt-2">
                  <div className="font-semibold text-slate-300 mb-1">🎮 Game Rules:</div>
                  <div>• Draw card → Roll dice → Stack sats</div>
                  <div>• <span className="text-green-400">Ape In!</span> = Double next card value</div>
                  <div>• <span className="text-red-400">Roll 1</span> = Bust (lose turn score)</div>
                  <div>• First to {useGameStore.getState().winningScore || 150} sats wins!</div>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Click anywhere to close
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
