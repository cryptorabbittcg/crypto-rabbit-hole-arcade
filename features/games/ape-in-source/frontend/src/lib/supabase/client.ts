/**
 * Supabase Client Module
 * Single source of truth for Supabase client initialization
 * 
 * Returns null if Supabase is not configured (env vars missing)
 * Never throws - app must work without Supabase
 * 
 * Uses fetch API directly (no @supabase/supabase-js dependency required)
 */

// Get environment variables (Vite uses import.meta.env, not process.env)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

/**
 * Validate Supabase URL format
 */
function isValidSupabaseUrl(url: string): boolean {
  if (!url || url.length === 0) return false
  if (url.includes('placeholder')) return false
  if (url.includes('placeholder.supabase.co')) return false
  if (url.includes('supabase-not-configured')) return false
  if (!url.startsWith('https://')) return false
  // Must be a valid Supabase project URL format
  if (!url.match(/^https:\/\/[a-z0-9-]+\.supabase\.co$/)) return false
  return true
}

/**
 * Validate Supabase anon key format
 */
function isValidSupabaseKey(key: string): boolean {
  if (!key || key.length === 0) return false
  if (key.includes('placeholder')) return false
  // Supabase anon keys are JWT tokens, typically start with 'eyJ'
  if (key.length < 100) return false
  return true
}

/**
 * Check if Supabase is properly configured
 */
export function hasSupabaseConfig(): boolean {
  return isValidSupabaseUrl(SUPABASE_URL) && isValidSupabaseKey(SUPABASE_ANON_KEY)
}

/**
 * Supabase client configuration
 * 
 * - If env vars are missing or invalid: null (app continues without Supabase)
 * - If env vars are valid: returns config object with URL and key
 * 
 * Never throws - always returns null or a valid config
 */
export interface SupabaseConfig {
  url: string
  key: string
  headers: {
    'apikey': string
    'Authorization': string
    'Content-Type': string
  }
}

export const supabase: SupabaseConfig | null = (() => {
  // Early return if not configured
  if (!hasSupabaseConfig()) {
    // Only log once to avoid spam
    const lastWarnTime = sessionStorage.getItem('last_supabase_client_warn_time')
    const now = Date.now()
    if (!lastWarnTime || now - parseInt(lastWarnTime) > 60000) {
      console.warn('⚠️ Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.')
      sessionStorage.setItem('last_supabase_client_warn_time', now.toString())
    }
    return null
  }

  try {
    // Return configuration object
    const config: SupabaseConfig = {
      url: SUPABASE_URL,
      key: SUPABASE_ANON_KEY,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    }
    
    console.log('✅ Supabase client initialized')
    return config
  } catch (error) {
    console.error('❌ Failed to create Supabase config:', error)
    return null
  }
})()

/**
 * Database schema types (for TypeScript)
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          wallet_address: string
          username?: string
          avatar_url?: string
          created_at?: string
          updated_at?: string
        }
        Insert: {
          wallet_address: string
          username?: string
          avatar_url?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          wallet_address?: string
          username?: string
          avatar_url?: string
          created_at?: string
          updated_at?: string
        }
      }
      game_sessions: {
        Row: {
          id: string
          user_id?: string
          wallet_address: string
          game_type: string
          game_mode: string
          game_subtype: string
          score: number
          result?: 'WIN' | 'DRAW' | 'LOSS' | 'FORFEIT'
          points_earned?: number
          duration_ms?: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          wallet_address: string
          game_type: string
          game_mode: string
          game_subtype: string
          score: number
          result?: 'WIN' | 'DRAW' | 'LOSS' | 'FORFEIT'
          points_earned?: number
          duration_ms?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          wallet_address?: string
          game_type?: string
          game_mode?: string
          game_subtype?: string
          score?: number
          result?: 'WIN' | 'DRAW' | 'LOSS' | 'FORFEIT'
          points_earned?: number
          duration_ms?: number
          created_at?: string
        }
      }
    }
    Functions: {
      get_top_game_scores?: {
        Args: {
          limit_count?: number
          game_mode_filter?: string
        }
        Returns: {
          wallet_address: string
          username?: string
          avatar_url?: string
          score: number
          game_mode: string
          created_at: string
        }[]
      }
    }
  }
}

