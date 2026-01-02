import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

interface SteamUser {
  steamId: string
  accountId: number
  displayName: string
  avatar: string
  profileUrl: string
}

interface OpenDotaMatch {
  match_id: number
  player_slot: number
  radiant_win: boolean
  duration: number
  game_mode: number
  lobby_type: number
  hero_id: number
  hero_name?: string
  hero_image?: string
  start_time: number
  version?: number
  kills: number
  deaths: number
  assists: number
  skill?: number
  average_rank?: number
  leaver_status?: number
  party_size?: number
}

interface MatchHistoryProps {
  onMatchSelect: (matchId: string, playerSlot: number) => void
  user: SteamUser | null
}

function MatchHistory({ onMatchSelect, user }: MatchHistoryProps) {
  const [matches, setMatches] = useState<OpenDotaMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) {
        setLoading(false)
        setError('Please login with Steam to view your match history')
        return
      }

      try {
        setLoading(true)
        const response = await axios.get(
          `${API_BASE}/api/players/${user.accountId}/matches?limit=20`,
          { withCredentials: true }
        )
        setMatches(response.data.matches || [])
        setError(null)
      } catch (err: any) {
        console.error('Error fetching match history:', err)
        setError('Failed to load match history from OpenDota')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [user])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-white mb-8">Match History</h2>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dota-blue mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading your matches...</p>
        </div>
      </div>
    )
  }

  if (error || matches.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-white mb-8">Match History</h2>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12 text-center">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400 text-lg mb-2">{error || 'No matches found'}</p>
          {!user && <p className="text-gray-500">Please login with Steam to view your match history</p>}
        </div>
      </div>
    )
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getGameModeName = (gameModeId: number): string => {
    const gameModes: { [key: number]: string } = {
      0: 'Unknown',
      1: 'All Pick',
      2: 'Captains Mode',
      22: 'All Pick',
      23: 'Turbo',
    }
    return gameModes[gameModeId] || 'All Pick'
  }

  const isRadiant = (playerSlot: number) => playerSlot < 128
  const getWinStatus = (match: OpenDotaMatch) => {
    const wonMatch = (isRadiant(match.player_slot) && match.radiant_win) || (!isRadiant(match.player_slot) && !match.radiant_win)
    return wonMatch
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-white mb-8">
        Match History {user && <span className="text-gray-400 text-xl font-normal">- {user.displayName}</span>}
      </h2>

      <div className="space-y-3">
        {matches.map((match) => {
          const won = getWinStatus(match)

          return (
            <button
              key={match.match_id}
              onClick={() => onMatchSelect(match.match_id.toString(), match.player_slot)}
              className="w-full bg-gray-800/50 hover:bg-gray-700 border border-gray-700 hover:border-dota-blue rounded-lg p-4 text-left transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={match.hero_image}
                    alt={match.hero_name || `Hero ${match.hero_id}`}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div>
                    <h3 className="text-white font-semibold text-lg">{match.hero_name || `Hero ${match.hero_id}`}</h3>
                    <p className="text-gray-400 text-sm">
                      {match.kills}/{match.deaths}/{match.assists} • {getGameModeName(match.game_mode)} • {Math.floor(match.duration / 60)}min
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold mb-1 ${won ? 'text-green-400' : 'text-red-400'}`}>
                    {won ? 'Victory' : 'Defeat'}
                  </div>
                  <p className="text-gray-500 text-xs">{formatDate(match.start_time)}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MatchHistory
