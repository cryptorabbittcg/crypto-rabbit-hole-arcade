import { WebSocketMessage } from '../types/game'

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private listeners: Map<string, Set<(data: any) => void>> = new Map()

  connect(gameId: string) {
    // TODO: Implement WebSocket support for PvP/multiplayer
    // For now, use polling via API routes
    // WebSocket URL can be configured via Next.js env vars if needed
    const wsUrl = typeof window !== 'undefined'
      ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_WS_URL
      : process.env.NEXT_PUBLIC_WS_URL
    
    // For MVP, PvP/multiplayer not yet implemented - return without connecting
    // When implementing WebSocket, use Next.js API route or Vercel/Upstash Redis
    console.log('⚠️ WebSocket not yet implemented - PvP/multiplayer will use polling')
    return
    
    // TODO: Implement WebSocket when PvP/multiplayer is ready
    // Will use Next.js API route or Redis pub/sub, not external backend

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        this.notifyListeners(message.type, message.data)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.attemptReconnect(gameId)
    }
  }

  private attemptReconnect(gameId: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      setTimeout(() => {
        this.connect(gameId)
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.error('WebSocket is not connected')
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  private notifyListeners(event: string, data: any) {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach((callback) => callback(data))
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.listeners.clear()
  }
}

export const wsService = new WebSocketService()


