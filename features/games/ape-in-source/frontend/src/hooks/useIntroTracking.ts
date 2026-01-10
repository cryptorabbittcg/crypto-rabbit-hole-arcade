import { useState, useEffect } from 'react'
import { useIdentity } from './useIdentity'
import { GameMode } from '../types/game'

interface IntroTracking {
  [walletAddress: string]: {
    [gameMode: string]: boolean
  }
}

const LOCAL_STORAGE_KEY = 'ape_in_intro_tracking'

export function useIntroTracking() {
  const identity = useIdentity()
  const walletAddress = identity.address || 'guest'

  const [introTracking, setIntroTracking] = useState<IntroTracking>(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  })

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(introTracking))
  }, [introTracking])

  // Check if intro has been completed for a specific game mode
  const hasCompletedIntro = (gameMode: GameMode): boolean => {
    const completed = introTracking[walletAddress]?.[gameMode] === true
    console.log(`🎬 Intro tracking for ${gameMode}:`, completed)
    console.log('📊 Current intro tracking state:', introTracking)
    console.log('👤 Wallet address:', walletAddress)
    return completed
  }

  // Mark intro as completed for a specific game mode
  const markIntroCompleted = (gameMode: GameMode) => {
    setIntroTracking(prev => ({
      ...prev,
      [walletAddress]: {
        ...(prev[walletAddress] || {}),
        [gameMode]: true
      }
    }))
  }

  // Reset intro completion (for testing or user preference)
  const resetIntroCompletion = () => {
    setIntroTracking(prev => ({
      ...prev,
      [walletAddress]: {}
    }))
  }

  // Reset intro completion for a specific game mode
  const resetIntroForMode = (gameMode: GameMode) => {
    setIntroTracking(prev => ({
      ...prev,
      [walletAddress]: {
        ...(prev[walletAddress] || {}),
        [gameMode]: false
      }
    }))
  }

  return {
    hasCompletedIntro,
    markIntroCompleted,
    resetIntroCompletion,
    resetIntroForMode,
    introTracking
  }
}
