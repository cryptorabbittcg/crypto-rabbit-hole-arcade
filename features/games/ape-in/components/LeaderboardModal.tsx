"use client"

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { GameMode } from '../types/game'
import { formatTime } from '../utils/playerStats'

interface LeaderboardModalProps {
  onClose: () => void
}

interface LeaderboardEntry {
  rank: number
  address: string
  username?: string
  score: number
  timeSeconds: number
  gameMode: GameMode
  roundsPlayed?: number
}

const MODE_TABS: Array<{ mode: GameMode | 'all'; label: string }> = [
  { mode: 'all', label: 'All' },
  { mode: 'sandy', label: '🐰 Sandy' },
  { mode: 'aida', label: '🧠 Aida' },
  { mode: 'lana', label: '⚡ Lana' },
  { mode: 'enj1n', label: '🔥 En-J1n' },
  { mode: 'nifty', label: '🎨 Nifty' },
  { mode: 'pvp', label: '⚔️ PvP (Coming Soon)' },
  { mode: 'multiplayer', label: '👥 Multiplayer (Coming Soon)' },
]

export default function LeaderboardModal({ onClose }: LeaderboardModalProps) {
  const [leaderboardMode, setLeaderboardMode] = useState<GameMode | 'all'>('all')
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch leaderboard from API
  const fetchLeaderboard = async (mode: GameMode | 'all' = 'all') => {
    setLoading(true)
    try {
      // TODO: Implement API endpoint for Ape In leaderboard
      // For now, return empty array
      // const response = await fetch(`/api/ape-in/leaderboard?mode=${mode}&limit=50`)
      // const data = await response.json()
      // setLeaderboardEntries(data.entries || [])
      
      // Placeholder: empty leaderboard for now
      setLeaderboardEntries([])
    } catch (error) {
      console.error('Error fetching Ape In leaderboard:', error)
      setLeaderboardEntries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (leaderboardMode) {
      fetchLeaderboard(leaderboardMode)
    }
  }, [leaderboardMode])

  const isComingSoon = leaderboardMode === 'pvp' || leaderboardMode === 'multiplayer' || leaderboardMode === 'tournament'

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
        className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 p-6 md:p-8 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🏆</div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Leaderboard</h2>
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
        <div className="mb-4 flex flex-wrap gap-2 overflow-x-auto pb-2">
          {MODE_TABS.map((tab) => {
            const isActive = leaderboardMode === tab.mode
            const isDisabled = tab.mode === 'pvp' || tab.mode === 'multiplayer' || tab.mode === 'tournament'
            
            return (
              <button
                key={tab.mode}
                onClick={() => !isDisabled && setLeaderboardMode(tab.mode)}
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

        {/* Leaderboard Content */}
        <div className="bg-slate-700/50 rounded-lg p-4 mb-4 flex-1 overflow-y-auto max-h-[50vh]">
          {isComingSoon ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚧</div>
              <h3 className="text-xl font-bold text-slate-300 mb-2">
                {leaderboardMode === 'pvp' && 'PvP Leaderboard Coming Soon!'}
                {leaderboardMode === 'multiplayer' && 'Multiplayer Leaderboard Coming Soon!'}
                {leaderboardMode === 'tournament' && 'Tournament Leaderboard Coming Soon!'}
              </h3>
              <p className="text-slate-400">Check back soon for leaderboards in this game mode!</p>
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-slate-400">Loading leaderboard...</p>
            </div>
          ) : leaderboardEntries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-slate-400">No entries yet. Be the first to play and top the leaderboard!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboardEntries.map((entry) => (
                <div
                  key={entry.rank}
                  className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between hover:bg-slate-800/70 transition-colors border border-slate-600/50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`text-lg font-bold ${
                      entry.rank === 1 ? 'text-yellow-400' :
                      entry.rank === 2 ? 'text-slate-300' :
                      entry.rank === 3 ? 'text-orange-400' :
                      'text-cyan-400'
                    }`}>
                      #{entry.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">
                        {entry.username || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatTime(entry.timeSeconds)} • {entry.gameMode}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-yellow-400">{entry.score}</div>
                    <div className="text-xs text-slate-400">sats</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="text-xs text-slate-500 text-center mb-4">
          {!isComingSoon && leaderboardMode !== 'all' && (
            <p>Showing top scores for {MODE_TABS.find(t => t.mode === leaderboardMode)?.label}</p>
          )}
          {leaderboardMode === 'all' && (
            <p>Showing top scores across all game modes</p>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-center">
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

