import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { GameMode } from '../types/game'
import { useState } from 'react'
import ParticleBackground from '../components/ParticleBackground'
import { useIdentity } from '../hooks/useIdentity'
import { PaymentService } from '../services/paymentService'
import { BOT_CONFIGS } from '../config/botConfig'
import { PlayBalanceService } from '../services/playBalanceService'

interface GameModeCard {
  mode: GameMode
  name: string
  description: string
  color: string
  difficulty?: string
  icon: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  price: number
}

// Generate game modes from bot config
const gameModes: GameModeCard[] = [
  {
    mode: 'sandy',
    name: BOT_CONFIGS.sandy.name,
    description: BOT_CONFIGS.sandy.description,
    color: 'from-yellow-500 to-orange-500',
    difficulty: BOT_CONFIGS.sandy.difficulty,
    icon: '🟡',
    rarity: 'common',
    price: BOT_CONFIGS.sandy.price,
  },
  {
    mode: 'aida',
    name: BOT_CONFIGS.aida.name,
    description: BOT_CONFIGS.aida.description,
    color: 'from-purple-500 to-pink-500',
    difficulty: BOT_CONFIGS.aida.difficulty,
    icon: '🟣',
    rarity: 'uncommon',
    price: BOT_CONFIGS.aida.price,
  },
  {
    mode: 'lana',
    name: BOT_CONFIGS.lana.name,
    description: BOT_CONFIGS.lana.description,
    color: 'from-blue-500 to-cyan-500',
    difficulty: BOT_CONFIGS.lana.difficulty,
    icon: '🔵',
    rarity: 'rare',
    price: BOT_CONFIGS.lana.price,
  },
  {
    mode: 'enj1n',
    name: BOT_CONFIGS.enj1n.name,
    description: BOT_CONFIGS.enj1n.description,
    color: 'from-red-500 to-orange-600',
    difficulty: BOT_CONFIGS.enj1n.difficulty,
    icon: '🔴',
    rarity: 'epic',
    price: BOT_CONFIGS.enj1n.price,
  },
  {
    mode: 'nifty',
    name: BOT_CONFIGS.nifty.name,
    description: BOT_CONFIGS.nifty.description,
    color: 'from-orange-500 to-yellow-500',
    difficulty: BOT_CONFIGS.nifty.difficulty,
    icon: '🟠',
    rarity: 'rare',
    price: BOT_CONFIGS.nifty.price,
  },
  {
    mode: 'pvp',
    name: 'PvP',
    description: 'Face off against another player in real-time!',
    color: 'from-pink-500 to-purple-600',
    icon: '⚔️',
    rarity: 'epic',
  },
  {
    mode: 'multiplayer',
    name: 'Multiplayer',
    description: '3-10 players compete for the top spot!',
    color: 'from-green-500 to-teal-500',
    icon: '👥',
    rarity: 'epic',
  },
  {
    mode: 'tournament',
    name: 'Tournament',
    description: 'Compete in brackets for ultimate glory!',
    color: 'from-indigo-500 to-purple-600',
    icon: '🏆',
    rarity: 'legendary',
  },
]

const rarityGlow = {
  common: 'shadow-gray-500/50',
  uncommon: 'shadow-green-500/50',
  rare: 'shadow-blue-500/50',
  epic: 'shadow-purple-500/50',
  legendary: 'shadow-orange-500/50',
}

export default function HomePage() {
  const navigate = useNavigate()
  const identity = useIdentity()
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [hoveredGuide, setHoveredGuide] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)

  const handleModeSelect = async (mode: GameMode) => {
    setPaymentError(null)
    setPaymentLoading(mode)
    
    try {
      // URGENT: Sandy (tutorial) should always launch, no checks
      if (mode === 'sandy') {
        console.log('✅ Launching Sandy tutorial (always allowed, no checks)')
        navigate(`/game/${mode}`)
        return // Exit early - Sandy needs no other checks
      }

      // Check if identity is available for paid games
      if (!identity.address) {
        setPaymentError('Please wait for identity to play paid games')
        return
      }

      // Check if user has free plays available (for display/validation only)
      // NOTE: Free plays are NOT deducted here - they are deducted in GamePage.tsx
      // after the game is successfully created to prevent loss if game creation fails
      const hasFreePlays = PlayBalanceService.hasFreePlays(identity.address)
      
      // Validate payment for paid games (but don't execute yet - wait for game creation)
      if (!hasFreePlays) {
        // Check if user can afford a play
        const requiredAmount = PlayBalanceService.getPlayPrice()
        const validation = await PaymentService.validatePayment(identity.address, requiredAmount)
        
        if (!validation.hasEnoughBalance) {
          setPaymentError(`Insufficient ApeCoin balance. You need ${PaymentService.formatApeCoin(validation.requiredAmount)} to purchase a play, but only have ${PaymentService.formatApeCoin(validation.currentBalance)}`)
          return
        }
        
        // Payment will be executed in GamePage.tsx after game is created
        console.log('✅ Payment validation passed - will execute after game creation')
      }

      // Navigate to game page (this happens regardless of payment validation)
      navigate(`/game/${mode}`)
    } catch (error) {
      console.error('❌ Game mode selection failed:', error)
      setPaymentError('Failed to start game. Please try again.')
    } finally {
      setPaymentLoading(null)
    }
  }

  const guideSteps = [
    {
      id: 'draw',
      icon: '/assets/cards/Historacle_1_Sats.jpg',
      title: 'Draw Cards',
      desc: 'Click the deck to draw cards and earn sats (points). Each card type has different values!',
      isImage: true,
    },
    {
      id: 'roll',
      icon: '🎲',
      title: 'Roll Dice',
      desc: 'After drawing, roll the dice. Roll a 1 and you lose all turn sats. Keep rolling to stack more!',
      isImage: false,
    },
    {
      id: 'stack',
      icon: '💰',
      title: 'Stack Sats',
      desc: 'Bank your turn sats anytime to add them to your score. First to reach the target wins!',
      isImage: false,
    },
    {
      id: 'bears',
      icon: '🐻',
      title: 'Watch for Bears',
      desc: 'Bearish cards threaten your score! Roll even to dodge penalties: reset, half, or -10 points.',
      isImage: false,
    },
    {
      id: 'apein',
      icon: '🚀',
      title: 'Ape In!',
      desc: 'Draw this special card to DOUBLE your next card\'s value. Risk it all for massive gains!',
      isImage: false,
    },
  ]

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Particle Background */}
      <div className="fixed inset-0 z-0">
        <ParticleBackground />
      </div>

      <div className="container mx-auto px-2 sm:px-4 pt-2 sm:pt-4 pb-2 sm:pb-4 relative z-20 max-w-6xl">
        {/* Compact Hero Section - Tagline directly under banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-center mb-3 sm:mb-6"
        >
          <p className="text-xs sm:text-sm md:text-base text-slate-400 max-w-2xl mx-auto px-2 leading-relaxed">
            Push your luck • Draw cards • Roll dice • Stack sats to victory!
          </p>
        </motion.div>

        {/* Horizontal Guide Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-4"
        >
          {/* How-to buttons */}
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 max-w-4xl mx-auto mb-3 sm:mb-6 px-2">
            {guideSteps.map((step, idx) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + idx * 0.05 }}
                onMouseEnter={() => setHoveredGuide(step.id)}
                onMouseLeave={() => setHoveredGuide(null)}
                className="relative group"
              >
                <div className={`px-2 sm:px-4 py-2 sm:py-3 rounded-xl bg-slate-800/80 backdrop-blur border transition-all cursor-help flex items-center gap-2 sm:gap-3 ${
                  hoveredGuide === step.id 
                    ? 'border-purple-500/70 bg-purple-900/20 shadow-lg shadow-purple-500/20' 
                    : 'border-slate-700/50 hover:border-purple-500/50'
                }`}>
                  {step.isImage ? (
                    <img src={step.icon} alt={step.title} className="w-5 h-5 sm:w-6 sm:h-6 rounded object-cover" />
                  ) : (
                    <span className="text-lg sm:text-xl">{step.icon}</span>
                  )}
                  <span className="text-xs sm:text-sm font-semibold text-slate-200">{step.title}</span>
                  <motion.span
                    animate={{ rotate: hoveredGuide === step.id ? 180 : 0 }}
                    className="text-slate-500 text-xs hidden sm:inline"
                  >
                    ▼
                  </motion.span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Single static info box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: hoveredGuide ? 1 : 0,
              y: hoveredGuide ? 0 : 20
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="max-w-2xl mx-auto"
            style={{ pointerEvents: hoveredGuide ? 'auto' : 'none' }}
          >
            {hoveredGuide && (
              <div className="bg-gradient-to-br from-slate-800/95 to-slate-700/95 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 shadow-2xl shadow-purple-500/10">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    {(() => {
                      const step = guideSteps.find(s => s.id === hoveredGuide)
                      return step?.isImage ? (
                        <img src={step.icon} alt={step.title} className="w-12 h-12 rounded-xl object-cover border border-purple-500/30" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                          <span className="text-2xl">{step?.icon}</span>
                        </div>
                      )
                    })()}
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-3">
                    {guideSteps.find(s => s.id === hoveredGuide)?.title}
                  </h3>
                  
                  <p className="text-slate-300 leading-relaxed text-base">
                    {guideSteps.find(s => s.id === hoveredGuide)?.desc}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Payment Error Display */}
        {paymentError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-md mx-auto mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl backdrop-blur-sm"
          >
            <div className="flex items-center space-x-2">
              <span className="text-red-400">⚠️</span>
              <p className="text-red-300 text-sm font-medium">{paymentError}</p>
            </div>
          </motion.div>
        )}

        {/* Compact Game Modes Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-2"
        >
          <h2 className="text-base sm:text-lg font-bold text-center mb-2 sm:mb-3 text-slate-200 px-2">Choose Your Opponent</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto px-2">
            {gameModes.map((gameMode, index) => (
              <CompactGameCard
                key={gameMode.mode}
                gameMode={gameMode}
                index={index}
                onSelect={handleModeSelect}
                isHovered={hoveredCard === gameMode.mode}
                onHoverChange={setHoveredCard}
                identity={identity}
                isLoading={paymentLoading === gameMode.mode}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Compact Game Card Component
function CompactGameCard({ 
  gameMode, 
  index, 
  onSelect,
  isHovered,
  onHoverChange,
  identity,
  isLoading = false
}: { 
  gameMode: GameModeCard
  index: number
  onSelect: (mode: GameMode) => void
  isHovered: boolean
  onHoverChange: (mode: string | null) => void
  identity: ReturnType<typeof useIdentity>
  isLoading?: boolean
}) {
  const disabled = ['pvp', 'multiplayer', 'tournament'].includes(gameMode.mode)
  
  // Determine display price
  const getDisplayPrice = () => {
    if (gameMode.mode === 'sandy') return { price: 0, text: 'FREE', isFree: true }
    
    const freePlaysRemaining = identity.address 
      ? PlayBalanceService.getFreePlaysRemaining(identity.address)
      : 0
    
    if (freePlaysRemaining > 0) {
      return { price: 0, text: `Free plays: ${freePlaysRemaining}`, isFree: true, isDailyFree: true }
    }
    
    return { price: 0.1, text: 'Cost: 0.1 APE', isFree: false }
  }
  
  const displayPrice = getDisplayPrice()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
      whileHover={disabled ? {} : { scale: 1.03, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onMouseEnter={() => onHoverChange(gameMode.mode)}
      onMouseLeave={() => onHoverChange(null)}
      onClick={() => !disabled && !isLoading && onSelect(gameMode.mode)}
      className={`${disabled || isLoading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} relative`}
    >
      <div className={`bg-gradient-to-br ${gameMode.color} p-[1px] rounded-xl h-full shadow-lg hover:shadow-xl transition-shadow`}>
        <div className="bg-slate-800/95 rounded-xl p-2 sm:p-3 h-full flex flex-col relative overflow-hidden">
          {disabled && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm rounded-xl flex items-center justify-center z-20">
              <span className="text-xs font-bold text-slate-400 px-2 py-1 bg-slate-800/80 rounded">Coming Soon</span>
            </div>
          )}
          
          {isLoading && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm rounded-xl flex items-center justify-center z-20">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span className="text-xs text-white font-semibold">Processing Payment...</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            {/* Bot Avatar Image or Icon */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-purple-500/30 shadow-lg flex items-center justify-center">
              {['sandy', 'aida', 'lana', 'enj1n', 'nifty'].includes(gameMode.mode) ? (
                <img 
                  src={`/assets/bots/${gameMode.mode}.gif`} 
                  alt={`${gameMode.name} avatar`} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    console.log(`GIF failed for ${gameMode.mode} HomePage, trying PNG...`);
                    e.currentTarget.src = `/assets/bots/${gameMode.mode}.png`;
                  }}
                  onLoad={(e) => {
                    console.log(`Successfully loaded GIF HomePage avatar for ${gameMode.mode}`);
                  }}
                />
              ) : (
                <span className="text-lg sm:text-xl">{gameMode.icon}</span>
              )}
            </div>
            {gameMode.difficulty && (
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase px-1 sm:px-1.5 py-0.5 rounded bg-slate-700/50">
                {gameMode.difficulty}
              </span>
            )}
          </div>

          <h3 className="text-sm sm:text-base font-bold mb-1 text-white">{gameMode.name}</h3>
          <p className="text-slate-400 text-[10px] sm:text-[11px] mb-2 sm:mb-3 line-clamp-2 leading-tight">{gameMode.description}</p>
          
          {/* zkVerify Verification Indicator */}
          <div className="flex items-center justify-center gap-1 mb-2">
            <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-[9px] text-emerald-400 font-medium">zkVerify Protected</span>
          </div>
          
          {/* Price Display */}
          <div className="mb-2 sm:mb-3">
            {displayPrice.isFree ? (
              <div className={`flex items-center justify-center px-2 py-1 rounded-lg border ${
                displayPrice.isDailyFree 
                  ? 'bg-blue-500/20 border-blue-500/30' 
                  : 'bg-green-500/20 border-green-500/30'
              }`}>
                <span className={`text-[9px] sm:text-[10px] font-bold ${
                  displayPrice.isDailyFree ? 'text-blue-400' : 'text-green-400'
                }`}>
                  {displayPrice.text}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center px-2 py-1 bg-orange-500/20 rounded-lg border border-orange-500/30">
                <span className="text-[9px] sm:text-[10px] font-bold text-orange-400">
                  {displayPrice.text}
                </span>
              </div>
            )}
          </div>
          
          <button
            className={`w-full px-2 py-1 sm:py-1.5 rounded-lg font-semibold text-[10px] sm:text-xs bg-gradient-to-r ${gameMode.color} mt-auto ${disabled ? 'opacity-50' : 'hover:opacity-90'}`}
            disabled={disabled}
          >
            {disabled ? 'Soon' : 'Play →'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
