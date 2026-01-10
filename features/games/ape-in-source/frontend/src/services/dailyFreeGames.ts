import { GameMode } from '../types/game'

// Modes that have daily free plays: Aida, Lana, En-J1n, Nifty (5 per day per mode)
const FREE_PLAY_MODES: GameMode[] = ['aida', 'lana', 'enj1n', 'nifty']
const FREE_PLAYS_PER_DAY = 5

export interface DailyFreePlay {
  gameMode: GameMode
  walletAddress: string
  dateUsed: string // YYYY-MM-DD format (local midnight)
  timestamp: number
}

export class DailyFreeGameService {
  /**
   * Get today's date string (YYYY-MM-DD) at local midnight
   */
  private static getTodayDate(): string {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return today.toISOString().split('T')[0] // YYYY-MM-DD format
  }

  /**
   * Get storage key for a wallet address
   */
  private static getStorageKey(walletAddress: string): string {
    return `dailyFreePlays_${walletAddress.toLowerCase()}`
  }

  /**
   * Get all free plays used today for a mode
   */
  private static getTodayFreePlays(walletAddress: string, gameMode: GameMode): DailyFreePlay[] {
    if (!walletAddress) return []
    
    const storageKey = this.getStorageKey(walletAddress)
    const stored = localStorage.getItem(storageKey)
    
    if (!stored) return []
    
    try {
      const allPlays: DailyFreePlay[] = JSON.parse(stored)
      const today = this.getTodayDate()
      
      // Filter to today's plays for this mode
      return allPlays.filter(play => 
        play.gameMode === gameMode && 
        play.dateUsed === today
      )
    } catch (error) {
      console.error('Error parsing daily free plays:', error)
      return []
    }
  }

  /**
   * Clean up old entries (before today)
   */
  private static cleanupOldEntries(walletAddress: string): void {
    if (!walletAddress) return
    
    const storageKey = this.getStorageKey(walletAddress)
    const stored = localStorage.getItem(storageKey)
    
    if (!stored) return
    
    try {
      const allPlays: DailyFreePlay[] = JSON.parse(stored)
      const today = this.getTodayDate()
      
      // Keep only today's plays
      const todayPlays = allPlays.filter(play => play.dateUsed === today)
      
      localStorage.setItem(storageKey, JSON.stringify(todayPlays))
    } catch (error) {
      console.error('Error cleaning up daily free plays:', error)
    }
  }

  /**
   * Check if user has free plays remaining for a mode
   */
  static getFreePlaysRemaining(walletAddress: string, gameMode: GameMode): number {
    if (!walletAddress || !FREE_PLAY_MODES.includes(gameMode)) return 0
    
    this.cleanupOldEntries(walletAddress)
    const todayPlays = this.getTodayFreePlays(walletAddress, gameMode)
    return Math.max(0, FREE_PLAYS_PER_DAY - todayPlays.length)
  }

  /**
   * Check if user is eligible for a free play
   */
  static isEligibleForDailyFree(walletAddress: string, gameMode: GameMode): boolean {
    if (!walletAddress) return false
    
    // Sandy is always free (tutorial)
    if (gameMode === 'sandy') return true
    
    // Only Aida, Lana, En-J1n, Nifty have free plays
    if (!FREE_PLAY_MODES.includes(gameMode)) return false
    
    return this.getFreePlaysRemaining(walletAddress, gameMode) > 0
  }

  /**
   * Use a free play for a mode
   */
  static useDailyFreeGame(walletAddress: string, gameMode: GameMode): void {
    if (!walletAddress || !FREE_PLAY_MODES.includes(gameMode)) return
    
    const storageKey = this.getStorageKey(walletAddress)
    const today = this.getTodayDate()
    const now = Date.now()
    
    // Clean up old entries first
    this.cleanupOldEntries(walletAddress)
    
    // Get existing plays
    let allPlays: DailyFreePlay[] = []
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        allPlays = JSON.parse(stored)
        // Keep only today's plays
        allPlays = allPlays.filter(play => play.dateUsed === today)
      } catch (error) {
        console.error('Error parsing existing daily free plays:', error)
        allPlays = []
      }
    }
    
    // Add new play
    allPlays.push({
      gameMode,
      walletAddress: walletAddress.toLowerCase(),
      dateUsed: today,
      timestamp: now
    })
    
    // Save back to localStorage
    localStorage.setItem(storageKey, JSON.stringify(allPlays))
    
    console.log(`✅ Used free play for ${gameMode}. Remaining: ${this.getFreePlaysRemaining(walletAddress, gameMode)}`)
  }

  /**
   * Get next reset time (midnight local time)
   */
  static getNextResetTime(): Date {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return tomorrow
  }

  /**
   * Format time until reset
   */
  static formatTimeUntilReset(): string {
    const resetTime = this.getNextResetTime()
    const now = new Date()
    const diff = resetTime.getTime() - now.getTime()
    
    if (diff <= 0) return 'Available now'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }
}
