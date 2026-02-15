import { pathUsd } from '@/constants'
import { useEffect, useState } from 'react'
import { Abis } from 'tempo.ts/viem'
import { Address, createPublicClient, defineChain, formatUnits, http } from 'viem'

// Define Tempo Moderato chain
const tempoModerato = defineChain({
  id: 42431,
  name: 'Tempo Moderato',
  nativeCurrency: { name: 'pathUSD', symbol: 'pathUSD', decimals: 6 },
  rpcUrls: {
    default: { http: ['https://rpc.moderato.tempo.xyz'] },
  },
  feeToken: pathUsd,
})

const publicClient = createPublicClient({
  chain: tempoModerato,
  transport: http('https://rpc.moderato.tempo.xyz'),
})

export function useBalance(address: string | undefined) {
  const [balance, setBalance] = useState<string>('0.00')
  const [symbol, setSymbol] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [hasInitialFetch, setHasInitialFetch] = useState(false)

  useEffect(() => {
    if (!address) {
      setBalance('0.00')
      setLoading(false)
      setHasInitialFetch(true)
      return
    }

    const fetchBalance = async () => {
      try {
        const [balanceResult, decimalsResult, symbolResult] = await Promise.all([
          publicClient.readContract({
            address: pathUsd,
            abi: Abis.tip20,
            functionName: 'balanceOf',
            args: [address as Address],
          }),
          publicClient.readContract({
            address: pathUsd,
            abi: Abis.tip20,
            functionName: 'decimals',
          }),
          publicClient.readContract({
            address: pathUsd,
            abi: Abis.tip20,
            functionName: 'symbol',
          }),
        ])

        const balance = balanceResult as unknown as bigint
        const decimals = decimalsResult as unknown as number
        const tokenSymbol = symbolResult as unknown as string

        setSymbol(tokenSymbol)

        const formatted = formatUnits(balance, decimals)
        const number = parseFloat(formatted)

        // Format with compact notation for large numbers
        let displayBalance: string
        if (number >= 1_000_000) {
          displayBalance = (number / 1_000_000).toFixed(2) + 'M'
        } else if (number >= 1_000) {
          displayBalance = (number / 1_000).toFixed(2) + 'K'
        } else {
          displayBalance = number.toFixed(2)
        }

        setBalance(displayBalance)
      } catch (error) {
        console.error('Error fetching balance:', error)
        setBalance('0.00')
      } finally {
        // Only set loading to false after first successful fetch
        if (!hasInitialFetch) {
          setLoading(false)
          setHasInitialFetch(true)
        }
      }
    }

    fetchBalance()
    const interval = setInterval(fetchBalance, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [address, hasInitialFetch])

  return { balance, symbol, loading }
}
