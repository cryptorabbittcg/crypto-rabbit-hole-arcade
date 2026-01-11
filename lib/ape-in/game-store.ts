/**
 * Ape In Game Store
 * Stores active game states in Supabase (persistent across serverless function invocations)
 * Falls back to in-memory storage if Supabase is not configured
 * Note: Original implementation uses weighted card drawing (no physical deck)
 */

import { GameState } from "@/features/games/ape-in/types/game"
import { createClient } from "@/lib/supabase/server"

interface StoredGame {
  gameState: GameState
  createdAt: number
  updatedAt: number
}

// In-memory fallback store for when Supabase is not available
const inMemoryStore = new Map<string, StoredGame>()

/**
 * Store a game in Supabase (or in-memory if Supabase not available)
 * Note: No deck parameter - original uses weighted card drawing, not physical deck
 */
export async function storeGame(gameId: string, gameState: GameState): Promise<void> {
  const stored: StoredGame = {
    gameState,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  
  // Try Supabase first
  try {
    const supabase = await createClient()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
    
    // Check if game exists first to handle created_at properly
    const { data: existing } = await supabase
      .from('ape_in_game_states')
      .select('game_id, created_at')
      .eq('game_id', gameId)
      .single()
    
    const now = new Date().toISOString()
    const upsertData: any = {
      game_id: gameId,
      game_state: gameState as any,
      updated_at: now,
      expires_at: expiresAt,
    }
    
    // Only set created_at if this is a new game
    if (!existing) {
      upsertData.created_at = now
    }
    
    const { data, error } = await supabase
      .from('ape_in_game_states')
      .upsert(upsertData, {
        onConflict: 'game_id'
      })
      .select()
    
    if (error) {
      // Check if it's a table not found error
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.error(`❌ Table 'ape_in_game_states' does not exist. Please run scripts/06-create-ape-in-game-states-table.sql in Supabase`)
      }
      console.error(`❌ Supabase error storing game ${gameId}:`, {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      throw error
    }
    
    console.log(`✅ Game ${gameId} stored in Supabase successfully`, data ? `(${data.length} rows affected)` : '')
    return
  } catch (error: any) {
    console.error(`❌ Failed to store game ${gameId} in Supabase, falling back to memory:`, {
      error: error?.message || error,
      code: error?.code,
      details: error?.details
    })
    // Fall through to in-memory storage
  }
  
  // Fallback to in-memory storage
  inMemoryStore.set(gameId, stored)
  console.warn(`⚠️ Game ${gameId} stored in memory (Supabase not available or failed)`)
  
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
 * Get a game from Supabase (or in-memory if Supabase not available)
 */
export async function getGame(gameId: string): Promise<StoredGame | null> {
  // Try Supabase first
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('ape_in_game_states')
      .select('game_state, created_at, updated_at, expires_at')
      .eq('game_id', gameId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - game not found
        console.warn(`⚠️ Game ${gameId} not found in Supabase`)
      } else if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.error(`❌ Table 'ape_in_game_states' does not exist. Please run scripts/06-create-ape-in-game-states-table.sql in Supabase`)
        throw error
      } else {
        console.error(`❌ Supabase error getting game ${gameId}:`, {
          code: error.code,
          message: error.message,
          details: error.details
        })
        throw error
      }
    } else if (data) {
      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        console.warn(`⚠️ Game ${gameId} has expired`)
        await supabase.from('ape_in_game_states').delete().eq('game_id', gameId)
        return null
      }
      
      const stored: StoredGame = {
        gameState: data.game_state as GameState,
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime(),
      }
      
      console.log(`✅ Game ${gameId} retrieved from Supabase`)
      return stored
    }
  } catch (error: any) {
    console.error(`❌ Failed to get game ${gameId} from Supabase, falling back to memory:`, {
      error: error?.message || error,
      code: error?.code,
      details: error?.details
    })
    // Fall through to in-memory storage
  }
  
  // Fallback to in-memory storage
  const inMemory = inMemoryStore.get(gameId)
  if (inMemory) {
    console.log(`✅ Game ${gameId} retrieved from memory`)
    return inMemory
  }
  
  console.warn(`❌ Game ${gameId} not found in memory either`)
  return null
}

/**
 * Update game state in Supabase (or in-memory if Supabase not available)
 * Note: No deck parameter - original uses weighted card drawing, not physical deck
 */
export async function updateGame(gameId: string, gameState: GameState): Promise<void> {
  // Try Supabase first
  try {
    const supabase = await createClient()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Refresh to 24 hours
    
    // Check if game exists first
    const { data: existing } = await supabase
      .from('ape_in_game_states')
      .select('game_id')
      .eq('game_id', gameId)
      .single()
    
    if (!existing) {
      throw new Error(`Game ${gameId} not found`)
    }
    
    const { error } = await supabase
      .from('ape_in_game_states')
      .update({
        game_state: gameState as any,
        updated_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .eq('game_id', gameId)
    
    if (error) {
      throw error
    }
    
    console.log(`✅ Game ${gameId} updated in Supabase`)
    return
  } catch (error) {
    console.error(`❌ Failed to update game ${gameId} in Supabase, falling back to memory:`, error)
    // Fall through to in-memory storage
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
 * Delete a game from Supabase (or in-memory if Supabase not available)
 */
export async function deleteGame(gameId: string): Promise<void> {
  // Try Supabase first
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('ape_in_game_states')
      .delete()
      .eq('game_id', gameId)
    
    if (error) {
      throw error
    }
    
    console.log(`✅ Game ${gameId} deleted from Supabase`)
    return
  } catch (error) {
    console.error(`❌ Failed to delete game ${gameId} from Supabase, falling back to memory:`, error)
    // Fall through to in-memory storage
  }
  
  // Fallback to in-memory storage
  inMemoryStore.delete(gameId)
}
