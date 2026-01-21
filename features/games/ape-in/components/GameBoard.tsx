import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import Card from './Card'
import Dice from './Dice'
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { gameAPI } from '../lib/api'
import { GameMode, GameState } from '../types/game'
import { verifyApeInGameWithZkVerify, mockVerifyApeInGame, createGameStateFromGame, type ApeInGameState, type GameMove } from '../lib/zkverify'
import { useArcade } from '@/components/providers'
import { isRankedMode } from '../utils/constants'
import { calculatePoints } from '../utils/scoring'
import { X } from 'lucide-react'

interface GameBoardProps {
  gameId: string
  playerName: string
  opponentName: string
  gameMode?: GameMode
  onPlayIntro?: () => void
  onGameEnd?: (result: {
    winner: string
    playerScore: number
    opponentScore: number
    hasForfeited: boolean
  }) => void
  onReturnToMenu?: () => void // Callback to return to main menu
}

export default function GameBoard({ gameId, playerName, opponentName, gameMode, onPlayIntro, onGameEnd, onReturnToMenu }: GameBoardProps) {
  const { address, profile } = useArcade()
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
  const [showConfetti, setShowConfetti] = useState(false) // Confetti for wins
  
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
    winningScore,
    playToken,
    runId,
    setCurrentCard,
    setLastRoll,
    updateScore,
    toggleTurn,
    setGameState,
    resetGame,
  } = useGameStore()

  // Load player profile for PFP display
  useEffect(() => {
    if (address) {
      // Use arcade hub profile if available
      if (profile?.avatar) {
        setPlayerProfile({ avatar: profile.avatar, pfp: profile.avatar })
      } else {
        // Fallback to localStorage if available
        const savedProfile = localStorage.getItem(`profile_${address}`)
        if (savedProfile) {
          try {
            const profileData = JSON.parse(savedProfile)
            setPlayerProfile(profileData)
          } catch (error) {
            console.error('Failed to parse player profile:', error)
          }
        }
      }
    }
  }, [address, profile])

  const [isDrawing, setIsDrawing] = useState(false)
  const [isRolling, setIsRolling] = useState(false)
  const [floatingMessage, setFloatingMessage] = useState<{text: string, sats?: number, isRekt?: boolean} | null>(null)
  const [botTurnData, setBotTurnData] = useState<{card: any, roll: number | null, turnSats: number, isRolling?: boolean} | null>(null)
  const [showEnlargedAvatar, setShowEnlargedAvatar] = useState(false)
  const [isBotPlaying, setIsBotPlaying] = useState(false)
  const [showRoundPopup, setShowRoundPopup] = useState(false)
  const [currentRound, setCurrentRound] = useState(1)
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false)
  
  // zkVerify verification state
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationProofId, setVerificationProofId] = useState<string | null>(null)
  const [gameMoves, setGameMoves] = useState<GameMove[]>([])
  const [cardsDrawn, setCardsDrawn] = useState<number[]>([])
  const [diceRolls, setDiceRolls] = useState<number[]>([])
  const [pointsSynced, setPointsSynced] = useState(false)

  // Refresh game state from backend
  const refreshGameState = async (preserveOpponentScore = false) => {
    try {
      const gameData = await gameAPI.getGameState(gameId)
      if (preserveOpponentScore) {
        // Preserve current opponentScore during bot turn - don't update until turn ends
        const currentOpponentScore = opponentScore
        setGameState({ ...gameData, opponentScore: currentOpponentScore })
      } else {
        setGameState(gameData)
      }
    } catch (error) {
      console.error('Failed to refresh game state:', error)
    }
  }

  // Detect round changes and show popup (including initial round 1)
  React.useEffect(() => {
    // Show round popup when game starts (round 1) or when round changes
    // Only show if game is playing and not during bot turn
    if (roundCount >= 1 && roundCount !== currentRound && !isBotPlaying && (gameStatus === 'playing' || gameStatus === 'waiting')) {
      setCurrentRound(roundCount)
      setShowRoundPopup(true)
      setTimeout(() => setShowRoundPopup(false), 2500)
    }
  }, [roundCount, currentRound, isBotPlaying, gameStatus])
  
  // Show round 1 popup when game first starts playing (after intro)
  React.useEffect(() => {
    if (gameStatus === 'playing' && roundCount === 1 && currentRound === 0 && !isBotPlaying && !showRoundPopup) {
      setCurrentRound(1)
      setShowRoundPopup(true)
      setTimeout(() => setShowRoundPopup(false), 2500)
    }
  }, [gameStatus, roundCount, currentRound, isBotPlaying, showRoundPopup])

  const handleDrawCard = async () => {
    if (!isPlayerTurn || isDrawing) return

    setIsDrawing(true)
    setFloatingMessage(null)

    try {
      const response = await gameAPI.drawCard(gameId)
      
      // Handle response - API returns { card: Card, gameState: GameState }
      const { card, gameState: updatedGameState } = response
      
      if (!card) {
        throw new Error('No card returned from API')
      }
      
      // Track move for zkVerify
      const move: GameMove = {
        type: 'draw_card',
        value: card.value,
        timestamp: Date.now(),
        round: updatedGameState?.roundCount || roundCount
      }
      setGameMoves(prev => [...prev, move])
      setCardsDrawn(prev => [...prev, card.value])
      
      // Update game state if provided (from first draw that starts the game)
      if (updatedGameState) {
        setGameState(updatedGameState)
        setCurrentCard(card)
      } else {
        // Fallback: refresh game state to sync
        await refreshGameState()
        setCurrentCard(card)
      }

      if (card.name === 'Ape In!') {
        // Ape In! card - show message, effect activates (next card will be doubled)
        setFloatingMessage({text: '🚀 APE IN ACTIVATED! Next card value DOUBLED!'})
        useGameStore.getState().activateApeIn()
        
        // Clear the floating message after 2 seconds
        // Note: Ape In! card stays visible until player draws next card
        setTimeout(() => {
          setFloatingMessage(null)
        }, 2000)
      }

      setIsDrawing(false)
    } catch (error: any) {
      console.error('Failed to draw card:', error)
      const errorMessage = error?.message || error?.error || 'Failed to draw card. Please try again.'
      setFloatingMessage({text: errorMessage})
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

      // Wait for dice animation to complete (1 second) before processing result
      setTimeout(async () => {
        setIsRolling(false)

      if (result.success) {
          // Check if this is a bearish dodge (message contains "Great Roll! Your sats are safe")
          const isBearishDodge = result.message?.includes("Great Roll! Your sats are safe") || result.message?.includes("Dodged bearish")
          
          if (isBearishDodge) {
            // Show the dodge message from backend
            setFloatingMessage({
              text: result.message || "Your sats are safe! Continue your turn.",
              sats: result.turnScore
            })
          } else {
            // Show floating success message with sats gained (KEEP CARD VISIBLE)
            const satsGained = result.satsGained !== undefined ? result.satsGained : currentCard.value
            console.log('Sats gained:', satsGained, 'Current card value:', currentCard.value, 'Ape In active:', apeInActive) // Debug
            setFloatingMessage({
              text: `+${satsGained} sats`,
              sats: result.turnScore
            })
          }
          
          // Wait for message to display, THEN clear card
          // Note: If Ape In! was active, the card value was already doubled and effect consumed
          setTimeout(async () => {
            setFloatingMessage(null)
            // Clear the card (backend already cleared it after successful roll)
            setCurrentCard(null)
            await refreshGameState()
          }, 2000)
        } else {
          // Player busted - show message then replay bot turn
          // Check if this is a roll of 1 (Rekt!)
          const isRekt = result.value === 1
          setFloatingMessage({
            text: result.message || 'Busted! Turn ended.',
            isRekt: isRekt
          })
          // Clear the card (turn ended, card is consumed)
          setCurrentCard(null)
          
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
    // Store opponent's score at start of turn - preserve it during turn, only update at end
    const opponentScoreAtTurnStart = opponentScore
    let botTurnEnded = false // Track if bot's turn has ended (stacked, busted, or bearish penalty)
    
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
            // Bot busted - keep opponentScore at start value (no update)
            const message = nextAction.message || 'Busted!'
            setFloatingMessage({text: `${opponentName}: ${message}`})
            await new Promise(resolve => setTimeout(resolve, 1800))
            // Explicitly preserve opponentScore at start value when bot busts
            updateScore(playerScore, opponentScoreAtTurnStart)
            botTurnEnded = true
            break // Bot busted, end turn (opponentScore remains at opponentScoreAtTurnStart)
          }
        }
        
        // Step 9: Clear card and pause before next action
        setFloatingMessage(null)
        setBotTurnData(prev => prev ? {...prev, card: null, roll: null, isRolling: false} : null)
        await new Promise(resolve => setTimeout(resolve, 800))
        
      } else if (action.type === 'stack') {
        // Bot decided to stack - update total score ONLY at end of turn
        const finalScore = action.finalScore || 0
        setFloatingMessage({text: `${opponentName} stacks ${previousTurnScore} sats!`})
        await new Promise(resolve => setTimeout(resolve, 2000))
        // Update opponent's total score only when they stack (end of turn)
        updateScore(playerScore, finalScore)
        botTurnEnded = true
      }
    }
    
    // Step 9: Clean up and return to player's turn
    setBotTurnData(null)
    setIsBotPlaying(false)
    setFloatingMessage({text: 'Your turn!'})
    await new Promise(resolve => setTimeout(resolve, 1200))
    setFloatingMessage(null)
    
    // Refresh game state to sync everything
    // If bot stacked, opponentScore was already updated via updateScore() above
    // If bot busted, opponentScore should remain at opponentScoreAtTurnStart (preserved)
    // Preserve opponentScore during refresh to prevent premature updates from backend
    await refreshGameState(true) // Preserve opponentScore - we've already updated it manually if needed
  }

  const handleStackSats = async () => {
    if (!isPlayerTurn || playerTurnScore === 0 || currentCard !== null) return

    try {
      setFloatingMessage({text: 'Banking sats...'})
      const result = await gameAPI.stackSats(gameId)
      
      // Immediately update game state with the result
      if (result) {
        setGameState(result)
      }
      
      // Clear the floating message and start bot turn immediately
      setFloatingMessage(null)
      
      // Replay bot's turn if actions are provided (start immediately)
      if (result.botActions && result.botActions.length > 0) {
        console.log('🤖 Starting bot turn after stack:', result.botActions.length, 'actions')
        // Start bot turn immediately after stacking
        await replayBotTurn(result.botActions)
        // Final state update after bot turn completes
        await refreshGameState()
      } else {
        console.log('⚠️ No bot actions returned after stack. Game status:', result?.gameStatus, 'Mode:', result?.mode)
        // No bot turn (game ended or PvP mode) - just refresh state
        await refreshGameState()
      }
    } catch (error) {
      console.error('Failed to stack sats:', error)
      setFloatingMessage({text: 'Failed to stack sats. Please try again.'})
    }
  }

  const handleForfeit = async () => {
    // Show confirmation dialog instead of browser confirm
    setShowForfeitConfirm(true)
  }

  const confirmForfeit = async () => {
    setShowForfeitConfirm(false)
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
      // Use onGameEnd callback instead of navigate (for arcade hub integration)
      if (onGameEnd) {
        setTimeout(() => {
          onGameEnd({
            winner: opponentName || 'Opponent',
            playerScore: 0,
            opponentScore: opponentScore,
            hasForfeited: true,
          })
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to forfeit:', error)
      setHasForfeited(false) // Reset on error
    }
  }

  const cancelForfeit = () => {
    setShowForfeitConfirm(false)
  }

  // zkVerify verification handler
  const handleZkVerifyValidation = useCallback(async () => {
    if (isVerifying) return
    
    setIsVerifying(true)
    
    try {
      // Check if zkVerify is enabled - default to mock mode if no API key
      // Use Next.js environment variable pattern
      const zkVerifyApiKey = typeof window !== 'undefined' 
        ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_ZKVERIFY_API_KEY 
        : process.env.NEXT_PUBLIC_ZKVERIFY_API_KEY
      const hasApiKey = zkVerifyApiKey && zkVerifyApiKey.length > 0
      const useZkVerifyEnv = typeof window !== 'undefined'
        ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_USE_ZKVERIFY
        : process.env.NEXT_PUBLIC_USE_ZKVERIFY
      const useZkVerify = useZkVerifyEnv !== 'false' && hasApiKey

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
        address || '0x0000000000000000000000000000000000000000'
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
  }, [gameId, playerName, gameMode, playerScore, roundCount, cardsDrawn, diceRolls, gameMoves, isVerifying, address])

  // Check for victory condition and trigger verification
  useEffect(() => {
    if (gameStatus === 'finished' && winner === playerName && !isVerifying && !verificationProofId) {
      // Player won - trigger zkVerify validation
      handleZkVerifyValidation()
    }
  }, [gameStatus, winner, playerName, isVerifying, verificationProofId, handleZkVerifyValidation, address])

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

  // Call onGameEnd callback when game ends (replaces postMessage)
  useEffect(() => {
    if (
      gameStatus === 'finished' &&
      !submitLockRef.current && // Check ref lock to prevent duplicate calls
      gameMode &&
      onGameEnd
    ) {
      // Set lock to prevent duplicate calls
      submitLockRef.current = true
      
      // Determine result
      const playerWon = winner === playerName
      const isDraw = !winner
      
      // Call parent callback with game result
      onGameEnd({
        winner: winner || 'Draw',
        playerScore,
        opponentScore,
        hasForfeited,
      })
      
      console.log('✅ Game end callback called:', {
        winner,
        playerScore,
        opponentScore,
        hasForfeited,
      })
    }
  }, [gameStatus, winner, playerName, gameMode, playerScore, opponentScore, hasForfeited, onGameEnd])

  // Calculate and send points to arcade hub when game ends (for all modes except Sandy)
  // Points calculation is now handled by parent component (ApeInGame) via onGameEnd callback
  // No postMessage needed - parent will handle points via arcade hub context

  // Show confetti when player wins
  useEffect(() => {
    if (gameStatus === 'finished' && winner === playerName && !showConfetti) {
      setShowConfetti(true)
      // Hide confetti after 5 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [gameStatus, winner, playerName, showConfetti])

  if (gameStatus === 'finished') {
    const playerWon = winner === playerName
    const isRanked = gameMode ? isRankedMode(gameMode) : false
    
    return (
      <>
        {/* Confetti for wins */}
        {showConfetti && playerWon && (
          <style dangerouslySetInnerHTML={{__html: `
            .ape-in-confetti {
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

            .ape-in-confetti-piece {
              position: absolute;
              width: 12px;
              height: 12px;
              background: #fbbf24;
              opacity: 0.9;
              border-radius: 2px;
              top: -20px;
              animation: ape-in-confetti-fall 5s linear forwards;
            }

            .ape-in-confetti-piece:nth-child(4n) {
              background: #22c55e;
            }
            .ape-in-confetti-piece:nth-child(4n + 1) {
              background: #38bdf8;
            }
            .ape-in-confetti-piece:nth-child(4n + 2) {
              background: #f97316;
            }
            .ape-in-confetti-piece:nth-child(4n + 3) {
              background: #a855f7;
            }

            @keyframes ape-in-confetti-fall {
              0% {
                transform: translate3d(0, -20px, 0) rotateZ(0deg) rotateY(0deg);
                opacity: 1;
              }
              100% {
                transform: translate3d(0, calc(100vh + 20px), 0) rotateZ(720deg) rotateY(360deg);
                opacity: 0;
              }
            }
          `}} />
        )}
        {showConfetti && playerWon && (
          <div className="ape-in-confetti">
            {Array.from({ length: 300 }, (_, i) => (
              <div
                key={i}
                className="ape-in-confetti-piece"
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
                      {hasApiKey
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
              src={`/features/games/ape-in/assets/images/bots/${gameMode}.gif`} 
              alt={`${gameMode} avatar`} 
              className="w-8 h-8 object-cover rounded-full border-2 border-purple-500/50 shadow-lg" 
              onError={(e) => {
                console.log(`GIF failed for ${gameMode} Game Over, trying PNG...`);
                e.currentTarget.src = `/features/games/ape-in/assets/images/bots/${gameMode}.png`;
              }}
              onLoad={(e) => {
                console.log(`Successfully loaded GIF Game Over portrait for ${gameMode}`);
              }}
            />
            <span>{opponentName} Score: <span className="score-display">{opponentScore}</span></span>
          </div>
        </div>
        <div className="flex gap-4 justify-center">
          <button 
            onClick={() => {
              // Return to menu (works for both win and loss)
              resetGame()
              setShowConfetti(false) // Stop confetti
              if (onReturnToMenu) {
                onReturnToMenu()
              } else if (onGameEnd) {
                // Fallback to onGameEnd if onReturnToMenu not provided
                onGameEnd({
                  winner: hasForfeited ? (opponentName || 'Opponent') : (winner || 'Draw'),
                  playerScore: hasForfeited ? 0 : playerScore,
                  opponentScore,
                  hasForfeited,
                })
              }
            }} 
            className="text-lg px-8 py-3 rounded-lg border-2 border-purple-500 bg-gradient-to-b from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            Return to Menu
          </button>
        </div>
      </motion.div>
      </>
    )
  }

  return (
    <div className="space-y-3 relative">
      {/* X Button (Exit/Forfeit) - Top Right Corner */}
      <div className="absolute top-0 right-0 z-50">
        <button
          onClick={handleForfeit}
          className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500/50 text-red-400 hover:text-red-300 transition-all shadow-lg hover:shadow-red-500/30"
          title="Exit Game (Forfeit)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Forfeit Confirmation Dialog */}
      <AnimatePresence>
        {showForfeitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                cancelForfeit()
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 p-6 rounded-2xl w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">⚠️</div>
                <h3 className="text-2xl font-bold text-white mb-2">Forfeit Game?</h3>
                <p className="text-slate-300 mb-4">
                  Are you sure you want to forfeit this game? This action cannot be undone.
                </p>
                <div className="bg-slate-700/50 rounded-lg p-4 mb-4 text-left">
                  <div className="text-sm text-slate-400 mb-2">Current Status:</div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">Your Score:</span>
                    <span className="font-bold text-cyan-400">{playerScore}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Opponent Score:</span>
                    <span className="font-bold text-purple-400">{opponentScore}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={cancelForfeit}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-700 font-bold text-slate-300 hover:text-white transition-all"
                >
                  No, Continue
                </button>
                <button
                  onClick={confirmForfeit}
                  className="flex-1 px-4 py-2 rounded-lg border-2 border-red-500 bg-red-600/20 hover:bg-red-600/30 font-bold text-red-400 hover:text-red-300 transition-all shadow-lg hover:shadow-red-500/30"
                >
                  Yes, Forfeit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact Score Display */}
      <div className="space-y-3">
        {/* Goals Display - Top Center */}
        <div className="game-board text-center py-2 px-4">
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Goal:</span>
              <span className="font-bold text-yellow-400">{winningScore || 150} sats</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Rounds:</span>
              <span className="font-bold text-purple-400">
                {unlimitedRounds ? '∞' : `${roundCount}/${maxRounds}`}
              </span>
            </div>
          </div>
        </div>
        
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
              src={`/features/games/ape-in/assets/images/bots/${gameMode}.gif`} 
              alt={`${gameMode} avatar`} 
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-full border-2 border-purple-500/50 shadow-lg cursor-pointer hover:scale-110 transition-transform duration-200" 
              onError={(e) => {
                console.log(`GIF failed for ${gameMode} GameBoard, trying PNG...`);
                e.currentTarget.src = `/features/games/ape-in/assets/images/bots/${gameMode}.png`;
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
                hideClickToDraw={isBotPlaying}
              />
            </div>
            {isBotPlaying && (
              <div className="text-sm text-emerald-400 font-semibold animate-pulse">
                {opponentName}'s Turn
              </div>
            )}
          </div>

          {/* Dice and Buttons Section - Right side on desktop */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full md:w-auto">
            {/* Dice Section */}
            <div className="flex flex-col items-center space-y-2 w-full sm:w-auto relative">
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
              
              {/* Floating Success Message - Positioned beneath dice */}
              {floatingMessage && (
                <motion.div
                  initial={{ y: 20, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className={`absolute top-full mt-4 left-1/2 transform -translate-x-1/2 z-50 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-2xl border-2 font-bold text-center max-w-[90vw] mx-4 ${
                    floatingMessage.isRekt 
                      ? 'bg-gradient-to-r from-red-500 to-red-600 border-red-300' 
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 border-green-300'
                  }`}
                >
                  {floatingMessage.isRekt ? (
                    <div className="space-y-1">
                      <div className="text-xs sm:text-sm font-bold">Rekt!</div>
                      <div className="text-xs sm:text-sm">{floatingMessage.text}</div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-xs sm:text-sm font-bold">Great roll!</div>
                      <div className="text-xs sm:text-sm">{floatingMessage.text}</div>
                      {floatingMessage.sats !== undefined && (
                        <div className="text-xs">Turn Sats: {floatingMessage.sats}</div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
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
                🏳️ Forfeit Game
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
                  src={`/features/games/ape-in/assets/images/bots/${gameMode}.gif`} 
                  alt={`${gameMode} avatar`} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.log(`GIF failed for ${gameMode} enlarged, trying PNG...`);
                    e.currentTarget.src = `/features/games/ape-in/assets/images/bots/${gameMode}.png`;
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
    </div>
  )
}
