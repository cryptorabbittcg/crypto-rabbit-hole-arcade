import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchLeaderboard, type LeaderboardEntry } from '../services/supabaseService'

interface LeaderboardModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'overall' | 'single_player' | 'pvp' | 'multiplayer'

export default function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overall')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const loadLeaderboard = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const subtype = activeTab === 'overall' ? null : activeTab
        const data = await fetchLeaderboard(subtype, 50)
        setLeaderboard(data)
      } catch (err) {
        setError('Failed to load leaderboard')
        console.error('Leaderboard error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadLeaderboard()
  }, [isOpen, activeTab])

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatTime = (seconds?: number) => {
    if (!seconds) return '—'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return `#${rank}`
    }
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overall', label: 'Overall' },
    { id: 'single_player', label: 'Single-Player' },
    { id: 'pvp', label: 'PvP' },
    { id: 'multiplayer', label: 'Multiplayer' },
  ]

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-slate-900 rounded-2xl border border-purple-500/30 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-purple-900/20 to-pink-900/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-display font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                🏆 Leaderboard
              </h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
                />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-400">{error}</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                No leaderboard entries yet. Be the first to play!
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <motion.div
                    key={`${entry.walletAddress}-${entry.score}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-purple-500/50 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="text-2xl font-bold text-yellow-400 flex-shrink-0 w-12 text-center">
                        {getMedalEmoji(entry.rank)}
                      </div>

                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {entry.avatarUrl ? (
                          <img
                            src={entry.avatarUrl}
                            alt={entry.username || entry.walletAddress}
                            className="w-12 h-12 rounded-full border-2 border-purple-500/50"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              if (target.nextElementSibling) {
                                (target.nextElementSibling as HTMLElement).style.display = 'flex'
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-12 h-12 rounded-full border-2 border-purple-500/50 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl ${entry.avatarUrl ? 'hidden' : ''}`}
                        >
                          {entry.username?.[0]?.toUpperCase() || entry.walletAddress?.[2]?.toUpperCase() || '?'}
                        </div>
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate">
                          {entry.username || formatAddress(entry.walletAddress)}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {formatAddress(entry.walletAddress)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {entry.gameMode.toUpperCase()} • {formatTime(entry.timeSeconds)}
                        </div>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-2xl font-bold text-yellow-400">
                        {entry.score.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500">points</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

