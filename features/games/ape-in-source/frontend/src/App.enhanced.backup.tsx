import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import LeaderboardPage from './pages/LeaderboardPage'
import EnhancedHeader from './components/EnhancedHeader'
import ParticleBackground from './components/ParticleBackground'

function App() {
  return (
    <div className="min-h-screen relative">
      <ParticleBackground />
      <EnhancedHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:mode" element={<GamePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Routes>
    </div>
  )
}

export default App
