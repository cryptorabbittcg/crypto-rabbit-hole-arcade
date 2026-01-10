import { Link } from 'react-router-dom'
import { ConnectButton, useActiveAccount, useDisconnect } from 'thirdweb/react'
import { client, wallet } from '../lib/thirdweb'
import { createWallet } from 'thirdweb/wallets'

export default function Header() {
  const account = useActiveAccount()
  const { disconnect } = useDisconnect()

  // Format wallet address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="text-3xl font-display font-black bg-gradient-to-r from-purple-400 via-pink-500 to-orange-500 bg-clip-text text-transparent">
              APE IN!
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className="text-slate-300 hover:text-white transition-colors font-medium"
            >
              Play
            </Link>
            <Link
              to="/leaderboard"
              className="text-slate-300 hover:text-white transition-colors font-medium"
            >
              Leaderboard
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            {account ? (
              <div className="flex items-center space-x-3">
                {/* Display wallet address */}
                <div className="hidden sm:flex items-center space-x-2 bg-slate-800 rounded-lg px-4 py-2 border border-slate-700">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-mono text-slate-300">
                    {formatAddress(account.address)}
                  </span>
                </div>
                
                {/* Disconnect button */}
                <button
                  onClick={() => disconnect(wallet)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold text-sm transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
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
                  label: 'Sign In',
                  className: 'custom-connect-button',
                }}
                connectModal={{
                  size: 'compact',
                  title: 'Welcome to Ape In!',
                  titleIcon: '🎮',
                  showThirdwebBranding: false,
                }}
              />
            )}
          </div>
        </div>

        {/* Mobile wallet display */}
        {account && (
          <div className="sm:hidden mt-3 flex items-center justify-end space-x-2 bg-slate-800 rounded-lg px-4 py-2 border border-slate-700">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-mono text-slate-300">
              {formatAddress(account.address)}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
