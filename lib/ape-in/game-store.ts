/**
 * Ape In Game Store
 * Stores active game states in Vercel KV (persistent across serverless function invocations)
 * Falls back to in-memory storage if KV is not configured
 * Note: Original implementation uses weighted card drawing (no physical deck)
 */

import { GameState } from "@/features/games/ape-in/types/game"

interface StoredGame {
  gameState: GameState
  createdAt: number
  updatedAt: number
}

// Check if Vercel KV is configured
function isKVConfigured(): boolean {
  return !!(
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN &&
    process.env.KV_REST_API_URL !== "" &&
    process.env.KV_REST_API_TOKEN !== ""
  )
}

// In-memory fallback store for when KV is not available
const inMemoryStore = new Map<string, StoredGame>()

// Key prefix for game storage in KV
const GAME_KEY_PREFIX = "apein:game:"

/**
 * Store a game in Vercel KV (or in-memory if KV not available)
 * Note: No deck parameter - original uses weighted drawing, not physical deck
 */
export async function storeGame(gameId: string, gameState: GameState): Promise<void> {
  const stored: StoredGame = {
    gameState,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  
  if (isKVConfigured()) {
    // Use Vercel KV
    try {
      const { kv } = await import("@vercel/kv")
      const key = `${GAME_KEY_PREFIX}${gameId}`
      await kv.set(key, stored, { ex: 86400 }) // Expire after 24 hours (86400 seconds)
      return
    } catch (error) {
      console.error(`❌ Failed to store game ${gameId} in KV, falling back to memory:`, error)
      // Fall through to in-memory storage
    }
  }
  
  // Fallback to in-memory storage
  inMemoryStore.set(gameId, stored)
  
  // Cleanup old games (older than 24 hours) from in-memory store
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
  const keysToDelete: string[] = []
  inMemoryStore.forEach((game, id) => {
    if (game.updatedAt < oneDayAgo) {
      keysToDelete.push(id)
    }
  })
  keysToDelete.forEach(id => inMemoryStore.delete(id))
}

/**
 * Get a game from Vercel KV (or in-memory if KV not available)
 */
export async function getGame(gameId: string): Promise<StoredGame | null> {
  if (isKVConfigured()) {
    // Use Vercel KV
    try {
      const { kv } = await import("@vercel/kv")
      const key = `${GAME_KEY_PREFIX}${gameId}`
      const stored = await kv.get<StoredGame>(key)
      return stored || null
    } catch (error) {
      console.error(`❌ Failed to get game ${gameId} from KV, falling back to memory:`, error)
      // Fall through to in-memory storage
    }
  }
  
  // Fallback to in-memory storage
  return inMemoryStore.get(gameId) || null
}

/**
 * Update game state in Vercel KV (or in-memory if KV not available)
 * Note: No deck parameter - original uses weighted drawing, not physical deck
 */
export async function updateGame(gameId: string, gameState: GameState): Promise<void> {
  if (isKVConfigured()) {
    // Use Vercel KV
    try {
      const { kv } = await import("@vercel/kv")
      const key = `${GAME_KEY_PREFIX}${gameId}`
      const existing = await kv.get<StoredGame>(key)
      if (!existing) {
        throw new Error(`Game ${gameId} not found`)
      }
      
      const updated: StoredGame = {
        gameState,
        createdAt: existing.createdAt,
        updatedAt: Date.now(),
      }
      
      await kv.set(key, updated, { ex: 86400 }) // Refresh expiration to 24 hours
      return
    } catch (error) {
      console.error(`❌ Failed to update game ${gameId} in KV, falling back to memory:`, error)
      // Fall through to in-memory storage
    }
  }
  
  // Fallback to in-memory storage
  const existing = inMemoryStore.get(gameId)
  if (!existing) {
    throw new Error(`Game ${gameId} not found`)
  }
  
  inMemoryStore.set(gameId, {
    gameState,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  })
}

/**
 * Delete a game from Vercel KV (or in-memory if KV not available)
 */
export async function deleteGame(gameId: string): Promise<void> {
  if (isKVConfigured()) {
    // Use Vercel KV
    try {
      const { kv } = await import("@vercel/kv")
      const key = `${GAME_KEY_PREFIX}${gameId}`
      await kv.del(key)
      return
    } catch (error) {
      console.error(`❌ Failed to delete game ${gameId} from KV, falling back to memory:`, error)
      // Fall through to in-memory storage
    }
  }
  
  // Fallback to in-memory storage
  inMemoryStore.delete(gameId)
}

