/**
 * useIdentity Hook
 * Replacement for useActiveAccount from thirdweb
 * Provides identity from parent window (iframe) or dev fallback (standalone)
 */

import { useEffect, useState } from 'react'
import { useIdentityContext } from '../providers/IdentityProvider'
import type { ArcadeIdentity } from '../types/identity'

export interface UseIdentityResult {
  address: string | null
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  identity: ArcadeIdentity | null
  isReady: boolean
  isEmbedded: boolean
  isLoading: boolean
}

/**
 * Hook to access identity throughout the app
 * Replaces useActiveAccount from thirdweb
 */
export function useIdentity(): UseIdentityResult {
  const context = useIdentityContext()

  if (!context) {
    // Fallback if used outside provider (shouldn't happen)
    console.warn('⚠️ useIdentity used outside IdentityProvider')
    return {
      address: null,
      username: null,
      displayName: null,
      avatarUrl: null,
      identity: null,
      isReady: false,
      isEmbedded: false,
      isLoading: true,
    }
  }

  const { identity, isReady, isEmbedded, isLoading } = context

  return {
    address: identity?.address || null,
    username: identity?.username || identity?.displayName || null,
    displayName: identity?.displayName || identity?.username || null,
    avatarUrl: identity?.avatarUrl || null,
    identity: identity,
    isReady,
    isEmbedded,
    isLoading,
  }
}

