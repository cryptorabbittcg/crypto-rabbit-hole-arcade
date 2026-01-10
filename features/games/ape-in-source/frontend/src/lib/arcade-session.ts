/**
 * Arcade Hub Session Management
 * 
 * This module handles integration with The Crypto Rabbit Hole Arcade Hub.
 * It manages session reading, validation, and point synchronization.
 */

export interface ArcadeSession {
  sessionId: string
  userId: string
  username: string
  address: string | null
  thirdwebClientId: string
  tickets: number
  points: number
  timestamp: number
}

export interface PointUpdate {
  gameId: 'ape-in'
  points: number
  tickets: number
  achievements?: string[]
}

/**
 * Get the arcade session from localStorage or sessionStorage
 * Sessions are stored by the arcade hub and shared across games
 * 
 * @returns ArcadeSession if valid session exists, null otherwise
 */
export function getArcadeSession(): ArcadeSession | null {
  if (typeof window === 'undefined') return null

  // Try localStorage first, then sessionStorage (for cross-tab compatibility)
  const stored = localStorage.getItem('crypto_rabbit_session') ||
                 sessionStorage.getItem('crypto_rabbit_session')

  if (!stored) {
    // Don't log repeatedly - only log once per session check
    // This prevents console spam when Sandy mode launches without session
    const lastLogTime = sessionStorage.getItem('last_session_log_time')
    const now = Date.now()
    if (!lastLogTime || now - parseInt(lastLogTime) > 5000) {
      console.log('🔍 No arcade session found (this is OK for Sandy/anonymous mode)')
      sessionStorage.setItem('last_session_log_time', now.toString())
    }
    return null
  }

  try {
    const session = JSON.parse(stored) as ArcadeSession

    // Validate required fields
    if (!session.sessionId || !session.userId || !session.username || !session.thirdwebClientId) {
      console.warn('⚠️ Invalid arcade session: missing required fields')
      return null
    }

    // Check if session is still valid (24 hours)
    const SESSION_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    const sessionAge = Date.now() - session.timestamp

    if (sessionAge > SESSION_EXPIRY) {
      console.log('⏰ Arcade session expired')
      // Clean up expired session
      localStorage.removeItem('crypto_rabbit_session')
      sessionStorage.removeItem('crypto_rabbit_session')
      return null
    }

    // Throttle logging to prevent infinite loop spam - only log once per 10 seconds
    const lastFoundLogTime = sessionStorage.getItem('last_session_found_log_time')
    const now = Date.now()
    if (!lastFoundLogTime || now - parseInt(lastFoundLogTime) > 10000) {
      console.log('✅ Arcade session found:', {
        userId: session.userId,
        username: session.username,
        sessionAge: Math.floor(sessionAge / 1000 / 60) + ' minutes old'
      })
      sessionStorage.setItem('last_session_found_log_time', now.toString())
    }

    return session
  } catch (error) {
    console.error('❌ Failed to parse arcade session:', error)
    return null
  }
}

/**
 * Sync points and tickets earned in the game back to the arcade hub
 * 
 * Points are stored in localStorage for the hub to pick up, and a custom
 * event is dispatched for real-time sync if the hub is open in another tab.
 * 
 * @param update - The point/ticket update to sync
 */
export function syncPointsToHub(update: PointUpdate): void {
  if (typeof window === 'undefined') return

  // Get existing updates
  const existingUpdates = JSON.parse(
    localStorage.getItem('crypto_rabbit_point_updates') || '[]'
  )

  // Add timestamp to update
  const updateWithTimestamp = {
    ...update,
    timestamp: Date.now()
  }

  // Append new update
  existingUpdates.push(updateWithTimestamp)

  // Store back to localStorage
  localStorage.setItem('crypto_rabbit_point_updates', JSON.stringify(existingUpdates))

  console.log('💰 Synced points to hub:', update)

  // Dispatch event for real-time sync if hub is open in another tab
  window.dispatchEvent(new CustomEvent('gamePointsUpdated', {
    detail: updateWithTimestamp
  }))
}

/**
 * Check if user is authenticated via arcade hub
 * 
 * @returns true if valid session exists, false otherwise
 */
export function isArcadeAuthenticated(): boolean {
  return getArcadeSession() !== null
}

/**
 * Calculate points earned based on game mode and result
 * 
 * @param gameMode - The game mode that was played
 * @param playerWon - Whether the player won
 * @param finalScore - The player's final score (for bonuses)
 * @param targetScore - The target/winning score (for perfect score bonus)
 * @returns Points earned (0 if player lost)
 */
export function calculateGamePoints(
  gameMode: string,
  playerWon: boolean,
  finalScore?: number,
  targetScore?: number
): number {
  if (!playerWon) return 0

  // Base points by difficulty
  const basePoints: Record<string, number> = {
    sandy: 50,    // Tutorial - lower points
    aida: 100,    // Easy
    lana: 150,    // Medium
    enj1n: 250,   // Hard - higher reward
    nifty: 150,   // Medium
    pvp: 200,     // PvP bonus
    multiplayer: 300, // Multiplayer bonus
    tournament: 500,  // Tournament bonus
  }

  let points = basePoints[gameMode.toLowerCase()] || 100

  // Perfect score bonus (win with exact target score)
  if (finalScore !== undefined && targetScore !== undefined && finalScore === targetScore) {
    points += 50
    console.log('🎯 Perfect score bonus: +50 points')
  }

  // High score bonus (final score > target by 20+)
  if (finalScore !== undefined && targetScore !== undefined && finalScore > targetScore + 20) {
    points += 25
    console.log('🌟 High score bonus: +25 points')
  }

  return points
}

/**
 * Get achievements based on game result
 * 
 * @param gameMode - The game mode played
 * @param playerWon - Whether the player won
 * @param isFirstWin - Whether this is the player's first win
 * @param perfectScore - Whether player won with perfect score
 * @returns Array of achievement strings
 */
export function getGameAchievements(
  gameMode: string,
  playerWon: boolean,
  isFirstWin: boolean = false,
  perfectScore: boolean = false
): string[] {
  if (!playerWon) return []

  const achievements: string[] = []

  if (isFirstWin) {
    achievements.push('First Win')
  }

  if (perfectScore) {
    achievements.push('Perfect Score')
  }

  // Mode-specific achievements
  const modeAchievements: Record<string, string> = {
    sandy: 'Sandy Master',
    aida: 'Aida Victory',
    lana: 'Lana Champion',
    enj1n: 'EnJ1n Slayer',
    nifty: 'Nifty Navigator',
  }

  if (modeAchievements[gameMode.toLowerCase()]) {
    achievements.push(modeAchievements[gameMode.toLowerCase()])
  }

  return achievements
}

/**
 * Redirect to arcade hub for authentication
 * 
 * @param returnUrl - URL to return to after authentication (current page by default)
 */
export function redirectToArcadeHub(returnUrl?: string): void {
  const hubUrl = 'https://arcade.thecryptorabbithole.io'
  const encodedReturnUrl = encodeURIComponent(returnUrl || window.location.href)
  const redirectUrl = `${hubUrl}?return=${encodedReturnUrl}`
  
  console.log('🔀 Redirecting to arcade hub:', redirectUrl)
  window.location.href = redirectUrl
}

