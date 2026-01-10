/**
 * Play Token Service
 * Handles requesting play tokens for ranked game modes from Arcade Hub
 */

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

/**
 * Request a play token for a ranked game mode
 * Uses Next.js API routes (built-in, no external backend)
 * 
 * @param modeId - The game mode to request a token for
 * @param playerAddress - The player's wallet address
 * @returns Promise<PlayTokenResponse>
 */
export async function requestPlayToken(
  modeId: GameMode,
  playerAddress: string
): Promise<PlayTokenResponse> {
  // Call Next.js API route
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

    // TODO: Create API route /api/ape-in/play-token/request
    // For now, return approved (can be implemented later)
    return {
      approved: true,
      playToken: `PLAY_TOKEN_${modeId}_${Date.now()}`,
      freePlaysRemaining: 5, // Default free plays
    }
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

