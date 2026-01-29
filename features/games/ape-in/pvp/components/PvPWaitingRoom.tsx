"use client"

import { motion } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { storeActivePvPMatch, clearActivePvPMatch } from '../utils/pvp-storage'

interface PvPWaitingRoomProps {
  matchId: string
  matchType: 'public' | 'private'
  playerAddress: string | null
  isCreator: boolean // Phase 2: true if this client created the match (player1), false if joined (player2)
  onCancel: () => void
  onReady?: (matchData: MatchStatus) => void // Phase 2.5: Called when rolls are ready
}

interface MatchStatus {
  match_status: string
  match_type: string
  match_code: string | null
  player1_id: string | null
  player2_id: string | null
  started_at: string | null
  last_action_at: string | null
  // Phase 2: roll fields
  player1_roll: number | null
  player2_roll: number | null
  first_turn_player: number | null
  rolled_at: string | null
  roll_seed: string | null
}

export default function PvPWaitingRoom({
  matchId,
  matchType,
  playerAddress,
  isCreator,
  onCancel,
  onReady,
}: PvPWaitingRoomProps) {
  const [matchStatus, setMatchStatus] = useState<MatchStatus | null>(null)
  const [isPolling, setIsPolling] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pollErrors, setPollErrors] = useState(0)
  const [isJoining, setIsJoining] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  const opponentFoundRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const joinAttemptedRef = useRef(false) // Track if we've attempted to join (prevent duplicate joins)

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
    // Reset error count for new match
    setPollErrors(0)
    // Reset join attempt flag for new match
    joinAttemptedRef.current = false
    storeActivePvPMatch(matchId, matchId)
    // Optional: clear on unmount if modal closes mid-search
    // return () => clearActivePvPMatch()
  }, [matchId])

  // Poll for match status (stable callback)
  const pollMatchStatus = useCallback(async () => {
    // Don't re-poll if opponent already found
    if (opponentFoundRef.current) return
    
    // Guard: must have matchId and playerAddress before polling
    if (!matchId || !playerAddress) return

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
        
        // Increment error count for consecutive errors
        setPollErrors((prev) => prev + 1)
        
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
        // For other HTTP errors (400, 500, etc.), increment error count and throw
        throw new Error(`HTTP ${response.status}`)
      }

      const data: MatchStatus = await response.json()
      
      // Request completed; only clear if this is still the current controller (prevents race condition)
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
      
      // Prevent state updates after unmount
      if (!isMountedRef.current) return
      
      // Reset error count on successful poll
      setPollErrors(0)
      // Clear any previous error state on successful poll (UX polish)
      setError(null)
      setMatchStatus(data)

      // Phase 2.5: Create nextData to track the latest match state (may be updated by /join)
      let nextData: MatchStatus = data

      // Phase 2: Auto-join logic for player2 ONLY (never player1)
      // Only attempt join if:
      // - We're NOT the creator (isCreator === false means we're player2 candidate)
      // - Match is waiting
      // - player2_id is null
      // - We haven't attempted join yet
      if (
        !isCreator &&
        data.match_status === 'waiting' &&
        data.player2_id === null &&
        !joinAttemptedRef.current &&
        !isJoining &&
        playerAddress
      ) {
        // Attempt to join as player2 (this will fail if we're player1, which is fine)
        joinAttemptedRef.current = true
        setIsJoining(true)
        
        try {
          const joinResponse = await fetch(`/api/ape-in/pvp/match/${matchId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerAddress }),
          })
          
          if (joinResponse.ok) {
            const joinData = await joinResponse.json()
            // Phase 2.5: Merge join data into nextData (ensures roll-ready check uses latest state)
            nextData = { ...data, ...joinData }
            // Update match status with join data (includes rolls if generated)
            setMatchStatus(nextData)
            // If rolls were generated, opponent is found
            if (joinData.rolled_at) {
              opponentFoundRef.current = true
            }
          } else if (joinResponse.status === 403) {
            // "Cannot join own match" - we're player1, that's fine
            // Do NOT reset joinAttemptedRef - permanently disable join attempts for this client
            joinAttemptedRef.current = true
          } else {
            // Other error, log but continue polling
            console.error('[PvPWaitingRoom] Join failed:', await joinResponse.text())
            joinAttemptedRef.current = false // Reset so we can retry if needed
          }
        } catch (joinError) {
          console.error('[PvPWaitingRoom] Join error:', joinError)
          joinAttemptedRef.current = false // Reset so we can retry if needed
        } finally {
          setIsJoining(false)
        }
      }

      // Phase 2: Check if rolls are ready (rolled_at exists means rolls were generated)
      // Phase 2.5: Use nextData (may include joinData) instead of stale data
      if (nextData.rolled_at !== null || (nextData.player1_roll !== null && nextData.player2_roll !== null)) {
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
        
        // Phase 2.5: Call onReady callback to transition to First Roll Reveal
        onReady?.(nextData)
        
        return
      } else if (data.match_status === 'in_progress' || data.match_status === 'completed' || data.match_status === 'forfeited' || data.match_status === 'abandoned') {
        // Match ended or in progress
        setIsPolling(false)
        clearActivePvPMatch()
      }
    } catch (error: any) {
      // Ignore abort errors (expected when cancelling/unmounting)
      if (error.name === 'AbortError') return
      
      console.error('[PvPWaitingRoom] Error polling match status:', error)
      // Prevent state updates after unmount
      if (!isMountedRef.current) return
      
      // Increment error count for consecutive errors
      setPollErrors((prev) => prev + 1)
      setError(error.message || 'Failed to check match status')
    }
  }, [matchId, playerAddress, isCreator, isJoining, onReady])

  // Stop polling after 2 consecutive errors
  useEffect(() => {
    if (pollErrors >= 2 && isPolling) {
      setIsPolling(false)
      setError('Match status polling failed. Please try again or cancel and start a new match.')
      
      // Clear timers
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [pollErrors, isPolling])

  // Start polling on mount
  useEffect(() => {
    // Guard: must have matchId, playerAddress, and be polling
    if (!isPolling || !matchId || !playerAddress) return

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

  // Phase 2: Opponent found when rolls are ready (rolled_at exists)
  const isOpponentFound = matchStatus?.rolled_at !== null || 
    (matchStatus?.player1_roll !== null && matchStatus?.player2_roll !== null)

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
                Opponent found! First rolls generated.
              </p>
              {matchStatus?.player1_roll !== null && matchStatus?.player2_roll !== null && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-slate-400">
                    Player 1 rolled: <span className="text-white font-bold">{matchStatus.player1_roll}</span>
                  </p>
                  <p className="text-sm text-slate-400">
                    Player 2 rolled: <span className="text-white font-bold">{matchStatus.player2_roll}</span>
                  </p>
                  {matchStatus.first_turn_player && (
                    <p className="text-sm text-purple-400 font-semibold mt-2">
                      Player {matchStatus.first_turn_player} goes first!
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-4">
                Phase 2: Transitioning to gameplay screen...
              </p>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
              </div>
              <p className="text-lg text-slate-300">
                {isJoining ? 'Joining match...' : 'Searching for opponent...'}
              </p>
              {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}
            </>
          )}

          {/* Match Info */}
          {matchStatus && matchId && (
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
