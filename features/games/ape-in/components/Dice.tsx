import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

interface DiceProps {
  value: number | null
  isRolling: boolean
  onRollComplete?: () => void
  onClick?: () => void
  disabled?: boolean
}

// Preload the ApeCoin image for dice value 1 to prevent loading delays
// Use a Promise to ensure the image is fully loaded before use
let imagePreloadPromise: Promise<void> | null = null

const preloadApeCoinImage = (): Promise<void> => {
  if (imagePreloadPromise) {
    return imagePreloadPromise // Return existing promise if already preloading
  }
  
  imagePreloadPromise = new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      console.log('✅ ApeInDiceToken.png preloaded successfully')
      resolve()
    }
    img.onerror = () => {
      console.warn('⚠️ Failed to preload ApeInDiceToken.png')
      reject(new Error('Failed to preload image'))
    }
    img.src = '/images/assets/cryptoku-tokens/ApeInDiceToken.png'
  })
  
  return imagePreloadPromise
}

// Preload immediately when module loads (before component mounts)
preloadApeCoinImage()

const diceDots: Record<number, number[][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
}

export default function Dice({ value, isRolling, onRollComplete, onClick, disabled = false }: DiceProps) {
  const [displayValue, setDisplayValue] = useState<number>(value ?? 1)
  const rollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevIsRollingRef = useRef<boolean>(isRolling)

  useEffect(() => {
    // When rolling, keep spinning until parent stops us.
    if (isRolling) {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current)
      rollIntervalRef.current = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1)
      }, 100)
      return () => {
        if (rollIntervalRef.current) clearInterval(rollIntervalRef.current)
        rollIntervalRef.current = null
      }
    }
    // Not rolling: show the provided value (or default to 1)
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current)
    rollIntervalRef.current = null
    setDisplayValue(value ?? 1)
  }, [isRolling, value])

  useEffect(() => {
    // Fire onRollComplete only when rolling transitions true -> false
    if (prevIsRollingRef.current && !isRolling) {
      onRollComplete?.()
    }
    prevIsRollingRef.current = isRolling
  }, [isRolling, onRollComplete])

  const isRekt = !isRolling && value === 1

  return (
    <motion.div
      whileHover={onClick && !disabled ? { scale: 1.1 } : {}}
      whileTap={onClick && !disabled ? { scale: 0.95 } : {}}
      animate={
        isRolling
          ? {
              rotate: [0, 360, 720, 1080],
              scale: [1, 1.2, 1, 1.2, 1],
            }
          : {}
      }
      transition={{ duration: 1, ease: 'easeInOut' }}
      onClick={onClick && !disabled ? onClick : undefined}
      className={`relative w-24 h-24 rounded-2xl flex items-center justify-center ${
        onClick && !disabled ? 'cursor-pointer hover:shadow-purple-500/50' : ''
      } ${disabled ? 'opacity-50' : ''}`}
    >
      {/* Simple Dice Base */}
      <div
        className={`absolute inset-0 rounded-2xl ${
          isRekt ? 'bg-red-600' : 'bg-white'
        } border-2 border-slate-300 shadow-lg`}
      >
        {/* Dice Face Content - Centered grid or ApeCoin for value 1 */}
        {displayValue === 1 ? (
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <img
              src="/images/assets/cryptoku-tokens/ApeInDiceToken.png"
              alt="ApeCoin"
              className="w-12 h-12 object-contain"
              loading="eager"
            />
          </div>
        ) : (
          <div className="relative z-10 grid grid-cols-3 w-full h-full items-center justify-center" style={{ gap: '0.25rem' }}>
            {diceDots[displayValue]?.map(([row, col], index) => (
              <div
                key={index}
                className="flex items-center justify-center"
                style={{
                  gridColumn: col + 1,
                  gridRow: row + 1,
                }}
              >
                <div
                  className={`rounded-full w-3 h-3 ${
                    isRekt ? 'bg-white' : 'bg-slate-900'
                  }`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
