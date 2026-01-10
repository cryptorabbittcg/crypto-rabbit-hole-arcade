import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchPlayerStats, type PlayerStats } from '../services/supabaseService'
import { useIdentity } from '../hooks/useIdentity'

interface StatsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function StatsModal({ isOpen, onClose }: StatsModalProps) {
  const identity = useIdentity()
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !identity.address) return

    const loadStats = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await fetchPlayerStats(identity.address!)
        setStats(data)
      } catch (err) {
        setError('Failed to load stats')
        console.error('Stats error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [isOpen, identity.address])

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatMode = (mode: string) => {
    return mode
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

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
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-display font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                📊 My Stats
              </h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors text-2xl leading-none"
              >
                ×
              </button>
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
            ) : !stats || stats.totalGames === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-xl mb-2">No games played yet!</p>
                <p className="text-sm">Start playing to see your stats here.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overall Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Total Games" value={stats.totalGames.toString()} icon="🎮" />
                  <StatCard
                    label="Wins"
                    value={stats.wins.toString()}
                    icon="✅"
                    color="text-green-400"
                  />
                  <StatCard
                    label="Losses"
                    value={stats.losses.toString()}
                    icon="❌"
                    color="text-red-400"
                  />
                  <StatCard
                    label="Win Rate"
                    value={`${stats.winRate.toFixed(1)}%`}
                    icon="📈"
                    color="text-yellow-400"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    label="Best Score"
                    value={stats.bestScore.toLocaleString()}
                    icon="⭐"
                    color="text-yellow-400"
                  />
                  <StatCard
                    label="Avg Score"
                    value={stats.averageScore.toLocaleString()}
                    icon="📊"
                  />
                  <StatCard
                    label="Current Streak"
                    value={stats.currentWinStreak.toString()}
                    icon="🔥"
                    color="text-orange-400"
                  />
                  <StatCard
                    label="Best Streak"
                    value={stats.bestWinStreak.toString()}
                    icon="🏆"
                    color="text-purple-400"
                  />
                </div>

                {/* Performance */}
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <span className="mr-2">⏱️</span> Performance
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-slate-400">Total Play Time</div>
                      <div className="text-xl font-bold text-white">{formatTime(stats.totalPlayTime)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Avg Time</div>
                      <div className="text-xl font-bold text-white">{formatTime(stats.averageTime)}</div>
                    </div>
                    {stats.bestTime && (
                      <div>
                        <div className="text-sm text-slate-400">Best Time</div>
                        <div className="text-xl font-bold text-green-400">{formatTime(stats.bestTime)}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mode Breakdown */}
                {Object.keys(stats.modeBreakdown).length > 0 && (
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <span className="mr-2">🎯</span> Mode Breakdown
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(stats.modeBreakdown).map(([mode, data]) => (
                        <div key={mode} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-white">{formatMode(mode)}</div>
                            <div className="text-sm text-slate-400">
                              {data.games} games • {data.wins} wins
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-yellow-400">
                              {data.bestScore.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-500">best score</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subtype Breakdown */}
                {Object.keys(stats.subtypeBreakdown).length > 0 && (
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <span className="mr-2">🎮</span> Game Type Breakdown
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(stats.subtypeBreakdown).map(([subtype, data]) => (
                        <div key={subtype} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-white">
                              {subtype
                                .split('_')
                                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ')}
                            </div>
                            <div className="text-sm text-slate-400">
                              {data.games} games • {data.wins} wins
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-yellow-400">
                              {data.bestScore.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-500">best score</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function StatCard({
  label,
  value,
  icon,
  color = 'text-white',
}: {
  label: string
  value: string
  icon: string
  color?: string
}) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
      <div className="text-sm text-slate-400 mb-1">{label}</div>
      <div className="flex items-center space-x-2">
        <span className="text-2xl">{icon}</span>
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
      </div>
    </div>
  )
}

