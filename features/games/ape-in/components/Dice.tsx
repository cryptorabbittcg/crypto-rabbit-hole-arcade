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
        } else {
          setDisplayValue(1)
        }
      }, 1000)

      return () => {
        clearInterval(interval)
        clearTimeout(timeout)
      }
    } else if (value) {
      setDisplayValue(value)
    } else {
      setDisplayValue(1)
    }
  }, [isRolling, value, onRollComplete])

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
        {/* Dice Face Content - Centered grid */}
        <div className="relative z-10 grid grid-cols-3 gap-2 p-4 w-full h-full items-center justify-center">
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
      </div>
    </motion.div>
  )
}
