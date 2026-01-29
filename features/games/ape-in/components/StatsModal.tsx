"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { GameMode } from '../types/game'
import { getPlayerStats, formatTime, getWinRate, getForfeitRate } from '../utils/playerStats'
import { BOT_CONFIGS } from '../utils/botConfig'

interface StatsModalProps {
  onClose: () => void
  playerAddress: string | null
}

const MODE_TABS: Array<{ mode: GameMode | 'all'; label: string }> = [
  { mode: 'all', label: 'All Games' },
  { mode: 'sandy', label: '🐰 Sandy' },
  { mode: 'aida', label: '🧠 Aida' },
  { mode: 'lana', label: '⚡ Lana' },
  { mode: 'enj1n', label: '🔥 En-J1n' },
  { mode: 'nifty', label: '🎨 Nifty' },
  { mode: 'pvp', label: '⚔️ PvP (Coming Soon)' },
  { mode: 'multiplayer', label: '👥 Multiplayer (Coming Soon)' },
]

export default function StatsModal({ onClose, playerAddress }: StatsModalProps) {
  const [activeTab, setActiveTab] = useState<GameMode | 'all'>('all')
  const walletLower = playerAddress?.toLowerCase() ?? null
  const stats = getPlayerStats(walletLower)

  // Temporary debug log (remove after verification)
  if (process.env.NEXT_PUBLIC_DEBUG_STATS === 'true') {
    // eslint-disable-next-line no-console
    console.log('[ApeIn][MyStats] render', {
      wallet: walletLower,
      statsKey: walletLower ? `ape-in-player-stats:${walletLower}` : 'ape-in-player-stats:guest',
      sessionsKey: walletLower ? `ape-in-game-sessions:${walletLower}` : 'ape-in-game-sessions:guest',
    })
  }

  // Get stats for active tab
  const getActiveTabStats = () => {
    if (activeTab === 'all') {
      return {
        played: stats.totalGames,
        wins: stats.wins,
        losses: stats.losses,
        forfeited: stats.forfeits,
        winRate: getWinRate(stats),
        forfeitRate: getForfeitRate(stats),
        averageScore: stats.averageScore,
        bestScore: stats.bestScore,
        averageTime: stats.averageTime,
        bestTime: stats.bestTime,
        currentStreak: stats.currentStreak,
        bestStreak: stats.bestStreak,
      }
    }

    const modeStats = stats.gamesPerMode[activeTab]
    if (!modeStats) {
      return {
        played: 0,
        wins: 0,
        losses: 0,
        forfeited: 0,
        winRate: 0,
        forfeitRate: 0,
        averageScore: 0,
        bestScore: 0,
        averageTime: 0,
        bestTime: 0,
        currentStreak: stats.currentStreak,
        bestStreak: stats.bestStreak,
      }
    }

    return {
      played: modeStats.played,
      wins: modeStats.wins,
      losses: modeStats.losses,
      forfeited: modeStats.forfeited,
      winRate: getWinRate(stats, activeTab),
      forfeitRate: getForfeitRate(stats, activeTab),
      averageScore: stats.averageScore,
      bestScore: stats.bestScore,
      averageTime: stats.averageTime,
      bestTime: stats.bestTime,
      currentStreak: stats.currentStreak,
      bestStreak: stats.bestStreak,
    }
  }

  const tabStats = getActiveTabStats()
  const isComingSoon = activeTab === 'pvp' || activeTab === 'multiplayer' || activeTab === 'tournament'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 p-6 md:p-8 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="text-4xl">📊</div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Your Statistics</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 overflow-x-auto pb-2">
          {MODE_TABS.map((tab) => {
            const isActive = activeTab === tab.mode
            const isDisabled = tab.mode === 'pvp' || tab.mode === 'multiplayer' || tab.mode === 'tournament'
            
            return (
              <button
                key={tab.mode}
                onClick={() => !isDisabled && setActiveTab(tab.mode)}
                disabled={isDisabled}
                className={`px-3 py-2 rounded-lg font-semibold text-xs md:text-sm transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                    : isDisabled
                    ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed border border-slate-700/50'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Stats Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {isComingSoon ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🚧</div>
                <h3 className="text-xl font-bold text-slate-300 mb-2">
                  {activeTab === 'pvp' && 'PvP Mode Coming Soon!'}
                  {activeTab === 'multiplayer' && 'Multiplayer Mode Coming Soon!'}
                  {activeTab === 'tournament' && 'Tournament Mode Coming Soon!'}
                </h3>
                <p className="text-slate-400">Check back soon for stats in this game mode!</p>
              </div>
            ) : (
              <>
                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl md:text-3xl font-bold text-cyan-400">{tabStats.played}</div>
                    <div className="text-xs md:text-sm text-slate-300 mt-1">Games Played</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl md:text-3xl font-bold text-green-400">{tabStats.wins}</div>
                    <div className="text-xs md:text-sm text-slate-300 mt-1">Wins</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl md:text-3xl font-bold text-red-400">{tabStats.losses}</div>
                    <div className="text-xs md:text-sm text-slate-300 mt-1">Losses</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl md:text-3xl font-bold text-yellow-400">{tabStats.winRate}%</div>
                    <div className="text-xs md:text-sm text-slate-300 mt-1">Win Rate</div>
                  </div>
                </div>

                {/* Secondary Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-xl md:text-2xl font-bold text-orange-400">{tabStats.forfeited}</div>
                    <div className="text-xs md:text-sm text-slate-300 mt-1">Forfeits</div>
                    <div className="text-xs text-slate-400 mt-1">{tabStats.forfeitRate}%</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-xl md:text-2xl font-bold text-purple-400">{tabStats.averageScore}</div>
                    <div className="text-xs md:text-sm text-slate-300 mt-1">Avg Score</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-xl md:text-2xl font-bold text-pink-400">{tabStats.bestScore}</div>
                    <div className="text-xs md:text-sm text-slate-300 mt-1">Best Score</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-lg md:text-xl font-bold text-blue-400">
                      {tabStats.averageTime > 0 ? formatTime(tabStats.averageTime) : '--:--'}
                    </div>
                    <div className="text-xs md:text-sm text-slate-300 mt-1">Avg Time</div>
                  </div>
                </div>

                {/* Streak Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl md:text-3xl font-bold text-red-400">{tabStats.currentStreak}</div>
                    <div className="text-xs md:text-sm text-slate-300 mt-1">Current Streak 🔥</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl md:text-3xl font-bold text-pink-400">{tabStats.bestStreak}</div>
                    <div className="text-xs md:text-sm text-slate-300 mt-1">Best Streak</div>
                  </div>
                </div>

                {/* Best Time */}
                {tabStats.bestTime > 0 && (
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center mb-6">
                    <div className="text-xl md:text-2xl font-bold text-emerald-400">
                      {formatTime(tabStats.bestTime)}
                    </div>
                    <div className="text-xs md:text-sm text-slate-300 mt-1">Best Time</div>
                  </div>
                )}

                {/* Mode-specific stats breakdown (if not "all" tab) */}
                {activeTab !== 'all' && (
                  <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                    <h3 className="text-lg font-bold text-white mb-3">
                      {BOT_CONFIGS[activeTab]?.name || activeTab.toUpperCase()} Breakdown
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Played:</span>
                        <span className="font-bold text-cyan-400">{tabStats.played}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Wins:</span>
                        <span className="font-bold text-green-400">{tabStats.wins}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Losses:</span>
                        <span className="font-bold text-red-400">{tabStats.losses}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Forfeited:</span>
                        <span className="font-bold text-orange-400">{tabStats.forfeited}</span>
                      </div>
                      <div className="flex justify-between col-span-2 pt-2 border-t border-slate-600">
                        <span className="text-slate-400">Win Rate:</span>
                        <span className="font-bold text-yellow-400">{tabStats.winRate}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Close Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg border border-slate-600 bg-gradient-to-b from-slate-800 to-slate-900 font-bold hover:shadow-lg hover:shadow-purple-400/20 transition-all text-white"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

