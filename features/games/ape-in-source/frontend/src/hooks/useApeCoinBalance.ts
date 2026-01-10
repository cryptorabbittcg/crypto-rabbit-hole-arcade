import { useState, useEffect } from 'react'
import { useIdentity } from './useIdentity'

// Token config via env for easy switching between CURTIS testnet and APE mainnet
const CURTIS_RPC_URL = import.meta.env.VITE_RPC_URL || "https://curtis.rpc.caldera.xyz/http"
const TOKEN_SYMBOL = import.meta.env.VITE_TOKEN_SYMBOL || 'CURTIS'
const TOKEN_DECIMALS = Number(import.meta.env.VITE_TOKEN_DECIMALS || 18)

export function useTokenBalance() {
  const [balance, setBalance] = useState<string>('0')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const identity = useIdentity()

  useEffect(() => {
    const fetchBalance = async () => {
      if (!identity.address) {
        setBalance('0')
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Use direct RPC call for native balance
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
        const balanceHex = data.result || "0x0"
        const balanceWei = parseInt(balanceHex, 16)
        const formattedBalance = (balanceWei / (10 ** TOKEN_DECIMALS)).toFixed(4)
        setBalance(formattedBalance)
      } catch (err) {
        console.error(`Failed to fetch ${TOKEN_SYMBOL} balance:`, err)
        setError('Failed to load balance')
        setBalance('0')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBalance()
    const interval = setInterval(fetchBalance, 30000)
    return () => clearInterval(interval)
  }, [identity.address])

  return { balance, isLoading, error, symbol: TOKEN_SYMBOL }
}
