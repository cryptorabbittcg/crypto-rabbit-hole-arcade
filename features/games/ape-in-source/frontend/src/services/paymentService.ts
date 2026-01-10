import { useState, useEffect } from 'react'
import { useIdentity } from '../hooks/useIdentity'

// CURTIS testnet configuration (matching Cryptoku working setup)
const CURTIS_RPC_URL = import.meta.env.VITE_RPC_URL || "https://curtis.rpc.caldera.xyz/http"
const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS || ''
const TOKEN_DECIMALS = Number(import.meta.env.VITE_TOKEN_DECIMALS || 18)
const TOKEN_SYMBOL = import.meta.env.VITE_TOKEN_SYMBOL || 'CURTIS'

export interface PaymentValidation {
  hasEnoughBalance: boolean
  requiredAmount: number
  currentBalance: number
  shortfall: number
}

export class PaymentService {
  static async validatePayment(address: string, requiredAmount: number): Promise<PaymentValidation> {
    if (!address) {
      return {
        hasEnoughBalance: false,
        requiredAmount,
        currentBalance: 0,
        shortfall: requiredAmount
      }
    }

    try {
      // Use direct RPC call like Cryptoku (for native APE balance)
      const response = await fetch(CURTIS_RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1,
        }),
      })

      const data = await response.json()
      const balanceHex = data.result || "0x0"
      
      // Convert from hex to number (wei to APE)
      const balanceWei = parseInt(balanceHex, 16)
      const currentBalance = balanceWei / (10 ** TOKEN_DECIMALS)
      const shortfall = Math.max(0, requiredAmount - currentBalance)

      return {
        hasEnoughBalance: currentBalance >= requiredAmount,
        requiredAmount,
        currentBalance,
        shortfall
      }
    } catch (error) {
      console.error('Failed to validate payment:', error)
      return {
        hasEnoughBalance: false,
        requiredAmount,
        currentBalance: 0,
        shortfall: requiredAmount
      }
    }
  }

  static getGamePrice(gameMode: string): number {
    // Sandy is free, all others cost 0.10 APE
    return gameMode === 'sandy' ? 0 : 0.10
  }

  static formatApeCoin(amount: number): string {
    return `${amount.toFixed(2)} ${TOKEN_SYMBOL}`
  }

  /**
   * Execute payment for a game by transferring APE to a game contract or treasury
   * @param {string} address The wallet address
   * @param {number} amount The amount of APE to transfer
   * @returns {Promise<{ success: boolean; transactionHash?: string; error?: string }>}
   */
  static async executePayment(address: string, amount: number): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!address) {
      return { success: false, error: 'No address provided' }
    }

    try {
      console.log('💸 Executing payment:', amount, TOKEN_SYMBOL)
      
      // For now, we'll simulate the payment since we don't have a game contract
      // In production, this would send APE to a smart contract or treasury address
      console.log('🎯 Payment simulation: Would transfer', amount, TOKEN_SYMBOL, 'from', address)
      
      // TODO: Implement actual blockchain transaction
      // This would use Thirdweb's sendTransaction or contract interaction
      
      // For testing, we'll just return success
      return { 
        success: true, 
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}` // Simulated tx hash
      }
    } catch (error) {
      console.error('❌ Payment execution failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get pricing display info for a game mode
   * Returns whether it's free, free plays remaining, or cost
   */
  static getPricingDisplay(gameMode: string, walletAddress: string | null, freePlaysRemaining: number): {
    isFree: boolean
    displayText: string
    cost: number
  } {
    // Sandy is always free
    if (gameMode === 'sandy') {
      return {
        isFree: true,
        displayText: 'FREE',
        cost: 0
      }
    }

    // Check if user has free plays remaining
    if (walletAddress && freePlaysRemaining > 0) {
      return {
        isFree: true,
        displayText: `Free plays remaining: ${freePlaysRemaining}/5`,
        cost: 0
      }
    }

    // Otherwise, show cost
    const cost = this.getGamePrice(gameMode)
    return {
      isFree: false,
      displayText: `Cost: ${cost} APE`,
      cost
    }
  }
}

/**
 * Custom hook to fetch the token balance for the active identity
 * Uses direct RPC calls like Cryptoku for better compatibility
 */
export function useTokenBalance() {
  const identity = useIdentity()
  const [balance, setBalance] = useState('0.00')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!identity.address) {
      setBalance('0.00')
      return
    }

    const fetchBalance = async () => {
      console.log('🔄 Fetching balance for address:', identity.address)
      console.log('🌐 Using RPC URL:', CURTIS_RPC_URL)
      
      setIsLoading(true)
      try {
        // Use direct RPC call like Cryptoku (for native APE balance)
        const response = await fetch(CURTIS_RPC_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [identity.address, 'latest'],
            id: 1,
          }),
        })

        const data = await response.json()
        console.log('📊 RPC Response:', data)
        
        const balanceHex = data.result || "0x0"
        console.log('💰 Balance Hex:', balanceHex)
        
        // Convert from hex to number (wei to APE)
        const balanceWei = parseInt(balanceHex, 16)
        const currentBalance = balanceWei / (10 ** TOKEN_DECIMALS)
        
        console.log('💎 Balance Wei:', balanceWei)
        console.log('🪙 Balance APE:', currentBalance)
        
        setBalance(currentBalance.toFixed(2))
      } catch (error) {
        console.error('❌ Failed to fetch balance:', error)
        setBalance('0.00')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBalance()
    
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000)
    return () => clearInterval(interval)
  }, [identity.address])

  return { balance, isLoading }
}
