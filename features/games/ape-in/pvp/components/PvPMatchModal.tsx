"use client"

import { motion } from 'framer-motion'
import { useState } from 'react'
import { X } from 'lucide-react'
import PvPWaitingRoom from './PvPWaitingRoom'

interface PvPMatchModalProps {
  onClose: () => void
  playerAddress: string | null
}

export default function PvPMatchModal({ onClose, playerAddress }: PvPMatchModalProps) {
  const [matchType, setMatchType] = useState<'public' | 'private' | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)

  const handleFindPublicMatch = async () => {
    if (!playerAddress) {
      alert('Please connect your wallet to play PvP')
      return
    }

    try {
      const response = await fetch('/api/ape-in/pvp/match/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerAddress }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to find match')
      }

      const data = await response.json()
      setMatchId(data.matchId)
      setMatchType('public')
    } catch (error: any) {
      console.error('[PvPMatchModal] Error finding match:', error)
      alert(error.message || 'Failed to find match. Please try again.')
    }
  }

  const handleCreatePrivateMatch = () => {
    // Phase 1: Stub - will be implemented in later phase
    alert('Private matches coming soon!')
  }

  const handleJoinPrivateMatch = () => {
    // Phase 1: Stub - will be implemented in later phase
    alert('Private matches coming soon!')
  }

  // If match found, show waiting room
  if (matchId && matchType) {
    return (
      <PvPWaitingRoom
        matchId={matchId}
        matchType={matchType}
        playerAddress={playerAddress}
        onCancel={() => {
          setMatchId(null)
          setMatchType(null)
          onClose()
        }}
      />
    )
  }

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
        className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 p-6 md:p-8 rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="text-4xl">⚔️</div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Find a PvP Match</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Match Options */}
        <div className="space-y-4">
          {/* Public Match */}
          <button
            onClick={handleFindPublicMatch}
            disabled={!playerAddress}
            className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-bold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔍 Find Public Match
          </button>

          <div className="flex items-center gap-4 my-4">
            <div className="flex-1 h-px bg-slate-600"></div>
            <span className="text-slate-400 text-sm">OR</span>
            <div className="flex-1 h-px bg-slate-600"></div>
          </div>

          {/* Private Match - Create */}
          <button
            onClick={handleCreatePrivateMatch}
            disabled={!playerAddress}
            className="w-full px-6 py-4 rounded-xl border-2 border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 font-bold text-slate-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔗 Create Private Match
          </button>

          {/* Private Match - Join */}
          <button
            onClick={handleJoinPrivateMatch}
            disabled={!playerAddress}
            className="w-full px-6 py-4 rounded-xl border-2 border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 font-bold text-slate-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔑 Join Private Match
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg border border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 font-semibold text-slate-300 hover:text-white transition-all"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
