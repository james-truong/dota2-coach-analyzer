import { useState, useEffect } from 'react'
import axios from 'axios'

interface Player {
  playerSlot: number
  heroId: number
  heroName: string
  heroImage: string
  team: 'radiant' | 'dire'
  kills: number
  deaths: number
  assists: number
  accountId: number
  laneRole?: number | null
}

interface MatchPlayers {
  matchId: number
  duration: number
  gameMode: string
  radiantWin: boolean
  players: Player[]
}

interface PlayerSelectionProps {
  matchId: string
  onPlayerSelect: (playerSlot: number) => void
  onBack: () => void
}

const getLaneRoleLabel = (laneRole: number | null | undefined): string => {
  if (!laneRole) return ''
  const roles: Record<number, string> = {
    1: 'Pos 1',
    2: 'Pos 2',
    3: 'Pos 3',
    4: 'Pos 4'
  }
  return roles[laneRole] || ''
}

function PlayerSelection({ matchId, onPlayerSelect, onBack }: PlayerSelectionProps) {
  const [matchData, setMatchData] = useState<MatchPlayers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`/api/matches/${matchId}/players`)
        setMatchData(response.data)
        setError(null)
      } catch (err: any) {
        console.error('Error fetching players:', err)
        setError(err.response?.data?.message || 'Failed to load match players')
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [matchId])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dota-blue mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading match players...</p>
        </div>
      </div>
    )
  }

  if (error || !matchData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-6 py-4 rounded-lg">
          <h3 className="font-semibold mb-2">Error</h3>
          <p>{error || 'Failed to load match data'}</p>
          <button
            onClick={onBack}
            className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const radiantPlayers = matchData.players.filter(p => p.team === 'radiant')
  const direPlayers = matchData.players.filter(p => p.team === 'dire')
  const durationMin = Math.floor(matchData.duration / 60)

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white flex items-center mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <h2 className="text-3xl font-bold text-white mb-2">Select Your Hero</h2>
        <p className="text-gray-400">
          Match {matchData.matchId} • {matchData.gameMode} • {durationMin}m
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radiant Team */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-green-400">Radiant</h3>
            {matchData.radiantWin && (
              <span className="bg-green-500 text-white text-sm px-3 py-1 rounded">Victory</span>
            )}
          </div>
          <div className="space-y-2">
            {radiantPlayers.map((player) => (
              <button
                key={player.playerSlot}
                onClick={() => onPlayerSelect(player.playerSlot)}
                className="w-full bg-gray-800/50 hover:bg-gray-700 border border-gray-600 hover:border-green-400 rounded-lg p-3 text-left transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={player.heroImage}
                      alt={player.heroName}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-semibold">{player.heroName}</h4>
                        {player.laneRole && (
                          <span className="bg-blue-600/20 text-blue-400 text-xs px-2 py-0.5 rounded border border-blue-600/30">
                            {getLaneRoleLabel(player.laneRole)}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm">
                        {player.kills}/{player.deaths}/{player.assists}
                      </p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dire Team */}
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-red-400">Dire</h3>
            {!matchData.radiantWin && (
              <span className="bg-red-500 text-white text-sm px-3 py-1 rounded">Victory</span>
            )}
          </div>
          <div className="space-y-2">
            {direPlayers.map((player) => (
              <button
                key={player.playerSlot}
                onClick={() => onPlayerSelect(player.playerSlot)}
                className="w-full bg-gray-800/50 hover:bg-gray-700 border border-gray-600 hover:border-red-400 rounded-lg p-3 text-left transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={player.heroImage}
                      alt={player.heroName}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-semibold">{player.heroName}</h4>
                        {player.laneRole && (
                          <span className="bg-blue-600/20 text-blue-400 text-xs px-2 py-0.5 rounded border border-blue-600/30">
                            {getLaneRoleLabel(player.laneRole)}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm">
                        {player.kills}/{player.deaths}/{player.assists}
                      </p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <p className="text-gray-300 text-sm">
          💡 <strong>Tip:</strong> Click on the hero you played to see personalized coaching insights for your performance.
        </p>
      </div>
    </div>
  )
}

export default PlayerSelection
