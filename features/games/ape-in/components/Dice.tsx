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
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 3D Dice Base with enhanced 3D effect */}
      <div
        className={`absolute inset-0 rounded-2xl ${
          isRekt ? 'bg-red-600' : 'bg-white'
        }`}
        style={{
          transform: 'translateZ(8px) rotateX(5deg) rotateY(-5deg)',
          boxShadow: `
            inset 0 3px 6px rgba(0, 0, 0, 0.15),
            inset 0 -3px 6px rgba(255, 255, 255, ${isRekt ? '0.2' : '0.4'}),
            0 10px 20px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(0, 0, 0, 0.15),
            0 4px 8px rgba(0, 0, 0, 0.2)
          `,
        }}
      >
        {/* Glassy overlay for 3D effect */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: isRekt
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.15) 50%, rgba(255, 255, 255, 0.08) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(0, 0, 0, 0.15) 50%, rgba(255, 255, 255, 0.3) 100%)',
            borderRadius: '1rem',
          }}
        />
        {/* Additional highlight for 3D depth */}
        <div
          className="absolute top-0 left-0 w-full h-1/2 rounded-t-2xl pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.3), transparent)',
          }}
        />
      </div>

      {/* Dice Face Content - Centered grid */}
      <div className="relative z-10 grid grid-cols-3 gap-2 p-4 w-full h-full items-center justify-center">
        {diceDots[displayValue]?.map(([row, col], index) => {
          const isCenterPip = displayValue === 1 && row === 1 && col === 1
          return (
            <div
              key={index}
              className="flex items-center justify-center"
              style={{
                gridColumn: col + 1,
                gridRow: row + 1,
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`rounded-full ${isCenterPip ? 'w-6 h-6' : 'w-3 h-3'} ${
                  isRekt ? 'bg-white' : 'bg-slate-900'
                }`}
                style={{
                  boxShadow: `
                    inset 0 3px 6px rgba(0, 0, 0, 0.5),
                    inset 0 -2px 3px rgba(255, 255, 255, ${isRekt ? '0.4' : '0.25'}),
                    0 2px 3px rgba(0, 0, 0, 0.4)
                  `,
                }}
              />
            </div>
          )
        })}
      </div>

      {/* "Rekt!" text for value 1 - centered above pip */}
      {isRekt && (
        <div
          className="absolute -top-8 left-1/2 pointer-events-none z-20"
          style={{
            transform: 'translateX(-50%)',
            textAlign: 'center',
            width: '100%',
          }}
        >
          <span
            className="text-white font-bold text-xs sm:text-sm whitespace-nowrap block"
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 900,
              textShadow: `
                0 2px 0 rgba(255, 255, 255, 0.6),
                0 3px 6px rgba(0, 0, 0, 0.4),
                0 -2px 0 rgba(0, 0, 0, 0.3),
                inset 0 -1px 0 rgba(0, 0, 0, 0.2)
              `,
              WebkitTextStroke: '0.5px rgba(0, 0, 0, 0.4)',
            }}
          >
            Rekt!
          </span>
        </div>
      )}
    </motion.div>
  )
}
