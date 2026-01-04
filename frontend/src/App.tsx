import { useState } from 'react'
import MatchIdInput from './pages/MatchIdInput'
import PlayerSelection from './pages/PlayerSelection'
import AnalysisPage from './pages/AnalysisPage'
import MatchHistory from './pages/MatchHistory'
import ProfilePage from './pages/ProfilePage'
import ImprovementPage from './pages/ImprovementPage'
import HeroCoachingPage from './pages/HeroCoachingPage'
import SessionAnalysisPage from './pages/SessionAnalysisPage'
import SteamLoginButton from './components/SteamLoginButton'

interface SteamUser {
  id: string // Database UUID
  steamId: string
  accountId: number
  displayName: string
  avatar: string
  profileUrl: string
}

function App() {
  const [currentView, setCurrentView] = useState<'input' | 'playerSelection' | 'analysis' | 'history' | 'profile' | 'improvement' | 'heroes' | 'sessions'>('improvement')
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [selectedPlayerSlot, setSelectedPlayerSlot] = useState<number | null>(null)
  const [user, setUser] = useState<SteamUser | null>(null)

  // When user logs in/out, adjust default view
  const handleLoginSuccess = (loggedInUser: SteamUser) => {
    setUser(loggedInUser)
    if (currentView === 'input') {
      setCurrentView('improvement')
    }
  }

  const handleMatchIdSubmit = (matchId: string) => {
    setSelectedMatchId(matchId)
    setCurrentView('playerSelection')
  }

  const handlePlayerSelect = (playerSlot: number) => {
    setSelectedPlayerSlot(playerSlot)
    setCurrentView('analysis')
  }

  const handleBackToInput = () => {
    setCurrentView('input')
    setSelectedMatchId(null)
    setSelectedPlayerSlot(null)
  }

  const handleBackToPlayerSelection = () => {
    setCurrentView('playerSelection')
    setSelectedPlayerSlot(null)
  }

  const handleHistoryMatchSelect = (matchId: string, playerSlot: number) => {
    setSelectedMatchId(matchId)
    setSelectedPlayerSlot(playerSlot)
    setCurrentView('analysis')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">
                Dota 2 Coach Analyzer
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <button
                    onClick={() => setCurrentView('improvement')}
                    className={`px-4 py-2 rounded-md ${
                      currentView === 'improvement'
                        ? 'bg-dota-blue text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Improvement
                  </button>
                  <button
                    onClick={() => setCurrentView('history')}
                    className={`px-4 py-2 rounded-md ${
                      currentView === 'history'
                        ? 'bg-dota-blue text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    My Matches
                  </button>
                  <button
                    onClick={() => setCurrentView('heroes')}
                    className={`px-4 py-2 rounded-md ${
                      currentView === 'heroes'
                        ? 'bg-dota-blue text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Heroes
                  </button>
                  <button
                    onClick={() => setCurrentView('sessions')}
                    className={`px-4 py-2 rounded-md ${
                      currentView === 'sessions'
                        ? 'bg-dota-blue text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Sessions
                  </button>
                  <button
                    onClick={() => setCurrentView('profile')}
                    className={`px-4 py-2 rounded-md ${
                      currentView === 'profile'
                        ? 'bg-dota-blue text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Profile
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setCurrentView('input')}
                  className={`px-4 py-2 rounded-md ${
                    currentView === 'input'
                      ? 'bg-dota-blue text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Try It Out
                </button>
              )}
              <SteamLoginButton onLoginSuccess={handleLoginSuccess} />
            </div>
          </div>
        </div>
      </nav>

      <main>
        {currentView === 'input' && (
          <MatchIdInput onAnalysisStart={handleMatchIdSubmit} />
        )}
        {currentView === 'improvement' && (
          <ImprovementPage user={user} />
        )}
        {currentView === 'history' && (
          <MatchHistory onMatchSelect={handleHistoryMatchSelect} user={user} />
        )}
        {currentView === 'profile' && (
          <ProfilePage user={user} />
        )}
        {currentView === 'heroes' && (
          <HeroCoachingPage user={user} />
        )}
        {currentView === 'sessions' && (
          <SessionAnalysisPage user={user} />
        )}
        {currentView === 'playerSelection' && selectedMatchId && (
          <PlayerSelection
            matchId={selectedMatchId}
            onPlayerSelect={handlePlayerSelect}
            onBack={handleBackToInput}
          />
        )}
        {currentView === 'analysis' && selectedMatchId && selectedPlayerSlot !== null && (
          <AnalysisPage
            matchId={selectedMatchId}
            playerSlot={selectedPlayerSlot}
            onBack={handleBackToPlayerSelection}
          />
        )}
      </main>
    </div>
  )
}

export default App
