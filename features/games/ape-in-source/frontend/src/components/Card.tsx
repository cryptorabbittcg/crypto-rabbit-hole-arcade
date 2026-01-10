import { motion } from 'framer-motion'
import React, { useEffect, useState } from 'react'
import { Card as CardType } from '../types/game'

interface CardProps {
  card: CardType | null
  isRevealing?: boolean
  onClick?: () => void
}

const getCardGradient = (type: CardType['type']) => {
  switch (type) {
    case 'Cipher':
      return 'from-blue-500 to-cyan-500'
    case 'Oracle':
      return 'from-purple-500 to-pink-500'
    case 'Historacle':
      return 'from-yellow-500 to-orange-500'
    case 'Bearish':
      return 'from-red-600 to-red-800'
    case 'Special':
      return 'from-green-500 to-emerald-600'
    default:
      return 'from-slate-600 to-slate-800'
  }
}

export default function Card({ card, isRevealing = false, onClick }: CardProps) {
  // Card ratio: 355:497 ≈ 5:7 ratio
  // Compact size for better screen fit
  
  // Show card back when no card - with same padding as drawn cards
  if (!card) {
    return (
      <motion.div
        whileHover={{ scale: 1.05, rotateZ: 1 }}
        whileTap={{ scale: 0.98 }}
        className="w-56 h-[19.6rem] md:w-60 md:h-[21rem] rounded-xl shadow-2xl overflow-hidden cursor-pointer"
        onClick={onClick}
      >
        {/* Slate border - thinner for compact look */}
        <div className="bg-gradient-to-br from-slate-600 to-slate-800 h-full p-1.5 shadow-2xl relative hover:from-purple-600 hover:to-purple-800 transition-all duration-300">
          {/* Inner padding to match card ratio */}
          <div className="h-full w-full overflow-hidden rounded-lg relative p-1.5 bg-slate-900">
            <img
              src="/assets/cards/Ape_In_Cardback.jpg"
              alt="Card Back"
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback to icon if image fails
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full flex flex-col items-center justify-center text-white"><div class="text-4xl mb-2">🎴</div><div class="text-xs font-bold">APE IN!</div><div class="text-xs opacity-75">DECK</div></div>'
                }
              }}
            />
          </div>
        </div>
      </motion.div>
    )
  }

  // Use the backend's image_url directly instead of frontend cycling

  return (
    <motion.div
      initial={isRevealing ? { rotateY: 180, scale: 0.7 } : { scale: 1 }}
      animate={isRevealing ? { rotateY: 0, scale: 1 } : { scale: 1 }}
      transition={{ duration: 0.7, type: 'spring', stiffness: 100 }}
      whileHover={{ scale: 1.03, y: -5 }}
      className={`w-56 h-[19.6rem] md:w-60 md:h-[21rem] rounded-xl shadow-2xl overflow-hidden ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      {/* Thinner gradient border for cleaner look */}
      <div className={`bg-gradient-to-br ${getCardGradient(card.type)} h-full p-1.5 shadow-2xl relative`}>
        {/* Glow effect for special cards */}
        {card.type === 'Special' && (
          <div className="absolute inset-0 bg-gradient-to-br from-green-400/30 to-emerald-400/30 rounded-xl animate-pulse" />
        )}
        {card.type === 'Bearish' && (
          <div className="absolute inset-0 bg-gradient-to-br from-red-400/30 to-orange-400/30 rounded-xl animate-pulse" />
        )}
        
        {/* Card Image - proper 355:497 ratio with padding */}
        <div className="h-full w-full overflow-hidden rounded-lg relative p-1.5 bg-slate-900">
          {card.image_url ? (
            <img
              src={card.image_url}
              alt={card.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                console.log('❌ Card image failed to load:', card.image_url)
                // As a safe fallback, show cardback if provided URL fails
                (e.currentTarget as HTMLImageElement).src = '/assets/cards/Ape_In_Cardback.jpg'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl">
              {card.type === 'Bearish' ? '🐻' : card.type === 'Special' ? '🚀' : '🎴'}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}