import { useState } from 'react'
import MatchIdInput from './pages/MatchIdInput'
import PlayerSelection from './pages/PlayerSelection'
import AnalysisPage from './pages/AnalysisPage'
import MatchHistory from './pages/MatchHistory'

function App() {
  const [currentView, setCurrentView] = useState<'input' | 'playerSelection' | 'analysis' | 'history'>('input')
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [selectedPlayerSlot, setSelectedPlayerSlot] = useState<number | null>(null)

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
            <div className="flex space-x-4">
              <button
                onClick={handleBackToInput}
                className={`px-4 py-2 rounded-md ${
                  currentView === 'input'
                    ? 'bg-dota-blue text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Analyze
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
            </div>
          </div>
        </div>
      </nav>

      <main>
        {currentView === 'input' && (
          <MatchIdInput onAnalysisStart={handleMatchIdSubmit} />
        )}
        {currentView === 'history' && (
          <MatchHistory onMatchSelect={handleHistoryMatchSelect} />
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
