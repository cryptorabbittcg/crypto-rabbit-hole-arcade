/**
 * Ape In Game Store
 * Stores active game states in memory (can be extended to use Vercel KV or Supabase)
 */

import { GameState, Card } from "@/features/games/ape-in/types/game"

interface StoredGame {
  gameState: GameState
  deck: Card[]
  createdAt: number
  updatedAt: number
}

// In-memory store for active games
// In production, this could be Vercel KV or Supabase
const gameStore = new Map<string, StoredGame>()

/**
 * Store a game
 */
export function storeGame(gameId: string, gameState: GameState, deck: Card[]): void {
  gameStore.set(gameId, {
    gameState,
    deck,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  
  // Cleanup old games (older than 24 hours)
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
  for (const [id, game] of gameStore.entries()) {
    if (game.updatedAt < oneDayAgo) {
      gameStore.delete(id)
    }
  }
}

/**
 * Get a game
 */
export function getGame(gameId: string): StoredGame | null {
  return gameStore.get(gameId) || null
}

/**
 * Update game state
 */
export function updateGame(gameId: string, gameState: GameState, deck: Card[]): void {
  const existing = gameStore.get(gameId)
  if (!existing) {
    throw new Error(`Game ${gameId} not found`)
  }
  
  gameStore.set(gameId, {
    gameState,
    deck,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  })
}

/**
 * Delete a game
 */
export function deleteGame(gameId: string): void {
  gameStore.delete(gameId)
}

/**
 * Get all active games (for debugging/admin)
 */
export function getAllGames(): Map<string, StoredGame> {
  return gameStore
}

