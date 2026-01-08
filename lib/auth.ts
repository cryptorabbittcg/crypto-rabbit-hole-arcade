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
    // Store lowercased address for consistency
    window.localStorage.setItem("arcade_auth_address", address.toLowerCase())
  }
}

/**
 * Get authenticated wallet address from localStorage
 * @returns Wallet address or null if not found
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem("arcade_auth_address")
}

/**
 * Remove authenticated wallet address from localStorage
 */
export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("arcade_auth_address")
  }
}
