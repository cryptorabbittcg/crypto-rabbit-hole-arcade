/**
 * AuthAdapter Interface
 * Abstraction layer for wallet authentication providers
 * 
 * This interface allows the application to work with different wallet providers
 * (Glyph, MetaMask, Privy, etc.) through a consistent API.
 */
export interface AuthAdapter {
  /**
   * The connected wallet address, or null if not connected
   */
  address: string | null

  /**
   * Whether a wallet is currently connected
   */
  isConnected: boolean

  /**
   * Provider name for identification (e.g., "Glyph", "MetaMask", "Privy")
   */
  providerName: string

  /**
   * Initiate wallet connection
   * This should trigger the wallet connection UI (modal/dialog)
   * but should NOT embed UI components itself
   */
  connect(): Promise<void>

  /**
   * Disconnect the current wallet
   */
  disconnect(): Promise<void>

  /**
   * Subscribe to connection events
   * @param callback Called when wallet connects
   * @returns Unsubscribe function
   */
  onConnect(callback: (address: string) => void): () => void

  /**
   * Subscribe to disconnection events
   * @param callback Called when wallet disconnects
   * @returns Unsubscribe function
   */
  onDisconnect(callback: () => void): () => void
}

