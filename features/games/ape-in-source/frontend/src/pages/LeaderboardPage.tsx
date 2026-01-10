import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { leaderboardAPI } from '../services/api'
import { LeaderboardEntry } from '../types/game'

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await leaderboardAPI.getLeaderboard(20)
        setLeaderboard(data)
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLeaderboard()
  }, [])

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

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-display font-bold mb-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
          Leaderboard
        </h1>
        <p className="text-xl text-slate-300">Top players in Ape In!</p>
      </motion.div>

      <div className="max-w-4xl mx-auto game-board">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left text-slate-400 font-semibold">Rank</th>
                <th className="px-4 py-3 text-left text-slate-400 font-semibold">Player</th>
                <th className="px-4 py-3 text-center text-slate-400 font-semibold">Wins</th>
                <th className="px-4 py-3 text-center text-slate-400 font-semibold">High Score</th>
                <th className="px-4 py-3 text-center text-slate-400 font-semibold">Games</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <motion.tr
                  key={entry.walletAddress || entry.playerName}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-4 py-4">
                    <span className="text-2xl">{getMedalEmoji(entry.rank)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-semibold text-white">{entry.playerName}</div>
                      {entry.walletAddress && (
                        <div className="text-xs text-slate-400 font-mono">
                          {entry.walletAddress.slice(0, 6)}...{entry.walletAddress.slice(-4)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-green-400 font-semibold">{entry.totalWins}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-yellow-400 font-semibold">{entry.highScore}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-slate-300">{entry.gamesPlayed}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {leaderboard.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              No leaderboard entries yet. Be the first to play!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

























