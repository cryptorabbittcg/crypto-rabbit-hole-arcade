import { useState, useEffect } from 'react'
import { useArcade } from '@/components/providers'

// Token config - use Next.js env vars or defaults
const CURTIS_RPC_URL = typeof window !== 'undefined'
  ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_RPC_URL || "https://curtis.rpc.caldera.xyz/http"
  : process.env.NEXT_PUBLIC_RPC_URL || "https://curtis.rpc.caldera.xyz/http"
const TOKEN_SYMBOL = 'APE' // Standard APE token
const TOKEN_DECIMALS = 18 // Standard token decimals

export function useTokenBalance() {
  const [balance, setBalance] = useState<string>('0')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { address } = useArcade()

  useEffect(() => {
    const fetchBalance = async () => {
      if (!address) {
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
            params: [address, 'latest'],
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
  }, [address])

  return { balance, isLoading, error, symbol: TOKEN_SYMBOL }
}
