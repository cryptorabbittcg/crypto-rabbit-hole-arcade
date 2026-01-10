import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useIdentity } from '../hooks/useIdentity'
import { motion, AnimatePresence } from 'framer-motion'
import { gameAPI, testAPI } from '../services/api'
import { wsService } from '../services/websocket'
import { useGameStore } from '../store/gameStore'
import GameBoard from '../components/GameBoard'
import SmartBotIntro from '../components/SmartBotIntro'
import { useIntroTracking } from '../hooks/useIntroTracking'
import { GameMode } from '../types/game'
import { BOT_CONFIGS } from '../config/botConfig'
import { PlayBalanceService } from '../services/playBalanceService'
import { PaymentService } from '../services/paymentService'
import { requestPlayToken, shouldRequestPlayToken } from '../services/playTokenService'
import { isRankedMode } from '../config/gameModes'

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

export default function GamePage() {
  console.log('🎯 GamePage component rendered')
  const { mode } = useParams<{ mode: GameMode }>()
  console.log('🎯 GamePage mode from params:', mode)
  const navigate = useNavigate()
  const identity = useIdentity()
  const address = identity.address
  console.log('🎯 GamePage identity state:', { hasIdentity: !!identity, address, isReady: identity.isReady })
  const [isLoading, setIsLoading] = useState(true)
  const [playerName, setPlayerName] = useState('')
  const [gameId, setGameId] = useState('')
  const [showIntro, setShowIntro] = useState(true)
  const [showManualIntro, setShowManualIntro] = useState(false)
  const [playTokenError, setPlayTokenError] = useState<string | null>(null)
  const { setGameState, gameStatus, setPlayToken, setRunId } = useGameStore()
  const { hasCompletedIntro, markIntroCompleted } = useIntroTracking()

  useEffect(() => {
    console.log('🔍 GamePage useEffect triggered:', { mode, isLoading, hasAddress: !!address })
    
    if (!mode) {
      console.log('❌ No mode parameter, navigating home')
      navigate('/')
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
        console.log('👤 Address:', address)
        
        // URGENT: Sandy (tutorial) should always launch, no checks
        if (mode === 'sandy') {
          console.log('✅ Launching Sandy tutorial (always allowed, no checks)')
          console.log('📋 Sandy bypasses all identity, payment, and token checks')
          
          // Get player name - Sandy works without identity
          // Use identity if available, otherwise default to 'Player'
          let name = 'Player'
          if (identity && (identity.displayName || identity.username)) {
            name = identity.displayName || identity.username || 'Player'
          }
          console.log('📝 Player name for Sandy:', name)
          setPlayerName(name)
          
          // Create Sandy game immediately - no token, no payment, no checks, no address
          // Sandy works completely independently - no session, no Supabase, no wallet needed
          console.log('🚀 Creating Sandy tutorial game...')
          console.log('📋 Sandy game creation parameters:', {
            mode: 'sandy',
            playerName: name,
            walletAddress: undefined,
            isDailyFree: false,
            hasIdentity: !!identity,
            hasAddress: !!address,
          })
          
          try {
            // Call API directly - no pre-checks, no session validation, no Supabase
            const game = await gameAPI.createGame('sandy', name, undefined, false)
            
            if (!game || !game.gameId) {
              console.error('❌ Sandy game creation failed: No game ID returned')
              console.error('Response:', game)
              throw new Error('Sandy game creation failed: No game ID returned')
            }
            
            console.log('✅ Sandy game created successfully:', {
              gameId: game.gameId,
              mode: game.mode,
              playerName: game.playerName,
            })
            setGameId(game.gameId)
            setGameState(game)
            
            // Initialize intro state
            const shouldShowIntro = !hasCompletedIntro('sandy')
            console.log('🎬 Should show intro:', shouldShowIntro)
            setShowIntro(shouldShowIntro)
            
            console.log('✅ Sandy tutorial initialization complete')
            setIsLoading(false)
            return // Exit early - Sandy needs no other checks
          } catch (gameError) {
            console.error('❌ Sandy game creation error:', gameError)
            throw gameError // Re-throw to be caught by outer catch
          }
        }
        
        // Skip health check - game creation will test backend connectivity
        console.log('🚀 Proceeding directly to game creation...')
        
        // Get player name from identity or stored profile (for non-Sandy modes)
        let name = identity.displayName || identity.username || 'Player'
        if (address) {
          const savedProfile = localStorage.getItem(`profile_${address}`)
          if (savedProfile) {
            const profile = JSON.parse(savedProfile)
            name = profile.name || name || `Player ${address.slice(0, 6)}`
          } else if (!name || name === 'Player') {
            name = `Player ${address.slice(0, 6)}`
          }
        }
        console.log('📝 Player name:', name)
        setPlayerName(name)

        // Check if this is a ranked mode that requires a play token
        const isRanked = isRankedMode(mode)
        console.log('🎯 Mode is ranked:', isRanked, mode)
        
        // Request play token for ranked modes ONLY (Sandy never requests token)
        let playToken: string | null = null
        let runId: string | null = null
        
        if (isRanked && shouldRequestPlayToken(mode)) {
          if (!address) {
            setPlayTokenError('Player address required for ranked games')
            setIsLoading(false)
            // Navigate back after a short delay to show error
            setTimeout(() => navigate('/'), 2000)
            return
          }

          console.log('🎫 Requesting play token for ranked mode:', mode)
          setPlayTokenError(null) // Clear previous errors
          
          const tokenResponse = await requestPlayToken(mode, address)
          
          if (!tokenResponse.approved) {
            console.error('❌ Play token request denied:', tokenResponse.reason)
            const errorMessage = tokenResponse.reason || 'No ranked plays remaining today'
            setPlayTokenError(errorMessage)
            setIsLoading(false)
            // Navigate back after a short delay to show error
            setTimeout(() => navigate('/'), 3000)
            return
          }

          playToken = tokenResponse.playToken || null
          runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          
          // Store token and runId in game store
          setPlayToken(playToken)
          setRunId(runId)
          
          console.log('✅ Play token approved:', {
            token: playToken?.substring(0, 20) + '...',
            runId,
            freePlaysRemaining: tokenResponse.freePlaysRemaining,
          })
        } else {
          console.log('ℹ️ Skipping play token request (unranked mode or not required)')
        }

        // Check if using a free play (but don't deduct yet - wait for successful game creation)
        // Sandy is always free, no deduction needed
        const hasFreePlays = mode !== 'sandy' && address && PlayBalanceService.hasFreePlays(address)
        const needsPayment = mode !== 'sandy' && !hasFreePlays && address
        
        // Create game FIRST (before deducting free play or processing payment)
        console.log('🚀 Creating game...', { mode, name, address, hasFreePlays })
        const game = await gameAPI.createGame(mode, name, address || undefined, hasFreePlays)
        if (!game || !game.gameId) {
          throw new Error('Game creation failed: No game ID returned')
        }
        console.log('✅ Game created:', game.gameId)
        
        // NOW that game is successfully created, deduct free play or process payment
        if (hasFreePlays && address) {
          const deducted = PlayBalanceService.useFreePlay(address, mode)
          if (deducted) {
            console.log('✅ Free play deducted after successful game creation')
          }
        } else if (needsPayment) {
          // Execute payment now that game is created
          const requiredAmount = PlayBalanceService.getPlayPrice()
          const paymentResult = await PaymentService.executePayment(address, requiredAmount)
          
          if (!paymentResult.success) {
            console.error('❌ Payment failed after game creation:', paymentResult.error)
            // Game is already created, but payment failed - this is a problem
            // For now, we'll log it but continue (backend should handle this)
          } else {
            console.log('✅ Payment successful after game creation:', paymentResult.transactionHash)
            // Add purchased play to balance
            PlayBalanceService.purchasePlays(address, 1)
            // Then immediately use it
            PlayBalanceService.useFreePlay(address, mode)
          }
        }
        
        setGameId(game.gameId)
        setGameState(game)

        // Connect WebSocket for real-time updates
        if (mode === 'pvp' || mode === 'multiplayer') {
          console.log('🔌 Connecting WebSocket...')
          wsService.connect(game.gameId)
          wsService.on('game_update', (data) => {
            setGameState(data)
          })
        }

        // Initialize intro state based on completion tracking
        const shouldShowIntro = !hasCompletedIntro(mode)
        console.log('🎬 Should show intro:', shouldShowIntro)
        console.log('📊 Has completed intro:', hasCompletedIntro(mode))
        console.log('🎮 Game creation successful, setting showIntro to:', shouldShowIntro)
        setShowIntro(shouldShowIntro)

        console.log('✅ Game initialization complete')
        setIsLoading(false)
      } catch (error) {
        console.error('❌ Failed to initialize game:', error)
        setIsLoading(false)
        // Don't show error if play token error was already shown (it will navigate automatically)
        if (!playTokenError) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to start game'
          setPlayTokenError(errorMessage || 'Failed to start game. Please try again.')
          // Navigate back after showing error
          setTimeout(() => navigate('/'), 3000)
        }
      }
    }

    initGame()

    return () => {
      wsService.disconnect()
    }
    // For Sandy, don't wait for identity - allow immediate launch
    // Removed identity and address from deps so Sandy can launch without them
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, navigate, setGameState, hasCompletedIntro])

  const handleIntroComplete = (skip: boolean) => {
    if (!skip) {
      markIntroCompleted(mode)
    }
    setShowIntro(false)
  }

  const handleManualIntro = () => {
    setShowManualIntro(true)
  }

  const handleManualIntroComplete = (skip: boolean) => {
    setShowManualIntro(false)
  }

  // Show play token error if present
  if (playTokenError && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto bg-red-500/20 border border-red-500/30 rounded-xl p-6 backdrop-blur-sm"
        >
          <div className="text-center">
            <div className="text-4xl mb-4">🚫</div>
            <h2 className="text-xl font-bold text-red-300 mb-2">Ranked Play Not Available</h2>
            <p className="text-red-200 mb-6">{playTokenError}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold text-white hover:from-purple-500 hover:to-pink-500 transition-all"
            >
              Return to Home
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  const opponentName = mode ? gameNames[mode] : 'Opponent'

  return (
    <div className="container mx-auto px-4 py-2 md:py-4">
      {/* Bot Introduction */}
      {showIntro && mode && (
        <SmartBotIntro gameMode={mode} onComplete={handleIntroComplete} autoPlay={true} />
      )}

      {/* Manual Bot Introduction */}
      {showManualIntro && mode && (
        <SmartBotIntro gameMode={mode} onComplete={handleManualIntroComplete} autoPlay={false} />
      )}

      {/* Game Content */}
      {!showIntro && (
        <>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-3"
          >
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">
              {playerName} vs {mode && gameNames[mode]}
            </h1>
            <p className="text-xs text-slate-400">
              First to {mode ? BOT_CONFIGS[mode].winningScore : 150} sats wins!
            </p>
          </motion.div>

          <GameBoard gameId={gameId} playerName={playerName} opponentName={opponentName} gameMode={mode} onPlayIntro={handleManualIntro} />
        </>
      )}
    </div>
  )
}

