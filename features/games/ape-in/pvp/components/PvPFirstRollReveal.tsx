"use client"

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface PvPFirstRollRevealProps {
  matchId: string
  player1Roll: number
  player2Roll: number
  firstTurnPlayer: number
  playerAddress: string | null
  onClose: () => void
  onStart: () => void // Phase 2.5: Called when user clicks "Start Game"
}

export default function PvPFirstRollReveal({
  matchId,
  player1Roll,
  player2Roll,
  firstTurnPlayer,
  playerAddress,
  onClose,
  onStart,
}: PvPFirstRollRevealProps) {
  const [revealed, setRevealed] = useState(false)

  // Auto-reveal after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setRevealed(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 p-6 md:p-8 rounded-2xl w-full max-w-md shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🎲</div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">First Roll</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="text-center space-y-6">
          <div className="text-lg text-slate-300 mb-4">
            Determining who goes first...
          </div>

          {/* Dice Display */}
          <div className="flex justify-center items-center gap-8 my-8">
            {/* Player 1 Roll */}
            <div className="flex flex-col items-center">
              <div className="text-sm text-slate-400 mb-2">Player 1</div>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={revealed ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-4xl font-bold text-white shadow-lg"
              >
                {revealed ? player1Roll : '?'}
              </motion.div>
            </div>

            <div className="text-2xl text-slate-400">VS</div>

            {/* Player 2 Roll */}
            <div className="flex flex-col items-center">
              <div className="text-sm text-slate-400 mb-2">Player 2</div>
              <motion.div
                initial={{ scale: 0, rotate: 180 }}
                animate={revealed ? { scale: 1, rotate: 0 } : { scale: 0, rotate: 180 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center text-4xl font-bold text-white shadow-lg"
              >
                {revealed ? player2Roll : '?'}
              </motion.div>
            </div>
          </div>

          {/* Result */}
          {revealed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-4"
            >
              <div className="text-xl font-bold text-purple-400">
                Player {firstTurnPlayer} goes first! 🎯
              </div>
              <div className="text-sm text-slate-400">
                {player1Roll > player2Roll
                  ? `Player 1 wins with ${player1Roll} vs ${player2Roll}`
                  : player2Roll > player1Roll
                  ? `Player 2 wins with ${player2Roll} vs ${player1Roll}`
                  : `Tie! Player ${firstTurnPlayer} goes first by default`}
              </div>
            </motion.div>
          )}

          {/* Start Button */}
          {revealed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="pt-4"
            >
              <button
                onClick={onStart}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-bold text-white shadow-lg hover:shadow-xl transition-all"
              >
                Start Game
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
