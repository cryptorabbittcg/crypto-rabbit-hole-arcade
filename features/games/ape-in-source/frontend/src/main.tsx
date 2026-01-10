import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { IdentityProvider } from './providers/IdentityProvider'

console.log('🚀 Starting React app...')

// Test import to see if all exports work
import('./types/game').then(({ GameMode, GameModeValues, LeaderboardEntry, Card, GameState }) => {
  console.log('✅ GameMode import successful:', GameMode)
  console.log('✅ GameModeValues import successful:', GameModeValues)
  console.log('✅ LeaderboardEntry import successful:', LeaderboardEntry)
  console.log('✅ Card import successful:', Card)
  console.log('✅ GameState import successful:', GameState)
}).catch((error) => {
  console.error('❌ Types import failed:', error)
})

/**
 * Arcade Session Guard - REMOVED
 * 
 * This guard was checking for localStorage sessions, which doesn't work in embedded mode.
 * IdentityProvider now handles all authentication:
 * - Embedded mode: waits for identity via postMessage
 * - Standalone mode: uses dev fallback if VITE_ALLOW_STANDALONE=true
 * 
 * The guard has been removed to prevent blocking the app in embedded iframes.
 */

try {
  const rootElement = document.getElementById('root')
  console.log('🎯 Root element found:', rootElement)
  
  if (!rootElement) {
    throw new Error('Root element not found!')
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <IdentityProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </IdentityProvider>
    </React.StrictMode>,
  )
  
  console.log('✅ React app rendered successfully')
} catch (error) {
  console.error('❌ Failed to render React app:', error)
}
