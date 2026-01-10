import { Link, useLocation } from 'react-router-dom'
import { ConnectButton, useActiveAccount, useDisconnect } from 'thirdweb/react'
import { client, wallet } from '../lib/thirdweb'
import { createWallet } from 'thirdweb/wallets'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

export default function EnhancedHeader() {
  const account = useActiveAccount()
  const { disconnect } = useDisconnect()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)

  // Format wallet address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Track scroll for glassmorphism effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { path: '/', label: 'Play', icon: '🎮' },
    { path: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  ]

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-slate-900/90 backdrop-blur-xl shadow-xl shadow-purple-500/10' 
          : 'bg-slate-900/70 backdrop-blur-md'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <div className="text-3xl md:text-4xl font-display font-black bg-gradient-to-r from-purple-400 via-pink-500 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                APE IN!
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-500 to-orange-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
            </motion.div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link key={item.path} to={item.path}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      px-6 py-2.5 rounded-xl font-semibold transition-all duration-200
                      ${isActive 
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                      }
                    `}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </motion.div>
                </Link>
              )
            })}
          </nav>

          {/* Wallet Section */}
          <div className="flex items-center space-x-3">
            {account ? (
              <>
                {/* Wallet Badge */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="hidden sm:flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/30 backdrop-blur-sm"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                  />
                  <span className="text-sm font-mono font-semibold text-slate-200">
                    {formatAddress(account.address)}
                  </span>
                </motion.div>
                
                {/* Disconnect Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => disconnect(wallet)}
                  className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl font-semibold text-sm transition-all border border-slate-700/50 hover:border-red-500/50 shadow-lg"
                >
                  Disconnect
                </motion.button>
              </>
            ) : (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ConnectButton
                  client={client}
                  wallets={[
                    wallet,
                    createWallet('io.metamask'),
                    createWallet('com.coinbase.wallet'),
                    createWallet('me.rainbow'),
                  ]}
                  theme="dark"
                  connectButton={{
                    label: '🎮 Sign In',
                    className: 'connect-button-enhanced',
                  }}
                  connectModal={{
                    size: 'compact',
                    title: 'Welcome to Ape In!',
                    titleIcon: '🎮',
                    showThirdwebBranding: false,
                  }}
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* Mobile wallet display */}
        {account && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="sm:hidden pb-4 flex items-center justify-center"
          >
            <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/30">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-mono text-slate-200">
                {formatAddress(account.address)}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </header>
  )
}

























