"use client"

import { motion } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { storeActivePvPMatch, clearActivePvPMatch } from '../utils/pvp-storage'

interface PvPWaitingRoomProps {
  matchId: string
  matchType: 'public' | 'private'
  playerAddress: string | null
  onCancel: () => void
}

interface MatchStatus {
  match_status: string
  match_type: string
  match_code: string | null
  player1_id: string | null
  player2_id: string | null
  started_at: string | null
  last_action_at: string | null
}

export default function PvPWaitingRoom({
  matchId,
  matchType,
  playerAddress,
  onCancel,
}: PvPWaitingRoomProps) {
  const [matchStatus, setMatchStatus] = useState<MatchStatus | null>(null)
  const [isPolling, setIsPolling] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  const opponentFoundRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Track mount state to prevent updates after unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // Abort any in-flight requests on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

  // Store active match once (Phase 1 placeholder userId)
  // Phase 1: Using matchId as userId placeholder (not used for validation yet)
  // Phase 2: Will fetch profile.id from wallet address to store actual userId
  // This ensures Phase 2 resume logic can verify match ownership correctly
  useEffect(() => {
    if (!matchId) return
    // Reset opponent found state for new match
    opponentFoundRef.current = false
    storeActivePvPMatch(matchId, matchId)
    // Optional: clear on unmount if modal closes mid-search
    // return () => clearActivePvPMatch()
  }, [matchId])

  // Poll for match status (stable callback)
  const pollMatchStatus = useCallback(async () => {
    // Don't re-poll if opponent already found
    if (opponentFoundRef.current) return
    
    if (!playerAddress) return

    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController for this poll (capture locally to prevent race)
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch(
        `/api/ape-in/pvp/match/${matchId}?playerAddress=${encodeURIComponent(playerAddress)}`,
        { signal: controller.signal }
      )

      if (!response.ok) {
        // Clear controller ref if this is still current (request completed, even if error)
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null
        }
        
        if (!isMountedRef.current) return
        
        if (response.status === 403) {
          setError('Access denied: not a match participant')
          setIsPolling(false)
          return
        }
        if (response.status === 404) {
          setError('Match not found')
          setIsPolling(false)
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data: MatchStatus = await response.json()
      
      // Request completed; only clear if this is still the current controller (prevents race condition)
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
      
      // Prevent state updates after unmount
      if (!isMountedRef.current) return
      
      // Clear any previous error state on successful poll (UX polish)
      setError(null)
      setMatchStatus(data)

      // Check if opponent found (match status changed from 'waiting')
      if (data.match_status === 'rolling_for_first') {
        opponentFoundRef.current = true
        setIsPolling(false)
        
        // Stop polling immediately (clear timers right away)
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        
        // Show "Opponent found" message
        // Phase 2: Will transition to first-player roll screen
        return
      } else if (data.match_status === 'in_progress' || data.match_status === 'completed' || data.match_status === 'forfeited' || data.match_status === 'abandoned') {
        // Match ended or in progress (shouldn't happen in Phase 1, but handle gracefully)
        setIsPolling(false)
        clearActivePvPMatch()
      }
    } catch (error: any) {
      // Ignore abort errors (expected when cancelling/unmounting)
      if (error.name === 'AbortError') return
      
      console.error('[PvPWaitingRoom] Error polling match status:', error)
      // Prevent state updates after unmount
      if (!isMountedRef.current) return
      
      setError(error.message || 'Failed to check match status')
    }
  }, [matchId, playerAddress])

  // Start polling on mount
  useEffect(() => {
    if (!isPolling || !playerAddress) return

    // Initial poll
    pollMatchStatus()

    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      pollMatchStatus()
    }, 2000)

    // Timeout after 60 seconds
    timeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return
      setIsPolling(false)
      setError('No opponent found. Please try again.')
      clearActivePvPMatch()
    }, 60000)

    return () => {
      // Abort any in-flight requests on effect cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [matchId, playerAddress, isPolling, pollMatchStatus])

  const handleCancel = () => {
    setIsPolling(false)
    
    // Abort any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    // Explicitly clear timers on cancel
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    
    clearActivePvPMatch()
    onCancel()
  }

  const isOpponentFound = matchStatus?.match_status === 'rolling_for_first'

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
            <div className="text-4xl">⚔️</div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              {isOpponentFound ? 'Opponent Found!' : 'Searching for Match'}
            </h2>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="text-center space-y-6">
          {isOpponentFound ? (
            <>
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-lg text-slate-300">
                Opponent found! Preparing match...
              </p>
              <p className="text-sm text-slate-400">
                Phase 2: First-player roll will begin here
              </p>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
              </div>
              <p className="text-lg text-slate-300">
                Searching for opponent...
              </p>
              {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}
            </>
          )}

          {/* Match Info */}
          {matchStatus && (
            <div className="bg-slate-700/50 rounded-lg p-4 text-left">
              <div className="text-xs text-slate-400 space-y-1">
                <div>Match ID: {matchId.slice(0, 8)}...</div>
                <div>Status: {matchStatus.match_status}</div>
                <div>Type: {matchStatus.match_type}</div>
              </div>
            </div>
          )}

          {/* Cancel Button */}
          {!isOpponentFound && (
            <button
              onClick={handleCancel}
              className="px-6 py-2 rounded-lg border border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 font-semibold text-slate-300 hover:text-white transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
