# Ape In Child Code Fixes - PostMessage Handshake & Sandy Launch

This document contains the exact code that needs to be implemented in the **ape-in-game** (child iframe) application to fix the postMessage handshake and enable Sandy mode to launch without session.

## File 1: `src/lib/arcade-session.ts` (Child - Ape In Game)

This file handles receiving and storing the arcade session from the parent.

```typescript
// src/lib/arcade-session.ts

export interface ArcadeSession {
  sessionId: string
  userId: string
  username: string
  address: string | null
  thirdwebClientId: string
  tickets: number
  points: number
  timestamp: number
  avatar?: string | null
}

const SESSION_KEY = 'crypto_rabbit_session'
const SESSION_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Get the arcade session from storage
 */
export function getArcadeSession(): ArcadeSession | null {
  if (typeof window === 'undefined') return null

  const stored = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)

  if (!stored) {
    return null
  }

  try {
    const session = JSON.parse(stored) as ArcadeSession

    // Validate required fields
    if (!session.sessionId || !session.userId || !session.username || !session.thirdwebClientId) {
      console.warn('⚠️ Invalid arcade session: missing required fields')
      return null
    }

    // Check if session is expired
    const sessionAge = Date.now() - session.timestamp
    if (sessionAge > SESSION_EXPIRY) {
      console.log('⏰ Arcade session expired')
      clearArcadeSession()
      return null
    }

    return session
  } catch (error) {
    console.error('❌ Failed to parse arcade session:', error)
    return null
  }
}

/**
 * Store the arcade session in localStorage
 */
export function setArcadeSession(session: ArcadeSession): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    console.log('✅ Arcade session stored:', {
      sessionId: session.sessionId,
      username: session.username,
      hasClientId: !!session.thirdwebClientId,
    })
  } catch (error) {
    console.error('❌ Failed to store arcade session:', error)
  }
}

/**
 * Clear the arcade session
 */
export function clearArcadeSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
  console.log('🗑️ Arcade session cleared')
}

/**
 * Check if user is authenticated
 */
export function isArcadeAuthenticated(): boolean {
  return getArcadeSession() !== null
}
```

## File 2: `src/hooks/use-arcade-session.ts` (Child - Ape In Game)

This hook sets up the postMessage listener and requests session from parent.

```typescript
// src/hooks/use-arcade-session.ts

import { useEffect, useState } from 'react'
import { getArcadeSession, setArcadeSession, type ArcadeSession } from '@/lib/arcade-session'

/**
 * Allowed parent origins - these are the arcade hub domains
 */
const ALLOWED_PARENT_ORIGINS = [
  'https://arcade.thecryptorabbithole.io',  // Production arcade hub
  'http://localhost:3000',                   // Local arcade hub
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]

/**
 * Hook to manage arcade session received from parent via postMessage
 */
export function useArcadeSession() {
  const [session, setSession] = useState<ArcadeSession | null>(getArcadeSession())
  const [isRequestingSession, setIsRequestingSession] = useState(false)

  useEffect(() => {
    console.log('🔧 Setting up message listener for arcade hub...')

    // Check if we're in an iframe
    const isInIframe = window.parent !== window
    console.log('📍 Is in iframe:', isInIframe)

    const handleMessage = (event: MessageEvent) => {
      // Log all messages for debugging
      console.log('📨 Message event received:', {
        origin: event.origin,
        ownOrigin: window.location.origin,
        type: event.data?.type,
        isFromSelf: event.origin === window.location.origin,
        isFromParent: isInIframe && event.origin !== window.location.origin,
      })

      // ⚠️ CRITICAL: Ignore messages from self (iframe sending to itself)
      if (event.origin === window.location.origin) {
        console.log('⏭️ Ignoring message from self (own origin)')
        return
      }

      // ✅ Accept messages from PARENT (arcade hub) only
      if (!ALLOWED_PARENT_ORIGINS.includes(event.origin)) {
        console.warn('⚠️ Rejected message from unauthorized origin:', event.origin)
        console.warn('   Allowed origins:', ALLOWED_PARENT_ORIGINS)
        console.warn('   Own origin:', window.location.origin)
        return
      }

      // ✅ Process ARCADE_IDENTITY message
      if (event.data?.type === 'ARCADE_IDENTITY') {
        console.log('✅ ARCADE_IDENTITY received from parent:', event.origin)
        console.log('📦 Message data:', event.data)

        // Extract session (handle both nested and flattened structure)
        const sessionData = event.data.session || event.data

        // Validate session data
        if (!sessionData.sessionId || !sessionData.userId || !sessionData.username || !sessionData.thirdwebClientId) {
          console.warn('⚠️ Invalid ARCADE_IDENTITY: missing required fields', sessionData)
          return
        }

        // Create full session object
        const session: ArcadeSession = {
          sessionId: sessionData.sessionId,
          userId: sessionData.userId,
          username: sessionData.username,
          address: sessionData.address || null,
          thirdwebClientId: sessionData.thirdwebClientId,
          tickets: sessionData.tickets || 0,
          points: sessionData.points || 0,
          timestamp: sessionData.timestamp || Date.now(),
          avatar: sessionData.avatar || null,
        }

        // Store session
        setArcadeSession(session)
        setSession(session)
        setIsRequestingSession(false)
        
        console.log('✅ Arcade session stored:', {
          hasSession: !!session,
          username: session.username,
          address: session.address,
          hasAvatar: !!session.avatar,
          thirdwebClientId: session.thirdwebClientId.substring(0, 10) + '...',
        })
      }
    }

    window.addEventListener('message', handleMessage)
    console.log('✅ Message listener registered')

    // Request session from parent if in iframe
    if (isInIframe) {
      console.log('📤 Requesting session from parent window...')
      setIsRequestingSession(true)

      // Retry mechanism: request session multiple times until received
      let retryCount = 0
      const maxRetries = 10 // Try for up to 5 seconds (10 * 500ms)
      const retryInterval = setInterval(() => {
        if (session) {
          // Session received, stop retrying
          clearInterval(retryInterval)
          setIsRequestingSession(false)
          return
        }

        if (retryCount < maxRetries) {
          console.log(`🔄 Retry ${retryCount + 1}/${maxRetries} - requesting session from parent...`)
          window.parent.postMessage({ type: 'ARCADE_SESSION_REQUEST' }, '*')
          retryCount++
        } else {
          console.warn('⚠️ Max retries reached for session request, giving up')
          clearInterval(retryInterval)
          setIsRequestingSession(false)
        }
      }, 500)

      // Initial request
      window.parent.postMessage({ type: 'ARCADE_SESSION_REQUEST' }, '*')

      // Cleanup interval on unmount
      return () => {
        clearInterval(retryInterval)
        window.removeEventListener('message', handleMessage)
      }
    }

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, []) // Only run on mount

  return {
    session,
    isRequestingSession,
    hasSession: !!session,
  }
}
```

## File 3: `src/components/ArcadeSessionGuard.tsx` (Child - Ape In Game)

This component wraps the app and handles session, but allows Sandy mode to launch without session.

```typescript
// src/components/ArcadeSessionGuard.tsx

import { useEffect, useState, ReactNode } from 'react'
import { useArcadeSession } from '@/hooks/use-arcade-session'
import { getArcadeSession } from '@/lib/arcade-session'

interface ArcadeSessionGuardProps {
  children: ReactNode
}

export function ArcadeSessionGuard({ children }: ArcadeSessionGuardProps) {
  const { session, isRequestingSession, hasSession } = useArcadeSession()
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    // Check for existing session in storage
    const existingSession = getArcadeSession()
    
    if (existingSession) {
      console.log('✅ Found existing arcade session in storage')
      setSessionChecked(true)
    } else {
      // No session found - this is OK for anonymous/Sandy mode
      console.log('🔍 No arcade session found - continuing in anonymous mode')
      console.log('ℹ️ Sandy mode can launch without session')
      setSessionChecked(true)
    }
  }, [])

  // Always render children - session is optional for Sandy mode
  // The game launch logic should handle missing session gracefully
  return <>{children}</>
}
```

## File 4: `src/lib/supabase/client.ts` (Child - Ape In Game)

Fix Supabase client to never use placeholder and fail gracefully.

```typescript
// src/lib/supabase/client.ts

import { createBrowserClient } from "@supabase/ssr"

let clientInstance: ReturnType<typeof createBrowserClient> | null = null

/**
 * Check if Supabase is properly configured
 */
export function hasSupabaseConfig(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  return !!(
    url &&
    key &&
    !url.includes("placeholder") &&
    !key.includes("placeholder") &&
    url !== "https://placeholder.supabase.co"
  )
}

export function createClient() {
  // Return cached instance if already created
  if (clientInstance) {
    return clientInstance
  }

  const url = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Guard: Only create client if env vars are properly configured
  // Never use placeholder.supabase.co - fail gracefully instead
  if (!url || !key || url.includes("placeholder") || url === "https://placeholder.supabase.co") {
    console.warn("[Ape In] Missing or invalid Supabase environment variables:", {
      hasUrl: !!url,
      hasKey: !!key,
      urlIncludesPlaceholder: url?.includes("placeholder"),
    })
    
    // Return null - callers should check hasSupabaseConfig() before using
    return null as any
  }

  try {
    clientInstance = createBrowserClient(url, key)
    return clientInstance
  } catch (error) {
    console.error("[Ape In] Failed to create Supabase client:", error)
    return null as any
  }
}
```

## File 5: `src/utils/game-launch.ts` (Child - Ape In Game)

Fix game launch logic to allow Sandy mode without session.

```typescript
// src/utils/game-launch.ts

import { getArcadeSession } from '@/lib/arcade-session'
import { hasSupabaseConfig, createClient } from '@/lib/supabase/client'

/**
 * Launch game mode - Sandy mode can launch without session
 */
export async function launchGame(mode: string): Promise<boolean> {
  const isSandy = mode.toLowerCase() === 'sandy'
  const session = getArcadeSession()

  console.log('🎮 launchGame() called:', {
    mode,
    isSandy,
    hasSession: !!session,
    timestamp: Date.now(),
  })

  // ✅ Sandy should work completely independently
  if (isSandy) {
    console.log('✅ Sandy mode - bypassing ALL checks (session, Supabase, wallet)')
    
    try {
      // Launch Sandy directly - NO checks, NO database, NO session needed
      await startSandyTutorialGame()  // Your actual Sandy launch function
      
      console.log('✅ Sandy tutorial launched successfully')
      return true
    } catch (error) {
      console.error('❌ Sandy launch failed:', error)
      console.error('Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name,
      })
      throw error
    }
  }

  // Other modes - try to use session if available, but don't block
  if (!session) {
    console.warn('⚠️ No arcade session for', mode, '- continuing as guest')
  }

  // Try to save to Supabase, but don't block if it fails
  try {
    if (session && hasSupabaseConfig()) {
      const supabase = createClient()
      if (supabase) {
        await supabase.from('game_sessions').insert({
          user_id: session.userId,
          game_type: mode,
          score: 0,
          points_earned: 0,
          result: 'in_progress',
        })
        console.log('✅ Game session saved to Supabase')
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to save to Supabase (non-blocking):', error)
    // Continue anyway - game can still launch
  }

  // Launch game regardless of Supabase status
  try {
    await startGameMode(mode)  // Your actual game launch function
    console.log('✅ Game started successfully:', mode)
    return true
  } catch (error) {
    console.error('❌ Game launch failed:', error)
    throw error
  }
}

/**
 * Start Sandy tutorial game - no dependencies
 */
async function startSandyTutorialGame(): Promise<void> {
  // Your actual Sandy tutorial launch code here
  // This should NOT check for session, Supabase, or wallet
  // It should just start the tutorial game directly
  console.log('🎮 Starting Sandy tutorial game...')
  
  // Example: Navigate to tutorial route or start tutorial state
  // window.location.href = '/tutorial'
  // OR
  // setGameState({ mode: 'sandy', isTutorial: true })
  
  // For now, just log - replace with actual implementation
  throw new Error('startSandyTutorialGame() not implemented - replace with actual Sandy launch code')
}

/**
 * Start other game modes
 */
async function startGameMode(mode: string): Promise<void> {
  // Your actual game launch code here
  console.log('🎮 Starting game mode:', mode)
  
  // Example: Navigate to game route or start game state
  // window.location.href = `/game/${mode}`
  // OR
  // setGameState({ mode, isTutorial: false })
  
  // For now, just log - replace with actual implementation
  throw new Error('startGameMode() not implemented - replace with actual game launch code')
}
```

## File 6: `src/App.tsx` or `src/main.tsx` (Child - Ape In Game)

Wrap the app with ArcadeSessionGuard.

```typescript
// src/main.tsx or src/App.tsx

import { ArcadeSessionGuard } from '@/components/ArcadeSessionGuard'
import { App } from './App'

function Root() {
  return (
    <ArcadeSessionGuard>
      <App />
    </ArcadeSessionGuard>
  )
}

export default Root
```

## Summary of Changes

### Parent (Arcade Hub) - Already Fixed ✅
- `components/game-modal.tsx`: Uses exact origin from iframe src, handles ARCADE_SESSION_REQUEST
- `lib/supabase/client.ts`: Removed placeholder.supabase.co, guards creation

### Child (Ape In Game) - To Implement
1. **`src/lib/arcade-session.ts`**: Session storage/retrieval functions
2. **`src/hooks/use-arcade-session.ts`**: postMessage listener with origin allowlisting and retry loop
3. **`src/components/ArcadeSessionGuard.tsx`**: Optional session guard (allows anonymous mode)
4. **`src/lib/supabase/client.ts`**: Fixed to never use placeholder
5. **`src/utils/game-launch.ts`**: Sandy mode launches without session/Supabase
6. **Wrap app** with ArcadeSessionGuard component

## Key Points

1. **Origin Allowlisting**: Child only accepts messages from allowed parent origins (arcade hub domains)
2. **Self-Message Filtering**: Child ignores messages from its own origin
3. **Retry Loop**: Child requests session via ARCADE_SESSION_REQUEST in a retry loop until received
4. **Session Storage**: Session is stored in localStorage for persistence
5. **Sandy Mode**: Always launches without any checks (session, Supabase, wallet)
6. **Supabase Guards**: All Supabase operations check `hasSupabaseConfig()` before executing
7. **Graceful Degradation**: Missing session/Supabase doesn't block UI or game launch

