"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { GameMode } from '../types/game'
import { BOT_CONFIGS } from '../utils/botConfig'
import { isRankedMode } from '../utils/constants'

interface ModeSelectionScreenProps {
  onSelectMode: (mode: GameMode) => void
  playerAddress: string | null
  onBack?: () => void
}

const AVAILABLE_MODES: GameMode[] = ['sandy', 'aida', 'lana', 'enj1n', 'nifty'] // Only single-player bot modes for now

export function ModeSelectionScreen({ onSelectMode, playerAddress, onBack }: ModeSelectionScreenProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleModeClick = (mode: GameMode) => {
    const config = BOT_CONFIGS[mode]
    const isRanked = isRankedMode(mode)
    
    // Sandy is always available
    if (mode === 'sandy') {
      onSelectMode(mode)
      return
    }
    
    // Ranked modes require wallet address
    if (isRanked && !playerAddress) {
      alert('Wallet address required for ranked games. Please connect your wallet.')
      return
    }
    
    // Show confirmation for ranked modes
    if (isRanked) {
      setSelectedMode(mode)
      setShowConfirm(true)
    } else {
      onSelectMode(mode)
    }
  }

  const handleConfirm = () => {
    if (selectedMode) {
      onSelectMode(selectedMode)
      setShowConfirm(false)
      setSelectedMode(null)
    }
  }

  const handleCancel = () => {
    setShowConfirm(false)
    setSelectedMode(null)
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center text-center px-6 z-50 overflow-auto py-8">
      {/* Header */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-black bg-gradient-to-r from-purple-400 via-pink-500 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.4)] mb-2">
          SELECT YOUR OPPONENT
        </h1>
        <p className="text-slate-300 text-lg md:text-xl">Choose a bot to challenge</p>
      </motion.div>

      {/* Mode Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full mb-8">
        {AVAILABLE_MODES.map((mode) => {
          const config = BOT_CONFIGS[mode]
          const isRanked = isRankedMode(mode)
          const canPlay = mode === 'sandy' || (isRanked && playerAddress)
          
          return (
            <motion.div
              key={mode}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: AVAILABLE_MODES.indexOf(mode) * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => canPlay && handleModeClick(mode)}
              className={`
                relative overflow-hidden rounded-2xl border-4 p-6 cursor-pointer
                transition-all duration-300
                ${canPlay 
                  ? 'border-purple-500/50 hover:border-purple-500 bg-gradient-to-br from-slate-900/90 to-purple-900/30 shadow-[0_0_30px_hsl(var(--neon-purple)/0.3)] hover:shadow-[0_0_50px_hsl(var(--neon-purple)/0.5)]' 
                  : 'border-slate-600/30 bg-slate-900/50 opacity-50 cursor-not-allowed'
                }
              `}
            >
              {/* Bot Image Background */}
              <div className="absolute inset-0 opacity-20">
                <img
                  src={`/features/games/ape-in/assets/images/bots/${mode}.jpg`}
                  alt={config.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to png if jpg doesn't exist
                    e.currentTarget.src = `/features/games/ape-in/assets/images/bots/${mode}.png`
                  }}
                />
              </div>
              
              {/* Content */}
              <div className="relative z-10">
                {/* Bot Name */}
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                  {config.name}
                </h3>
                
                {/* Difficulty Badge */}
                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3
                  bg-gradient-to-r from-purple-500/80 to-pink-500/80 text-white">
                  {config.difficulty}
                </div>
                
                {/* Description */}
                <p className="text-slate-300 text-sm mb-4 line-clamp-2 drop-shadow-[0_0_5px_rgba(0,0,0,0.9)]">
                  {config.description}
                </p>
                
                {/* Stats */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Target Score:</span>
                    <span className="text-white font-bold">{config.winningScore}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Max Rounds:</span>
                    <span className="text-white font-bold">{config.maxRounds}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Price:</span>
                    <span className={config.price === 0 ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold'}>
                      {config.price === 0 ? 'FREE' : `${config.price} APE`}
                    </span>
                  </div>
                </div>
                
                {/* Locked Indicator */}
                {!canPlay && (
                  <div className="mt-4 text-red-400 text-xs font-bold">
                    ⚠️ Wallet Required
                  </div>
                )}
                
                {/* Daily Free Badge */}
                {config.hasDailyFree && canPlay && (
                  <div className="mt-4 text-green-400 text-xs font-bold">
                    ✓ Daily Free Available
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Back Button */}
      {onBack && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={onBack}
          className="px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 border-2 border-slate-600 rounded-lg text-slate-300 hover:text-white transition-all"
        >
          ← Back
        </motion.button>
      )}

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirm && selectedMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={handleCancel}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-slate-900 to-purple-900/30 border-4 border-purple-500 rounded-2xl p-8 max-w-md w-full"
            >
              <h3 className="text-2xl font-bold text-white mb-4">Confirm Game Start</h3>
              <p className="text-slate-300 mb-6">
                Start a ranked game against <span className="font-bold text-purple-400">{BOT_CONFIGS[selectedMode].name}</span>?
                {BOT_CONFIGS[selectedMode].price > 0 && (
                  <span className="block mt-2 text-yellow-400">
                    Cost: {BOT_CONFIGS[selectedMode].price} APE
                  </span>
                )}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg text-white font-bold transition-all"
                >
                  Start Game
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

