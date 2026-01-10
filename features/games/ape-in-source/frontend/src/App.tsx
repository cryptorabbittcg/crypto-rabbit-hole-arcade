import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
        // CACHE BUST: Tue Oct 21 01:45:00 AM ACDT 2025 - Force Vercel to use latest code after backend fixes
import { useState, useEffect } from 'react'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import LeaderboardPage from './pages/LeaderboardPage'
import NewHeader from './components/NewHeader'
import ParticleBackground from './components/ParticleBackground'
import WelcomeSplash from './components/WelcomeSplash'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [showSplash, setShowSplash] = useState(true)

  // Show splash only on first visit (when URL is first entered)
  useEffect(() => {
    // Don't show splash for game routes (especially Sandy)
    if (location.pathname.startsWith('/game/')) {
      console.log('🎮 Game route detected, skipping splash:', location.pathname)
      setShowSplash(false)
      return
    }
    
    // Check if user has visited before in this session
    const hasVisited = sessionStorage.getItem('hasVisited')
    if (hasVisited) {
      setShowSplash(false)
    } else {
      // Mark as visited for this session
      sessionStorage.setItem('hasVisited', 'true')
    }
    
    // TEMPORARY: Force splash screen for testing (remove this line later)
    // BUT: Don't force for game routes
    if (!location.pathname.startsWith('/game/')) {
      setShowSplash(true)
    }
  }, [location.pathname])

  const handleSplashComplete = () => {
    setShowSplash(false)
    // Navigate to home page when splash is clicked
    navigate('/')
  }

  // Only show splash on first visit to the URL
  if (showSplash) {
    return <WelcomeSplash onStart={handleSplashComplete} />
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <ParticleBackground />
      <NewHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:mode" element={<GamePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Routes>
    </div>
  )
}

export default App
