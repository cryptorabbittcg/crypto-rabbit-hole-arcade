// API Client for Ape In Game
// Uses Next.js API routes (relative URLs)
import { Card, GameState, LeaderboardEntry, GameMode, BotAction, RollResult } from '../types/game'

const API_BASE_URL = '/api/ape-in'

// Helper function for API calls (using fetch instead of axios)
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  console.log('🌐 API Request:', {
    url,
    method: options.method || 'GET',
    body: options.body,
  })
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Response Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('✅ API Response:', {
      status: response.status,
      data,
    })
    
    return data
  } catch (error) {
    console.error('❌ API Request Error:', error)
    throw error
  }
}

// Game API
export const gameAPI = {
  // Create a new game
  // NOTE: This function does NOT require session, Supabase, or wallet
  // Sandy mode can be created with just playerName
  createGame: async (mode: GameMode, playerName: string, walletAddress?: string, isDailyFree?: boolean): Promise<GameState> => {
    const isSandy = mode.toLowerCase() === 'sandy'
    
    console.log('🚀 API: Creating game with data:', { 
      mode, 
      playerName, 
      walletAddress, 
      isDailyFree,
      isSandy,
      requiresWallet: !isSandy,
    })
    
    try {
      const requestData = {
        mode,
        playerName,
        // Only include walletAddress if provided (Sandy doesn't need it)
        ...(walletAddress && { walletAddress }),
        isDailyFree: isDailyFree || false,
      }
      
      const game = await apiCall<GameState>('/game/create', {
        method: 'POST',
        body: JSON.stringify(requestData),
      })
      
      console.log('✅ API: Game created successfully:', {
        gameId: game?.gameId,
        mode: game?.mode,
        playerName: game?.playerName,
      })
      
      return game
    } catch (error: any) {
      console.error('❌ API: Game creation failed:', error)
      
      // For Sandy, provide more helpful error message
      if (isSandy) {
        console.error('❌ Sandy game creation failed - this should work without any checks!')
      }
      
      throw error
    }
  },

  // Join an existing game (for PvP/multiplayer) - TODO: implement
  joinGame: async (gameId: string, playerName: string, walletAddress?: string) => {
    throw new Error('Join game not yet implemented')
  },

  // Draw a card - returns card with optional gameState
  drawCard: async (gameId: string): Promise<Card | (Card & { gameState?: GameState })> => {
    return apiCall<Card | (Card & { gameState?: GameState })>(`/game/${gameId}/draw`, {
      method: 'POST',
    })
  },

  // Roll dice - returns RollResult with botActions if player busted
  rollDice: async (gameId: string): Promise<RollResult> => {
    return apiCall<RollResult>(
      `/game/${gameId}/roll`,
      { method: 'POST' }
    )
  },

  // Stack (end turn) - returns GameState with botActions if bot turn occurs
  stackSats: async (gameId: string): Promise<GameState & { botActions?: BotAction[] }> => {
    return apiCall<GameState & { botActions?: BotAction[] }>(`/game/${gameId}/stack`, {
      method: 'POST',
    })
  },

  // Forfeit game
  forfeitGame: async (gameId: string): Promise<GameState> => {
    return apiCall<GameState>(`/game/${gameId}/forfeit`, {
      method: 'POST',
    })
  },

  // Get game state
  getGameState: async (gameId: string): Promise<GameState> => {
    return apiCall<GameState>(`/game/${gameId}`)
  },
}

// Leaderboard API - TODO: implement
export const leaderboardAPI = {
  getLeaderboard: async (limit: number = 20): Promise<LeaderboardEntry[]> => {
    throw new Error('Leaderboard API not yet implemented')
  },

  getPlayerStats: async (walletAddress: string) => {
    throw new Error('Player stats API not yet implemented')
  },
}


