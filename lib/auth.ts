/**
 * Hub auth session helper - Glyph-neutral
 * Stores wallet address as the auth identifier
 */

export interface AuthResult {
  isNewUser: boolean
  token: string
  type: string
  walletAddress: string
}

/**
 * Store authenticated wallet address in localStorage
 * @param address - Wallet address (will be lowercased)
 */
export function storeAuthToken(address: string): void {
  if (typeof window !== "undefined") {
    // Store lowercased address for consistency (trim any whitespace)
    window.localStorage.setItem("arcade_auth_address", address.toLowerCase().trim())
  }
}

/**
 * Get authenticated wallet address from localStorage
 * @param fallbackAddress - Optional wallet address from wagmi (useAccount) as fallback if localStorage is empty
 * @returns Wallet address or null if not found
 */
export function getAuthToken(fallbackAddress?: string | null): string | null {
  if (typeof window === "undefined") return null
  
  // Try localStorage first (cache)
  const stored = window.localStorage.getItem("arcade_auth_address")
  if (stored) {
    return stored
  }
  
  // Fallback to wagmi address if provided (mobile/iOS localStorage may be cleared)
  // This makes wagmi the source of truth, localStorage is just a cache
  if (fallbackAddress) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[MOBILE-AUTH] getAuthToken: Using fallback address (localStorage empty)")
    }
    return fallbackAddress.toLowerCase().trim()
  }
  
  return null
}

/**
 * Remove authenticated wallet address from localStorage
 */
export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("arcade_auth_address")
  }
}
