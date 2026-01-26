"use client"

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { GameMode } from '../types/game'
import { LeaderboardService, type ApeInLeaderboardEntry } from '@/lib/supabase/services/leaderboard.service'
import { ApeInLeaderboardList } from '@/components/leaderboards/ApeInLeaderboardList'

interface LeaderboardModalProps {
  onClose: () => void
  currentUserAddress?: string | null
}

const MODE_TABS: Array<{ mode: GameMode | 'all'; label: string }> = [
  { mode: 'all', label: 'All' },
  { mode: 'aida', label: '🧠 Aida' },
  { mode: 'lana', label: '⚡ Lana' },
  { mode: 'enj1n', label: '🔥 En-J1n' },
  { mode: 'nifty', label: '🎨 Nifty' },
  { mode: 'pvp', label: '⚔️ PvP (Coming Soon)' },
  { mode: 'multiplayer', label: '👥 Multiplayer (Coming Soon)' },
]

const ALL_MODES: GameMode[] = ['aida', 'lana', 'enj1n', 'nifty']

export default function LeaderboardModal({ onClose, currentUserAddress }: LeaderboardModalProps) {
  // Unique identifier to confirm this is the correct modal being used
  console.log("[APEIN MODAL ACTIVE] file: features/games/ape-in/components/LeaderboardModal.tsx", {
    currentUserAddress,
    timestamp: new Date().toISOString(),
  })

  const [leaderboardMode, setLeaderboardMode] = useState<GameMode | 'all'>('aida')
  const [leaderboardEntries, setLeaderboardEntries] = useState<ApeInLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch leaderboard via get_ape_in_leaderboard RPC (LeaderboardService)
  const fetchLeaderboard = async (mode: GameMode | 'all' = 'aida') => {
    setLoading(true)
    try {
      if (mode === 'pvp' || mode === 'multiplayer') {
        setLeaderboardEntries([])
        setLoading(false)
        return
      }
      const leaderboardService = new LeaderboardService()

      // "All" = client-side merge of aida, lana, enj1n, nifty (avoids p_mode="best" which SQL may not support)
      if (mode === 'all') {
        const lists = await Promise.all(ALL_MODES.map((m) => leaderboardService.getApeInLeaderboard(m, 50)))
        const merged = lists
          .flat()
          .sort((a, b) => {
            const scoreDiff = (b.best_score ?? 0) - (a.best_score ?? 0)
            if (scoreDiff !== 0) return scoreDiff
            return new Date(b.last_played ?? 0).getTime() - new Date(a.last_played ?? 0).getTime()
          })
          .slice(0, 50)
          .map((e, i) => ({ ...e, rank: i + 1 }))
        console.log('[ApeInModal] all merged', merged.length)
        setLeaderboardEntries(merged)
        return
      }

      const entries = await leaderboardService.getApeInLeaderboard(mode, 50)
      console.log('[ApeInModal] mode', mode, 'rows', entries.length, 'entries:', entries)
      
      // Defensive check: ensure entries is an array
      if (Array.isArray(entries) && entries.length > 0) {
        setLeaderboardEntries(entries)
      } else {
        console.warn('[ApeInModal] Received invalid or empty entries:', entries)
        setLeaderboardEntries([])
      }
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

  const isComingSoon = leaderboardMode === 'pvp' || leaderboardMode === 'multiplayer'

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
            const isDisabled = tab.mode === 'pvp' || tab.mode === 'multiplayer'
            
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
            <ApeInLeaderboardList entries={leaderboardEntries} currentUserAddress={currentUserAddress} />
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

