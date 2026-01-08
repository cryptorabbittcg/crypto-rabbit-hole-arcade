/**
 * Utility functions for displaying player names and wallet addresses
 */

/**
 * Shortens a wallet address for display
 * @param address - Full wallet address
 * @param startChars - Number of characters to show at start (default: 6)
 * @param endChars - Number of characters to show at end (default: 4)
 * @returns Shortened address like "0x1234...5678"
 */
export function shortenAddress(
  address: string | null | undefined,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (!address) return "Guest"
  if (address.length <= startChars + endChars) return address
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

/**
 * Gets the display name for a player based on connection status and custom username
 * @param isConnected - Whether wallet is connected
 * @param address - Wallet address (if connected)
 * @param customUsername - Custom username (if set)
 * @returns Display name: "Guest", shortened address, or custom username
 */
export function getDisplayName(
  isConnected: boolean,
  address: string | null | undefined,
  customUsername: string | null | undefined
): string {
  // Guest mode
  if (!isConnected || !address) {
    return "Guest"
  }

  // Custom username takes priority
  if (customUsername && customUsername.trim() && customUsername !== "Guest") {
    return customUsername.trim()
  }

  // Default to shortened wallet address
  return shortenAddress(address)
}

