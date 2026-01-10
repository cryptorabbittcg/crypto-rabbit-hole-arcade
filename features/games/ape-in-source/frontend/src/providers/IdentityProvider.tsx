/**
 * IdentityProvider
 * React Context Provider for identity management
 * Replaces ThirdwebProvider
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import {
  isEmbedded,
  requestIdentity,
  requestSession,
  setupIdentityListener,
  getDevFallbackIdentity,
} from '../lib/identity-bridge'
import type { ArcadeIdentity, IdentityState } from '../types/identity'

interface IdentityContextType extends IdentityState {}

const IdentityContext = createContext<IdentityContextType | null>(null)

export function useIdentityContext(): IdentityContextType | null {
  return useContext(IdentityContext)
}

interface IdentityProviderProps {
  children: React.ReactNode
}

export function IdentityProvider({ children }: IdentityProviderProps) {
  const [identity, setIdentity] = useState<ArcadeIdentity | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [embedded] = useState(() => isEmbedded())
  
  // Check if current route is Sandy (tutorial) - Sandy should bypass identity requirement
  // Use window.location since IdentityProvider is outside BrowserRouter
  const isSandyRoute = typeof window !== 'undefined' && window.location.pathname === '/game/sandy'
  
  // Use ref to track if identity has been received (avoids stale closures)
  const identityReceivedRef = useRef(false)

  const handleIdentity = useCallback((receivedIdentity: ArcadeIdentity) => {
    // Prevent duplicate identity handling
    if (identityReceivedRef.current) {
      console.log('⚠️ Identity already received, ignoring duplicate')
      return
    }
    
    console.log('✅ Setting identity:', receivedIdentity)
    identityReceivedRef.current = true
    setIdentity(receivedIdentity)
    setIsReady(true)
    setIsLoading(false)
    setError(null)
  }, [])

  const handleError = useCallback((errorMessage: string) => {
    console.error('❌ Identity error:', errorMessage)
    setError(errorMessage)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (embedded) {
      // Embedded mode: wait for identity from parent
      console.log('🔍 Embedded mode detected, requesting identity...')
      
      // Reset identity received flag
      identityReceivedRef.current = false
      
      // Setup listener first
      const cleanup = setupIdentityListener(handleIdentity, handleError)
      
      // Request session from parent with retry mechanism
      // Retry until session is received or component unmounts
      let retryInterval: NodeJS.Timeout | null = null
      let retryCount = 0
      const maxRetries = 60 // Retry for up to 30 seconds (60 * 500ms)
      
      const requestSessionWithRetry = () => {
        if (identityReceivedRef.current) {
          // Session already received, stop retrying
          if (retryInterval) {
            clearInterval(retryInterval)
            retryInterval = null
          }
          return
        }
        
        // Use ARCADE_SESSION_REQUEST (new protocol)
        requestSession()
        retryCount++
        
        if (retryCount >= maxRetries) {
          console.warn('⏰ Session request retries exhausted - continuing in anonymous mode')
          // Don't block - allow app to continue without session (for Sandy mode)
          setIsLoading(false)
          setIsReady(true) // Mark as ready even without identity (allows Sandy to launch)
          if (retryInterval) {
            clearInterval(retryInterval)
            retryInterval = null
          }
        }
      }
      
      // Start requesting immediately, then retry every 500ms
      requestSessionWithRetry()
      retryInterval = setInterval(requestSessionWithRetry, 500)

      return () => {
        if (retryInterval) {
          clearInterval(retryInterval)
        }
        cleanup()
      }
    } else {
      // Standalone mode: check for dev fallback
      const allowStandalone = import.meta.env.VITE_ALLOW_STANDALONE === 'true'
      
      if (allowStandalone) {
        console.log('🔧 Standalone mode with dev fallback enabled')
        const devIdentity = getDevFallbackIdentity()
        identityReceivedRef.current = true
        setIdentity(devIdentity)
        setIsReady(true)
        setIsLoading(false)
      } else {
        console.warn('⚠️ Standalone mode but VITE_ALLOW_STANDALONE not set')
        setError('Standalone mode requires VITE_ALLOW_STANDALONE=true')
        setIsLoading(false)
      }
    }
  }, [embedded, handleIdentity, handleError]) // Removed isReady and identity from deps

  const contextValue: IdentityContextType = {
    identity,
    isReady,
    isEmbedded: embedded,
    isLoading,
    error,
  }

  // Show loading state while waiting for identity (embedded mode)
  // BUT: Allow Sandy (tutorial) to bypass this - it doesn't need identity
  // Re-check route on each render in case pathname changed (client-side navigation)
  const currentIsSandyRoute = typeof window !== 'undefined' && window.location.pathname === '/game/sandy'
  const currentIsGameRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/game/')
  
  console.log('🔍 IdentityProvider render check:', {
    embedded,
    isReady,
    isLoading,
    currentIsSandyRoute,
    currentIsGameRoute,
    pathname: typeof window !== 'undefined' ? window.location.pathname : 'N/A'
  })
  
  // Allow ALL game routes to bypass identity loading (not just Sandy)
  // This ensures games can launch even if identity isn't ready yet
  if (embedded && !isReady && isLoading && !currentIsGameRoute) {
    return (
      <IdentityContext.Provider value={contextValue}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-300 text-lg">Waiting for Arcade Identity...</p>
            <p className="text-slate-500 text-sm mt-2">
              Connecting to parent window
            </p>
          </div>
        </div>
      </IdentityContext.Provider>
    )
  }

  // Show error state
  if (error && !embedded) {
    return (
      <IdentityContext.Provider value={contextValue}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          <div className="text-center max-w-md mx-auto p-6 bg-red-500/20 border border-red-500/30 rounded-xl">
            <p className="text-red-300 text-lg mb-2">⚠️ Configuration Error</p>
            <p className="text-slate-300 text-sm">{error}</p>
            <p className="text-slate-500 text-xs mt-4">
              Set VITE_ALLOW_STANDALONE=true in your .env file for standalone mode
            </p>
          </div>
        </div>
      </IdentityContext.Provider>
    )
  }

  return (
    <IdentityContext.Provider value={contextValue}>
      {children}
    </IdentityContext.Provider>
  )
}

