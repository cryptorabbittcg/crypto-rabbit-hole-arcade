/**
 * Play Token Service
 * Handles requesting play tokens for ranked game modes from Arcade Hub
 */

import { isEmbedded } from '../lib/identity-bridge'
import { GameMode } from '../types/game'

export interface PlayTokenRequest {
  playerAddress: string
  modeId: GameMode
}

export interface PlayTokenResponse {
  approved: boolean
  playToken?: string
  reason?: string
  freePlaysRemaining?: number
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Request a play token for a ranked game mode
 * In embedded mode, calls the API. In standalone mode with VITE_ALLOW_STANDALONE=true, auto-approves.
 * 
 * @param modeId - The game mode to request a token for
 * @param playerAddress - The player's wallet address
 * @returns Promise<PlayTokenResponse>
 */
export async function requestPlayToken(
  modeId: GameMode,
  playerAddress: string
): Promise<PlayTokenResponse> {
  // Dev fallback: auto-approve in standalone mode
  const allowStandalone = import.meta.env.VITE_ALLOW_STANDALONE === 'true'
  const embedded = isEmbedded()

  if (!embedded && allowStandalone) {
    console.log('🔧 Standalone mode: Auto-approving play token for', modeId)
    return {
      approved: true,
      playToken: `DEV_PLAY_TOKEN_${modeId}_${Date.now()}`,
      freePlaysRemaining: 999, // Dev mode shows unlimited
    }
  }

  // Embedded mode or no standalone flag: call API
  if (!playerAddress) {
    return {
      approved: false,
      reason: 'Player address is required',
    }
  }

  try {
    const requestPayload: PlayTokenRequest = {
      playerAddress,
      modeId,
    }

    console.log('🎫 Requesting play token for mode:', modeId)
    console.log('📤 Request payload:', requestPayload)

    const response = await fetch(`${API_BASE_URL}/api/apein/request-play`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Play token request failed:', response.status, errorText)
      return {
        approved: false,
        reason: `Server error: ${response.status}`,
      }
    }

    const data = await response.json() as PlayTokenResponse

    console.log('✅ Play token response:', data)

    return data
  } catch (error) {
    console.error('❌ Failed to request play token:', error)
    return {
      approved: false,
      reason: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Validate that a play token request is appropriate
 * UNRANKED modes should never request tokens
 */
export function shouldRequestPlayToken(modeId: GameMode): boolean {
  // Import here to avoid circular dependency
  const { isRankedMode } = require('../config/gameModes')
  return isRankedMode(modeId)
}

