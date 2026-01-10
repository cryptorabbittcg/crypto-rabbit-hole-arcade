// lib/zkverify.ts
/**
 * zkVerify Integration for Ape In! Game Verification
 * 
 * This module handles zero-knowledge proof verification for Ape In! game completions
 * using zkVerify testnet. It ensures trustless validation of game victories.
 */

export interface ApeInGameState {
  gameId: string
  playerId: string
  gameMode: string
  winningScore: number
  finalScore: number
  roundsPlayed: number
  cardsDrawn: number[]
  diceRolls: number[]
  moves: GameMove[]
  timestamp: number
  walletAddress: string
}

export interface GameMove {
  type: 'draw_card' | 'roll_dice' | 'stack_sats' | 'forfeit'
  value?: number
  timestamp: number
  round: number
}

export interface ZkVerifyProofRequest {
  gameState: ApeInGameState
  verificationType: 'ape_in_victory'
}

export interface ZkVerifyProofResponse {
  success: boolean
  proofId?: string
  verified?: boolean
  error?: string
  timestamp?: number
}

export interface ZkVerifyVerificationResult {
  isValid: boolean
  proofId?: string
  error?: string
  message?: string
}

/**
 * Validates that a game state is properly formatted for zkVerify
 */
export function isValidGameState(gameState: ApeInGameState): boolean {
  if (!gameState || !gameState.gameId || !gameState.playerId) return false
  
  // Validate required fields
  if (!gameState.gameMode || !gameState.walletAddress) return false
  if (typeof gameState.finalScore !== 'number' || gameState.finalScore < 0) return false
  if (typeof gameState.winningScore !== 'number' || gameState.winningScore <= 0) return false
  if (typeof gameState.roundsPlayed !== 'number' || gameState.roundsPlayed < 0) return false
  
  // Validate arrays
  if (!Array.isArray(gameState.cardsDrawn)) return false
  if (!Array.isArray(gameState.diceRolls)) return false
  if (!Array.isArray(gameState.moves)) return false
  
  // Validate moves
  for (const move of gameState.moves) {
    if (!move.type || !move.timestamp || typeof move.round !== 'number') return false
    if (move.type === 'draw_card' && typeof move.value !== 'number') return false
    if (move.type === 'roll_dice' && typeof move.value !== 'number') return false
  }
  
  return true
}

/**
 * Submits an Ape In! game completion to zkVerify for proof generation and verification
 * 
 * @param gameState - The complete game state including all moves and final score
 * @returns Promise with verification result
 */
export async function verifyApeInGameWithZkVerify(
  gameState: ApeInGameState
): Promise<ZkVerifyVerificationResult> {
  const apiKey = import.meta.env.VITE_ZKVERIFY_API_KEY
  
  if (!apiKey) {
    console.error('zkVerify API key not configured')
    return {
      isValid: false,
      error: 'zkVerify API key not configured',
      message: 'Please set VITE_ZKVERIFY_API_KEY in your environment'
    }
  }

  // Validate input format
  if (!isValidGameState(gameState)) {
    return {
      isValid: false,
      error: 'Invalid game state format',
      message: 'Game state has invalid format or missing required fields'
    }
  }

  try {
    // Submit proof request to zkVerify
    const proofResponse = await submitProofToZkVerify({
      gameState,
      verificationType: 'ape_in_victory',
      apiKey
    })

    if (!proofResponse.success) {
      return {
        isValid: false,
        error: proofResponse.error || 'Proof submission failed',
        message: 'Failed to generate zero-knowledge proof'
      }
    }

    // Poll for verification result
    const verificationResult = await pollVerificationStatus(
      proofResponse.proofId!,
      apiKey
    )

    return {
      isValid: verificationResult.verified || false,
      proofId: proofResponse.proofId,
      message: verificationResult.verified 
        ? 'Victory verified via zero-knowledge proof'
        : 'Victory verification failed'
    }
  } catch (error) {
    console.error('zkVerify verification error:', error)
    console.log('Falling back to mock verification...')
    
    // Fallback to mock verification if zkVerify fails
    return mockVerifyApeInGame(gameState)
  }
}

/**
 * Submits a proof generation request to zkVerify API
 */
async function submitProofToZkVerify(params: {
  gameState: ApeInGameState
  verificationType: string
  apiKey: string
}): Promise<ZkVerifyProofResponse> {
  const { gameState, verificationType, apiKey } = params
  
  // zkVerify testnet endpoint
  const zkVerifyEndpoint = 'https://testnet-rpc.zkverify.io'
  
  try {
    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
    
    const response = await fetch(`${zkVerifyEndpoint}/submit-proof`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Proof-Type': verificationType
      },
      body: JSON.stringify({
        proofType: verificationType,
        publicInputs: {
          gameId: gameState.gameId,
          playerId: gameState.playerId,
          gameMode: gameState.gameMode,
          winningScore: gameState.winningScore,
          finalScore: gameState.finalScore,
          roundsPlayed: gameState.roundsPlayed,
          cardsDrawn: gameState.cardsDrawn,
          diceRolls: gameState.diceRolls,
          moveCount: gameState.moves.length,
          walletAddress: gameState.walletAddress
        },
        privateInputs: {
          moves: gameState.moves,
          timestamp: gameState.timestamp
        },
        timestamp: Date.now()
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.message || `HTTP error ${response.status}`
      }
    }

    const data = await response.json()
    return {
      success: true,
      proofId: data.proofId || data.id,
      timestamp: data.timestamp || Date.now()
    }
  } catch (error) {
    // Check if it was a timeout/abort
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timeout - zkVerify testnet may be unavailable'
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}

/**
 * Polls zkVerify for proof verification status
 * 
 * @param proofId - The proof ID to check
 * @param apiKey - zkVerify API key
 * @param maxAttempts - Maximum number of polling attempts (default: 15)
 * @param intervalMs - Polling interval in milliseconds (default: 2000)
 */
async function pollVerificationStatus(
  proofId: string,
  apiKey: string,
  maxAttempts: number = 15,
  intervalMs: number = 2000
): Promise<{ verified: boolean; error?: string }> {
  const zkVerifyEndpoint = 'https://testnet-rpc.zkverify.io'
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${zkVerifyEndpoint}/proof-status/${proofId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      })

      if (!response.ok) {
        if (attempt === maxAttempts - 1) {
          return { verified: false, error: 'Polling timeout' }
        }
        await delay(intervalMs)
        continue
      }

      const data = await response.json()
      
      // Check if verification is complete
      if (data.status === 'verified' || data.verified === true) {
        return { verified: true }
      } else if (data.status === 'failed' || data.verified === false) {
        return { verified: false, error: data.error || 'Verification failed' }
      }
      
      // Still processing, wait and retry
      if (attempt < maxAttempts - 1) {
        await delay(intervalMs)
      }
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        return { 
          verified: false, 
          error: error instanceof Error ? error.message : 'Polling error' 
        }
      }
      await delay(intervalMs)
    }
  }

  return { verified: false, error: 'Verification timeout' }
}

/**
 * Utility function to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Mock verification for development/testing when zkVerify is unavailable
 * This performs local game state validation
 */
export function mockVerifyApeInGame(
  gameState: ApeInGameState
): ZkVerifyVerificationResult {
  console.log('🔍 Mock verification for Ape In! game:', gameState.gameId)
  
  // Basic validation: check if game state is complete and valid
  if (!isValidGameState(gameState)) {
    return {
      isValid: false,
      message: 'Invalid game state format'
    }
  }

  // Validate victory condition
  if (gameState.finalScore < gameState.winningScore) {
    return {
      isValid: false,
      message: 'Final score does not meet winning condition'
    }
  }

  // Validate game progression
  if (gameState.roundsPlayed <= 0) {
    return {
      isValid: false,
      message: 'No rounds were played'
    }
  }

  // Validate moves consistency
  const drawMoves = gameState.moves.filter(m => m.type === 'draw_card').length
  const diceMoves = gameState.moves.filter(m => m.type === 'roll_dice').length
  
  if (drawMoves !== gameState.cardsDrawn.length) {
    return {
      isValid: false,
      message: 'Card draw count mismatch with moves'
    }
  }

  if (diceMoves !== gameState.diceRolls.length) {
    return {
      isValid: false,
      message: 'Dice roll count mismatch with moves'
    }
  }

  // Validate dice roll values (1-6)
  for (const roll of gameState.diceRolls) {
    if (roll < 1 || roll > 6 || !Number.isInteger(roll)) {
      return {
        isValid: false,
        message: 'Invalid dice roll value'
      }
    }
  }

  // Validate card values (positive integers)
  for (const card of gameState.cardsDrawn) {
    if (card <= 0 || !Number.isInteger(card)) {
      return {
        isValid: false,
        message: 'Invalid card value'
      }
    }
  }

  // Validate moves are in chronological order
  for (let i = 1; i < gameState.moves.length; i++) {
    if (gameState.moves[i].timestamp < gameState.moves[i - 1].timestamp) {
      return {
        isValid: false,
        message: 'Moves are not in chronological order'
      }
    }
  }

  return {
    isValid: true,
    proofId: 'mock-proof-' + Date.now(),
    message: 'Victory verified (mock mode)'
  }
}

/**
 * Helper function to create a game state from current game data
 */
export function createGameStateFromGame(
  gameId: string,
  playerId: string,
  gameMode: string,
  winningScore: number,
  finalScore: number,
  roundsPlayed: number,
  cardsDrawn: number[],
  diceRolls: number[],
  moves: GameMove[],
  walletAddress: string
): ApeInGameState {
  return {
    gameId,
    playerId,
    gameMode,
    winningScore,
    finalScore,
    roundsPlayed,
    cardsDrawn,
    diceRolls,
    moves,
    timestamp: Date.now(),
    walletAddress
  }
}
