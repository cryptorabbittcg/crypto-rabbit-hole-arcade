/**
 * Identity types for walletless embedded game
 */

export interface ArcadeIdentity {
  address: string
  chainId?: string | number
  displayName?: string
  avatarUrl?: string
  sessionId?: string
  username?: string
  userId?: string
}

export interface IdentityState {
  identity: ArcadeIdentity | null
  isReady: boolean
  isEmbedded: boolean
  isLoading: boolean
  error: string | null
}

export type ArcadeMessageType = 
  | 'ARCADE_SESSION_REQUEST'
  | 'ARCADE_REQUEST_IDENTITY' // Legacy support
  | 'ARCADE_PING'
  | 'ARCADE_IDENTITY'
  | 'ARCADE_PONG'

export interface ArcadeMessage {
  type: ArcadeMessageType
  data?: ArcadeIdentity
  timestamp?: number
}

