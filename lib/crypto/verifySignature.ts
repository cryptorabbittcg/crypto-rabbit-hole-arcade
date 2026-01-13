import { recoverMessageAddress } from "viem"
import { isAddress } from "viem"

/**
 * Verify that a signature was created by the specified address
 * @param message The message that was signed
 * @param signature The signature to verify
 * @param expectedAddress The address that should have signed the message (will be normalized to lowercase)
 * @returns true if the signature is valid, false otherwise
 */
export async function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string,
): Promise<boolean> {
  try {
    // Normalize address to lowercase for comparison
    const normalizedExpected = expectedAddress.toLowerCase()

    // Validate address format
    if (!isAddress(normalizedExpected)) {
      return false
    }

    // Recover the address from the signature using viem
    const recoveredAddress = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    })

    // Compare normalized addresses
    return recoveredAddress.toLowerCase() === normalizedExpected
  } catch (error) {
    console.error("[verifySignature] Error verifying signature:", error)
    return false
  }
}

/**
 * Parse and validate a linked wallet message (supports both formats for backwards compatibility)
 * New format (from generateLinkWalletMessage): 
 *   "Link wallet to Crypto Rabbit Hole Arcade\n\nPrimary Address: {address}\nLinked Address: {address}\nTimestamp: {ISO timestamp}\nNonce: {nonce}"
 * Old format: "Link wallet: {primaryAddress} -> {linkedAddress}\nTimestamp: {timestamp}"
 * @param message The message to parse
 * @param expectedPrimaryAddress Expected primary address (normalized)
 * @param expectedLinkedAddress Expected linked address (normalized)
 * @returns Object with timestamp if valid, null otherwise
 */
export function parseLinkedWalletMessage(
  message: string,
  expectedPrimaryAddress: string,
  expectedLinkedAddress: string,
): { timestamp: number } | null {
  try {
    const normalizedPrimary = expectedPrimaryAddress.toLowerCase()
    const normalizedLinked = expectedLinkedAddress.toLowerCase()

    // Try new format first (exact format from generateLinkWalletMessage)
    if (message.includes("Link wallet to Crypto Rabbit Hole Arcade")) {
      // Match the exact format: header, blank line, then field: value pairs
      // Parse field: value pairs (Primary Address, Linked Address, Timestamp, Nonce)
      // Using multiline mode (m flag) to match start/end of line
      const primaryMatch = message.match(/^Primary Address:\s*(0x[a-fA-F0-9]{40})\s*$/m)
      const linkedMatch = message.match(/^Linked Address:\s*(0x[a-fA-F0-9]{40})\s*$/m)
      const timestampMatch = message.match(/^Timestamp:\s*(.+?)\s*$/m)
      const nonceMatch = message.match(/^Nonce:\s*(.+?)\s*$/m)

      // All fields must be present for new format (validates exact structure from generateLinkWalletMessage)
      if (primaryMatch && linkedMatch && timestampMatch && nonceMatch) {
        if (
          primaryMatch[1].toLowerCase() === normalizedPrimary &&
          linkedMatch[1].toLowerCase() === normalizedLinked
        ) {
          // Parse ISO timestamp (from generateLinkWalletMessage: new Date().toISOString())
          const timestamp = new Date(timestampMatch[1].trim()).getTime()
          if (!isNaN(timestamp) && timestamp > 0) {
            return { timestamp }
          }
        }
      }
    }

    // Fall back to old format for backwards compatibility
    const lines = message.split("\n")
    if (lines.length < 2) {
      return null
    }

    const linkLine = lines[0]
    const linkMatch = linkLine.match(/^Link wallet:\s*(0x[a-fA-F0-9]{40})\s*->\s*(0x[a-fA-F0-9]{40})$/i)
    if (!linkMatch) {
      return null
    }

    const messagePrimary = linkMatch[1].toLowerCase()
    const messageLinked = linkMatch[2].toLowerCase()

    if (messagePrimary !== normalizedPrimary || messageLinked !== normalizedLinked) {
      return null
    }

    const timestampLine = lines[1]
    const timestampMatch = timestampLine.match(/^Timestamp:\s*(\d+)$/)
    if (!timestampMatch) {
      return null
    }

    const timestamp = parseInt(timestampMatch[1], 10)
    if (isNaN(timestamp) || timestamp <= 0) {
      return null
    }

    return { timestamp }
  } catch (error) {
    console.error("[parseLinkedWalletMessage] Error parsing message:", error)
    return null
  }
}

/**
 * Check if a timestamp is within the allowed time window (10 minutes)
 * @param timestamp The timestamp to check (in milliseconds)
 * @param maxAgeMs Maximum age in milliseconds (default: 10 minutes)
 * @returns true if the timestamp is recent enough, false otherwise
 */
export function isTimestampValid(timestamp: number, maxAgeMs: number = 10 * 60 * 1000): boolean {
  const now = Date.now()
  const age = now - timestamp
  return age >= 0 && age <= maxAgeMs
}

/**
 * Generate a message for linking a wallet
 * @param primaryAddress The primary wallet address
 * @param linkedAddress The wallet address being linked
 * @returns The message string to sign
 */
export function generateLinkWalletMessage(primaryAddress: string, linkedAddress: string): string {
  const timestamp = new Date().toISOString()
  const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  return `Link wallet to Crypto Rabbit Hole Arcade

Primary Address: ${primaryAddress.toLowerCase()}
Linked Address: ${linkedAddress.toLowerCase()}
Timestamp: ${timestamp}
Nonce: ${nonce}`
}

