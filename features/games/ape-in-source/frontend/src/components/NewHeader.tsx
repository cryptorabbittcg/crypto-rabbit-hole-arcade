import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useTokenBalance } from '../services/paymentService'
import { getArcadeSession } from '../lib/arcade-session'
import { useIdentity } from '../hooks/useIdentity'
import LeaderboardModal from './LeaderboardModal'
import StatsModal from './StatsModal'

interface UserProfile {
  name: string
  avatar: string
  pfp?: string // Profile picture URL
  walletAddress: string
}

export default function NewHeader() {
  const identity = useIdentity()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const { balance: tokenBalance, isLoading: balanceLoading } = useTokenBalance()

  // Load user profile from arcade session (read-only)
  useEffect(() => {
    // Read from arcade session (from identity bridge)
    if (identity.address) {
      const profile: UserProfile = {
        name: identity.username || identity.displayName || 'Guest',
        avatar: identity.avatarUrl || '👤',
        walletAddress: identity.address
      }
      setUserProfile(profile)
      setPlayerName(profile.name)
    }
  }, [identity])

  // Track scroll for glassmorphism effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Click outside to close account menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false)
      }
    }

    if (showAccountMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAccountMenu])

  // Format wallet address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }


  const isHomePage = location.pathname === '/'
  
  // Get arcade session for stats display - memoize to prevent infinite loop
  const [arcadeSession, setArcadeSession] = useState<ReturnType<typeof getArcadeSession>>(null)
  
  useEffect(() => {
    // Only check once on mount and when identity changes
    const session = getArcadeSession()
    setArcadeSession(session)
  }, [identity.sessionId]) // Only re-check if session ID changes

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 shadow-2xl' 
            : 'bg-slate-900/80 backdrop-blur-md border-b border-slate-700/30'
        }`}
      >
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            
            {/* Left: Logo */}
            <Link to="/" className="flex items-center group flex-shrink-0">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <img 
                  src="/assets/cxrh-banner.png" 
                  alt="The Crypto Rabbit Hole" 
                  className="h-6 sm:h-8 w-auto"
                />
              </motion.div>
            </Link>

            {/* Center: Ape In! Title (Clickable) */}
            <Link to="/" className="flex items-center flex-shrink-0 mx-2">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 2 }}
                whileTap={{ scale: 0.95 }}
                className="text-xl sm:text-2xl md:text-3xl font-display font-black bg-gradient-to-r from-purple-400 via-pink-500 to-orange-500 bg-clip-text text-transparent cursor-pointer"
              >
                APE IN!
              </motion.div>
            </Link>

            {/* Right: Actions */}
            <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 flex-shrink-0">
              
              {/* zkVerify Verification Badge */}
              <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm font-medium text-emerald-300">zkVerify</span>
              </div>

              {/* Leaderboard Button */}
              <button
                onClick={() => setShowLeaderboardModal(true)}
                className="flex items-center px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:border-purple-500/50 transition-all group"
              >
                <span className="text-sm sm:text-lg">🏆</span>
                <span className="hidden sm:inline text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white ml-1 sm:ml-2">Leaderboard</span>
              </button>

              {/* Wallet Connection / Account */}
              {identity.address ? (
                <div className="relative" ref={accountMenuRef}>
                  {/* Account Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAccountMenu(!showAccountMenu)}
                    className="flex items-center space-x-1 sm:space-x-3 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 hover:border-green-500/50 transition-all"
                  >
                    {/* Avatar */}
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-sm sm:text-lg overflow-hidden">
                      {identity.avatarUrl ? (
                        <img 
                          src={identity.avatarUrl} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to emoji avatar on error
                            e.currentTarget.style.display = 'none'
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement
                            if (fallback) fallback.style.display = 'block'
                          }}
                        />
                      ) : null}
                      <span className="text-sm sm:text-lg" style={{ display: identity.avatarUrl ? 'none' : 'block' }}>
                        {identity.username?.[0]?.toUpperCase() || identity.displayName?.[0]?.toUpperCase() || '👤'}
                      </span>
                    </div>
                    
                    {/* Wallet Info */}
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-xs font-semibold text-white">
                        {userProfile?.name || 'Player'}
                      </span>
                      <span className="text-xs font-mono text-green-400">
                        {formatAddress(identity.address)}
                      </span>
                    </div>
                    
                    {/* Connection Status */}
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </motion.button>

                  {/* Account Dropdown */}
                  <AnimatePresence>
                    {showAccountMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full right-0 mt-2 w-64 bg-slate-800/95 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl overflow-hidden"
                      >
                        {/* Profile Section */}
                        <div className="p-4 border-b border-slate-700/50">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-2xl overflow-hidden">
                              {identity.avatarUrl ? (
                                <img 
                                  src={identity.avatarUrl} 
                                  alt="Profile" 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback to emoji avatar on error
                                    e.currentTarget.style.display = 'none'
                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement
                                    if (fallback) fallback.style.display = 'block'
                                  }}
                                />
                              ) : null}
                              <span className="text-sm sm:text-lg" style={{ display: identity.avatarUrl ? 'none' : 'block' }}>
                                {identity.username?.[0]?.toUpperCase() || identity.displayName?.[0]?.toUpperCase() || '👤'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-white">{userProfile?.name || identity.displayName || 'Player'}</h3>
                              <p className="text-xs text-slate-400 font-mono">{formatAddress(identity.address)}</p>
                            </div>
                          </div>
                          
                          {/* ApeCoin Balance */}
                          <div className="mt-3 p-3 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-lg border border-orange-500/20">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">🪙</span>
                                <span className="text-sm font-semibold text-orange-400">ApeCoin</span>
                              </div>
                              <div className="text-right">
                                {balanceLoading ? (
                                  <div className="w-12 h-4 bg-slate-700/50 rounded animate-pulse"></div>
                                ) : (
                                  <span className="text-sm font-bold text-white">
                                    {parseFloat(tokenBalance).toFixed(2)} {import.meta.env.VITE_TOKEN_SYMBOL || 'APE'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Arcade Stats (if session exists) */}
                          {arcadeSession && (
                            <>
                              <div className="mt-2 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-lg">⭐</span>
                                    <span className="text-sm font-semibold text-purple-400">Points</span>
                                  </div>
                                  <span className="text-sm font-bold text-white">
                                    {arcadeSession.points.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-lg">🎫</span>
                                    <span className="text-sm font-semibold text-pink-400">Tickets</span>
                                  </div>
                                  <span className="text-sm font-bold text-white">
                                    {arcadeSession.tickets}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          <button
                            onClick={() => {
                              setShowStatsModal(true)
                              setShowAccountMenu(false)
                            }}
                            className="w-full px-4 py-3 text-left text-slate-300 hover:bg-slate-700/50 transition-colors flex items-center space-x-3"
                          >
                            <span>📊</span>
                            <span>My Stats</span>
                          </button>
                        </div>

                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="px-4 py-2 bg-slate-700/50 rounded-lg border border-slate-600/50">
                  <p className="text-xs text-slate-400">Waiting for identity...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>


      {/* Add top padding to body to account for fixed header */}
      <div className="h-20"></div>

      {/* Modals */}
      <LeaderboardModal isOpen={showLeaderboardModal} onClose={() => setShowLeaderboardModal(false)} />
      <StatsModal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} />
    </>
  )
}
