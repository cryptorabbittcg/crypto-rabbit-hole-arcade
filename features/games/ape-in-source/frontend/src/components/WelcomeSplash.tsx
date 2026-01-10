import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface WelcomeSplashProps {
  onStart: () => void
}

export default function WelcomeSplash({ onStart }: WelcomeSplashProps) {
  const [showTitle, setShowTitle] = useState(false)
  const [showSubtitle, setShowSubtitle] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const [showSteps, setShowSteps] = useState(false)
  const [showReady, setShowReady] = useState(false)

  const steps = [
    { icon: "🃏", text: "Draw Cards" },
    { icon: "🎲", text: "Roll Dice (beware the number 1)" },
    { icon: "💰", text: "Stack Sats" },
    { icon: "🐻", text: "Dodge Bears" }
  ]

  // BAYC-style streamlined animation sequence
  useEffect(() => {
    const timer1 = setTimeout(() => setShowTitle(true), 100)
    const timer2 = setTimeout(() => setShowSubtitle(true), 400)
    const timer3 = setTimeout(() => setShowCard(true), 800)
    const timer4 = setTimeout(() => setShowSteps(true), 1200)
    const timer5 = setTimeout(() => setShowReady(true), 2000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
      clearTimeout(timer5)
    }
  }, [])

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center text-center px-6 z-50 cursor-pointer overflow-hidden"
      onClick={onStart}
    >
      {/* Subtle background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
            animate={{
              x: [0, Math.random() * 200 - 100],
              y: [0, Math.random() * 200 - 100],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center justify-center min-h-screen py-8">
        {/* Title */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: -30 }}
          animate={showTitle ? { scale: 1, opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-6"
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-black bg-gradient-to-r from-purple-400 via-pink-500 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]">
            APE IN!
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={showSubtitle ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <p className="text-lg sm:text-xl md:text-2xl text-slate-200 font-light tracking-wide">
            The first push-your-luck risk/reward game on ApeChain
          </p>
        </motion.div>

        {/* 3-Card Fan Animation - Enhanced Sequence */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={showCard ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-10 relative"
        >
          {/* Card Container - Wider to accommodate side cards */}
          <div className="relative flex justify-center items-center h-80 w-[600px]">
            
            {/* Ape_In_Historic - Left Card */}
            <motion.div
              initial={{ x: 0, y: 0, rotate: 0, scale: 0, opacity: 0 }}
              animate={showCard ? { 
                x: -180, 
                y: 15, 
                rotate: -30, 
                scale: 1, 
                opacity: 1 
              } : {}}
              transition={{ 
                duration: 1.3, 
                delay: 1.0, 
                type: "spring", 
                stiffness: 80,
                damping: 12
              }}
              className="absolute z-10"
            >
              <div className="relative">
                <motion.img
                  src="/assets/cards/Ape_In_Historic.jpg"
                  alt="Ape In Historic Card"
                  className="w-40 sm:w-48 md:w-52 lg:w-56 h-auto rounded-xl shadow-2xl border-2 border-amber-500/40"
                  whileHover={{ scale: 1.05, rotate: -25 }}
                  transition={{ duration: 0.2 }}
                />
                {/* Amber glow for historic */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-orange-400/20 rounded-xl blur-lg -z-10" />
              </div>
            </motion.div>

            {/* Ape_In - Center Card */}
            <motion.div
              initial={{ x: 0, y: 0, rotate: 0, scale: 0, opacity: 0 }}
              animate={showCard ? { 
                x: 0, 
                y: 0, 
                rotate: 0, 
                scale: 1, 
                opacity: 1 
              } : {}}
              transition={{ 
                duration: 0.8, 
                delay: 0.2, 
                type: "spring", 
                stiffness: 150 
              }}
              className="absolute z-20"
            >
              <div className="relative">
                <motion.img
                  src="/assets/cards/Ape_In.jpg"
                  alt="Ape In Card"
                  className="w-40 sm:w-48 md:w-52 lg:w-56 h-auto rounded-xl shadow-2xl border-2 border-purple-500/40"
                  whileHover={{ scale: 1.03, rotate: 2 }}
                  transition={{ duration: 0.2 }}
                />
                {/* Purple glow for main card */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/25 to-pink-400/25 rounded-xl blur-lg -z-10" />
              </div>
            </motion.div>

            {/* Ape_In_MAYC - Right Card */}
            <motion.div
              initial={{ x: 0, y: 0, rotate: 0, scale: 0, opacity: 0 }}
              animate={showCard ? { 
                x: 180, 
                y: 15, 
                rotate: 30, 
                scale: 1, 
                opacity: 1 
              } : {}}
              transition={{ 
                duration: 1.3, 
                delay: 1.2, 
                type: "spring", 
                stiffness: 80,
                damping: 12
              }}
              className="absolute z-10"
            >
              <div className="relative">
                <motion.img
                  src="/assets/cards/Ape_In_MAYC.jpg"
                  alt="Ape In MAYC Card"
                  className="w-40 sm:w-48 md:w-52 lg:w-56 h-auto rounded-xl shadow-2xl border-2 border-green-500/40"
                  whileHover={{ scale: 1.05, rotate: 25 }}
                  transition={{ duration: 0.2 }}
                />
                {/* Green glow for MAYC */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-xl blur-lg -z-10" />
              </div>
            </motion.div>

          </div>
        </motion.div>

        {/* Game Steps - Clean floating text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={showSteps ? { opacity: 1 } : {}}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-slate-200">
            {steps.map((step, index) => (
              <motion.div
                key={step.text}
                initial={{ y: 15, opacity: 0 }}
                animate={showSteps ? { y: 0, opacity: 1 } : {}}
                transition={{ 
                  duration: 0.4, 
                  delay: 0.05 * index,
                  ease: "easeOut"
                }}
                className="flex items-center space-x-2 text-sm sm:text-base md:text-lg font-medium"
              >
                <span className="text-lg sm:text-xl md:text-2xl">{step.icon}</span>
                <span>{step.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Ready to Play */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={showReady ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <motion.p
            animate={{ 
              textShadow: [
                "0 0 8px rgba(168,85,247,0.3)",
                "0 0 16px rgba(168,85,247,0.6)",
                "0 0 8px rgba(168,85,247,0.3)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xl sm:text-2xl md:text-3xl font-bold text-white cursor-pointer hover:text-purple-300 transition-colors"
          >
            Click anywhere to Ape In!
          </motion.p>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-6 left-1/2 transform -translate-x-1/2"
        >
          <p className="text-slate-500 text-xs sm:text-sm">
            An original game created by{" "}
            <span className="text-purple-400 font-medium">
              The Crypto Rabbit Hole
            </span>{" "}
            universe
          </p>
        </motion.div>
      </div>

      {/* Click anywhere overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={showReady ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 bg-transparent"
      />
    </div>
  )
}
