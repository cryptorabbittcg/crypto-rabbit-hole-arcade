import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface DiceProps {
  value: number | null
  isRolling: boolean
  onRollComplete?: () => void
  onClick?: () => void
  disabled?: boolean
}

const diceDots: Record<number, number[][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
}

export default function Dice({ value, isRolling, onRollComplete, onClick, disabled = false }: DiceProps) {
  const [displayValue, setDisplayValue] = useState(value || 1)

  useEffect(() => {
    if (isRolling) {
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1)
      }, 100)

      const timeout = setTimeout(() => {
        clearInterval(interval)
        if (value) {
          setDisplayValue(value)
          onRollComplete?.()
        }
      }, 1000)

      return () => {
        clearInterval(interval)
        clearTimeout(timeout)
      }
    } else if (value) {
      setDisplayValue(value)
    }
  }, [isRolling, value, onRollComplete])

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
      className={`relative w-24 h-24 bg-white rounded-2xl shadow-2xl flex items-center justify-center ${
        onClick && !disabled ? 'cursor-pointer hover:shadow-purple-500/50' : ''
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <div className="grid grid-cols-3 gap-2 p-4">
        {diceDots[displayValue]?.map(([row, col], index) => (
          <div
            key={index}
            className={`col-start-${col + 1} row-start-${row + 1}`}
            style={{
              gridColumn: col + 1,
              gridRow: row + 1,
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-3 h-3 bg-slate-900 rounded-full"
            />
          </div>
        ))}
      </div>

      {/* Show result */}
      {!isRolling && value === 1 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -top-10 sm:-top-12 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-bold whitespace-nowrap shadow-xl text-xs sm:text-sm max-w-[90vw]"
        >
          REKT! 💀
        </motion.div>
      )}
    </motion.div>
  )
}
