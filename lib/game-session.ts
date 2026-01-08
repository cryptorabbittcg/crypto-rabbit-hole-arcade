export type GameSession = {
  sessionId: string
  userId: string
  username: string
  address: string | null
  thirdwebClientId: string
  tickets: number
  points: number
  timestamp: number
  avatar?: string | null // Avatar URL for profile picture
}

export type GamePointUpdate = {
  gameId: "ape-in" | "cryptoku" | "card-battle"
  points: number
  tickets: number
  achievements?: string[]
}

// Generate a session token that can be shared across games
export function createGameSession(userData: {
  userId: string
  username: string
  address: string | null
  tickets: number
  points: number
  avatar?: string | null
}): GameSession {
  return {
    sessionId: generateSessionId(),
    userId: userData.userId,
    username: userData.username,
    address: userData.address,
    thirdwebClientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
    tickets: userData.tickets,
    points: userData.points,
    timestamp: Date.now(),
    avatar: userData.avatar || null,
  }
}

// Store session in localStorage for cross-game access
export function storeGameSession(session: GameSession) {
  if (typeof window !== "undefined") {
    localStorage.setItem("crypto_rabbit_session", JSON.stringify(session))
    // Also store in sessionStorage for same-tab access
    sessionStorage.setItem("crypto_rabbit_session", JSON.stringify(session))
  }
}

// Retrieve session from storage
export function getGameSession(): GameSession | null {
  if (typeof window === "undefined") return null

  const stored = localStorage.getItem("crypto_rabbit_session") || sessionStorage.getItem("crypto_rabbit_session")
  if (!stored) return null

  try {
    const session = JSON.parse(stored) as GameSession
    // Check if session is still valid (24 hours)
    if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
      clearGameSession()
      return null
    }
    return session
  } catch {
    return null
  }
}

// Clear session on logout
export function clearGameSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("crypto_rabbit_session")
    sessionStorage.removeItem("crypto_rabbit_session")
  }
}

// Update points from external games
export function syncGamePoints(update: GamePointUpdate): void {
  if (typeof window === "undefined") return

  // Store the update in localStorage for the main app to pick up
  const updates = getStoredPointUpdates()
  updates.push({
    ...update,
    timestamp: Date.now(),
  })
  localStorage.setItem("crypto_rabbit_point_updates", JSON.stringify(updates))

  // Dispatch custom event for real-time sync
  window.dispatchEvent(
    new CustomEvent("gamePointsUpdated", {
      detail: update,
    }),
  )
}

// Get pending point updates
export function getStoredPointUpdates(): (GamePointUpdate & { timestamp: number })[] {
  if (typeof window === "undefined") return []

  const stored = localStorage.getItem("crypto_rabbit_point_updates")
  if (!stored) return []

  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

// Clear processed updates
export function clearPointUpdates() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("crypto_rabbit_point_updates")
  }
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}
