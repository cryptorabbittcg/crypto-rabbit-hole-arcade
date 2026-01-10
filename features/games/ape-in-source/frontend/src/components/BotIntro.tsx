import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameMode } from '../types/game'
import { BOT_CONFIGS } from '../config/botConfig'

interface BotIntroProps {
  gameMode: GameMode
  onComplete: (skip: boolean) => void
}

// Generate dynamic bot intros based on config
const generateBotIntros = (gameMode: GameMode): string[] => {
  const config = BOT_CONFIGS[gameMode]
  const winningScore = config.winningScore
  
  const baseIntros: Record<GameMode, string[]> = {
  sandy: [
    "🐰 Sandy: Welcome to the future of gaming...",
    "🚀 APE IN! - ApeChain's first Push-Your-Luck game!",
    "🦍 In this epic game of Risk vs Reward, you'll face off against me!",
    `🎯 First to stack ${winningScore} sats wins the game!`,
    "🎴 Draw cards, 🎲 roll dice, and ⚠️ dodge bearish penalties!",
    "📈 Push your luck to the limit… or risk losing it all!",
    "🌟 Ready to become an Ape In! legend?",
    "➡️ Let's APE IN!"
  ],
  aida: [
    "🧠 Aida: Prepare for the ultimate strategic challenge.",
    "🚀 Welcome to APE IN! - ApeChain's revolutionary Push-Your-Luck game!",
    "🦍 In this game of Risk vs Reward, data meets intuition.",
    "📊 I calculate every probability, but can you beat the odds?",
    `🎯 First to ${winningScore} sats wins! Outsmart me if you can!`,
    "🌟 The ApeChain community awaits your legend!",
    "➡️ Let's APE IN!"
  ],
  lana: [
    "🔧 Lana: Systems optimized. Game mode: EXTREME.",
    "🚀 Welcome to APE IN! - Where ApeChain meets Push-Your-Luck!",
    "🦍 In this high-stakes game of Risk vs Reward, I play aggressively.",
    "⚡ I chase big wins and push every limit!",
    `🎯 First to ${winningScore} sats wins! Can you match my intensity?`,
    "🌟 Time to prove you're worthy of the ApeChain legacy!",
    "➡️ Let's APE IN!"
  ],
  enj1n: [
    "🔥 En-J1n: BUCKLE UP, APE!",
    "🚀 Welcome to APE IN! - ApeChain's most intense Push-Your-Luck game!",
    "🦍 In this relentless game of Risk vs Reward, I never stop!",
    "💥 No brakes. No mercy. Just pure sats-stacking madness!",
    `🎯 First to ${winningScore} sats wins! Prepare for volatility!`,
    "🌟 Ready to ride the wildest waves of ApeChain?",
    "➡️ Let's APE IN!"
  ],
  nifty: [
    "🎨 Nifty: Time to paint with probability!",
    "🚀 Welcome to APE IN! - ApeChain's creative Push-Your-Luck masterpiece!",
    "🦍 In this artistic game of Risk vs Reward, creativity meets strategy.",
    "🎭 I love unpredictable moves and bold plays!",
    `🎯 First to ${winningScore} sats wins! Show me your unique style!`,
    "🌟 Let's create some legendary ApeChain moments!",
    "➡️ Let's APE IN!"
  ],
  pvp: [
    "👥 PvP Mode: The ultimate ApeChain showdown!",
    "🚀 Welcome to APE IN! - ApeChain's first Push-Your-Luck game!",
    "🦍 Face another Cipher in this epic game of Risk vs Reward!",
    "🏆 Stack smarter, survive longer, dominate harder!",
    `🎯 First to ${winningScore} sats wins! Who will be the legend?`,
    "🌟 The ApeChain community is watching!",
    "➡️ Let's APE IN!"
  ],
  multiplayer: [
    "🌐 Multiplayer Madness: ApeChain's ultimate battle royale!",
    "🚀 Welcome to APE IN! - ApeChain's revolutionary Push-Your-Luck game!",
    "🦍 Compete with 3-10 players in this chaotic game of Risk vs Reward!",
    "🔢 Multiple Ciphers, one goal: become the legend!",
    `🎯 First to ${winningScore} sats wins! May the best ape prevail!`,
    "🌟 This is where ApeChain legends are born!",
    "➡️ Let's APE IN!"
  ],
  tournament: [
    "🏆 Tournament Mode: The ApeChain championship awaits!",
    "🚀 Welcome to APE IN! - ApeChain's premier Push-Your-Luck tournament!",
    "🦍 Compete in structured brackets in this game of Risk vs Reward!",
    "🏅 Multiple rounds, elimination battles, ultimate glory!",
    `🎯 First to ${winningScore} sats wins! Prove you're the ultimate Cipher!`,
    "🌟 The ApeChain hall of fame awaits your name!",
    "➡️ Let's APE IN!"
  ]
  }
  
  return baseIntros[gameMode]
}

const BOT_COLORS: Record<GameMode, string> = {
  sandy: 'from-yellow-500 to-orange-500',
  aida: 'from-purple-500 to-pink-500', 
  lana: 'from-blue-500 to-cyan-500',
  enj1n: 'from-red-500 to-orange-500',
  nifty: 'from-orange-500 to-yellow-500',
  pvp: 'from-green-500 to-emerald-500',
  multiplayer: 'from-indigo-500 to-purple-500',
  tournament: 'from-amber-500 to-yellow-500'
}

const BOT_EMOJIS: Record<GameMode, string> = {
  sandy: '🐰',
  aida: '🧠',
  lana: '⚡', 
  enj1n: '🔥',
  nifty: '🎨',
  pvp: '👥',
  multiplayer: '🌐',
  tournament: '🏆'
}

export default function BotIntro({ gameMode, onComplete }: BotIntroProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(true)
  const [showButtons, setShowButtons] = useState(false)

  const introMessages = generateBotIntros(gameMode)
  const botColor = BOT_COLORS[gameMode] || BOT_COLORS.sandy
  const botEmoji = BOT_EMOJIS[gameMode] || BOT_EMOJIS.sandy

  useEffect(() => {
    if (currentMessageIndex < introMessages.length) {
      setIsTyping(true)
      const timer = setTimeout(() => {
        setIsTyping(false)
        if (currentMessageIndex === introMessages.length - 1) {
          setShowButtons(true)
        } else {
          setTimeout(() => {
            setCurrentMessageIndex(prev => prev + 1)
          }, 1000)
        }
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [currentMessageIndex, introMessages.length])

  const handleStartGame = () => {
    onComplete(false)
  }

  const handleSkipIntro = () => {
    onComplete(true)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 max-w-2xl w-full border-2 border-slate-600 shadow-2xl"
      >
        {/* Bot Header */}
        <div className="text-center mb-6 relative">
          {/* Skip Button - Top Right */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            onClick={handleSkipIntro}
            className="absolute top-0 right-0 px-3 py-1.5 bg-slate-600/80 hover:bg-slate-500/80 text-white text-xs font-medium rounded-lg shadow-lg hover:shadow-xl transition-all backdrop-blur-sm"
          >
            ⚡ Skip
          </motion.button>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className={`w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br ${botColor} flex items-center justify-center text-4xl shadow-lg overflow-hidden relative`}
          >
            {/* Bot Portrait */}
            <img 
              src={`/assets/bots/${gameMode}.gif`} 
              alt={`${gameMode} avatar`} 
              className="w-full h-full object-cover rounded-full" 
              onError={(e) => {
                console.log(`GIF failed for ${gameMode}, trying PNG...`);
                e.currentTarget.src = `/assets/bots/${gameMode}.png`;
              }}
              onLoad={(e) => {
                console.log(`Successfully loaded GIF header portrait for ${gameMode}`);
              }}
            />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {gameMode === 'sandy' && '🐰 Sandy Challenge'}
            {gameMode === 'aida' && '🧠 Aida Challenge'}
            {gameMode === 'lana' && '⚡ Lana Challenge'}
            {gameMode === 'enj1n' && '🔥 En-J1n Challenge'}
            {gameMode === 'nifty' && '🎨 Nifty Challenge'}
            {gameMode === 'pvp' && '👥 Player vs Player'}
            {gameMode === 'multiplayer' && '🌐 Multiplayer Madness'}
            {gameMode === 'tournament' && '🏆 Tournament Mode'}
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto rounded-full"></div>
        </div>

        {/* Intro Messages */}
        <div className="min-h-[200px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMessageIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-center space-x-4"
            >
            {/* Bot Portrait on the left */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex-shrink-0"
            >
              <img 
                src={`/assets/bots/${gameMode}.gif`} 
                alt={`${gameMode} avatar`} 
                className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-full border-2 border-purple-500/50 shadow-lg" 
                onError={(e) => {
                  console.log(`GIF failed for ${gameMode} message, trying PNG...`);
                  e.currentTarget.src = `/assets/bots/${gameMode}.png`;
                }}
                onLoad={(e) => {
                  console.log(`Successfully loaded GIF message portrait for ${gameMode}`);
                }}
              />
            </motion.div>
              
              {/* Message text */}
              <div className="text-lg sm:text-xl text-slate-200 leading-relaxed text-center flex-1">
                {introMessages[currentMessageIndex]}
              </div>
              
              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center mt-4"
                >
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-center space-x-2 mb-2">
            {introMessages.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  index <= currentMessageIndex ? 'bg-purple-500' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
          {/* Subtle skip hint */}
          <div className="text-center">
            <button
              onClick={handleSkipIntro}
              className="text-xs text-slate-400 hover:text-slate-300 transition-colors underline"
            >
              Skip intro anytime
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <AnimatePresence>
          {showButtons && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartGame}
                className={`px-6 py-3 bg-gradient-to-r ${botColor} text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all`}
              >
                🚀 APE IN NOW!
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSkipIntro}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                ⚡ Skip to Action
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
