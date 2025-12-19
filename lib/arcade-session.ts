/**
 * Arcade Hub Session Management
 * 
 * This module manages the shared session between the arcade hub and all games.
 * Sessions are stored in localStorage and shared across the hub and embedded games.
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
  avatar?: string
}

const SESSION_KEY = 'crypto_rabbit_session'
const SESSION_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Create a new arcade session
 */
export function createArcadeSession(data: {
  userId: string
  username: string
  address: string | null
  thirdwebClientId: string
  tickets?: number
  points?: number
  avatar?: string
}): ArcadeSession {
  const session: ArcadeSession = {
    sessionId: crypto.randomUUID(),
    userId: data.userId,
    username: data.username,
    address: data.address,
    thirdwebClientId: data.thirdwebClientId,
    tickets: data.tickets || 0,
    points: data.points || 0,
    timestamp: Date.now(),
    avatar: data.avatar,
  }

  // Store in both localStorage and sessionStorage for cross-tab compatibility
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))

  console.log('✅ Arcade session created:', {
    userId: session.userId,
    username: session.username,
    sessionId: session.sessionId,
  })

  return session
}

/**
 * Get the arcade session from storage
 */
export function getArcadeSession(): ArcadeSession | null {
  if (typeof window === 'undefined') return null

  const stored = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)

  if (!stored) {
    return null
  }

  try {
    const session = JSON.parse(stored) as ArcadeSession

    // Validate required fields
    if (!session.sessionId || !session.userId || !session.username || !session.thirdwebClientId) {
      console.warn('⚠️ Invalid arcade session: missing required fields')
      return null
    }

    // Check if session is expired
    const sessionAge = Date.now() - session.timestamp
    if (sessionAge > SESSION_EXPIRY) {
      console.log('⏰ Arcade session expired')
      clearArcadeSession()
      return null
    }

    return session
  } catch (error) {
    console.error('❌ Failed to parse arcade session:', error)
    return null
  }
}

/**
 * Update the arcade session
 */
export function updateArcadeSession(updates: Partial<ArcadeSession>): ArcadeSession | null {
  const session = getArcadeSession()
  if (!session) return null

  const updated: ArcadeSession = {
    ...session,
    ...updates,
    timestamp: Date.now(), // Update timestamp on any change
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated))

  return updated
}

/**
 * Clear the arcade session
 */
export function clearArcadeSession(): void {
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
  console.log('🗑️ Arcade session cleared')
}

/**
 * Check if user is authenticated
 */
export function isArcadeAuthenticated(): boolean {
  return getArcadeSession() !== null
}




