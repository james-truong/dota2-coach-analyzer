import { useEffect, useState } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

interface PlayerProfile {
  user: {
    id: string
    displayName: string
    avatar: string
    accountId: number
  }
  statistics: {
    totalMatches: number
    totalWins: number
    totalLosses: number
    winRate: number
    avgKills: number
    avgDeaths: number
    avgAssists: number
    avgGpm: number
    avgXpm: number
    avgLastHits: number
    avgHeroDamage: number
    recentWinRate: number
    recentAvgGpm: number
    recentAvgKills: number
    recentAvgDeaths: number
    bestGpm: number
    bestKills: number
    bestHeroDamage: number
    coreGames: number
    supportGames: number
  }
  recentMatches: Array<{
    matchId: string
    heroName: string
    heroImage: string
    kills: number
    deaths: number
    assists: number
    gpm: number
    won: boolean
    detectedRole: string
    duration: number
    analyzedAt: string
  }>
  topHeroes: Array<{
    heroName: string
    heroImage: string
    gamesPlayed: number
    wins: number
    winRate: number
    avgKills: number
    avgDeaths: number
    avgAssists: number
    avgGpm: number
  }>
}

interface SteamUser {
  steamId: string
  accountId: number
  displayName: string
  avatar: string
  profileUrl: string
}

interface ProfilePageProps {
  user: SteamUser | null
}

function ProfilePage({ user }: ProfilePageProps) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)

  const fetchProfile = async () => {
    if (!user) {
      setError('Please log in to view your profile')
      setLoading(false)
      return
    }

    try {
      const token = localStorage.getItem('auth_token')
      const response = await axios.get(`${API_BASE}/api/profile/me`, {
        withCredentials: true,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      setProfile(response.data)
      setError(null)
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Please log in to view your profile')
      } else if (err.response?.status === 404) {
        setError('No profile found. Your match history is being loaded from OpenDota. Please refresh in a moment!')
      } else {
        setError('Failed to load profile. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setRefreshMessage(null)

    try {
      const token = localStorage.getItem('auth_token')
      const response = await axios.post(`${API_BASE}/api/profile/me/refresh`, {}, {
        withCredentials: true,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.data.success) {
        setRefreshMessage(`✓ Refreshed! Added ${response.data.matchesAdded} matches from OpenDota`)
        // Reload profile after refresh
        await fetchProfile()
      }
    } catch (err: any) {
      setRefreshMessage('Failed to refresh. Please try again.')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-dota-blue mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">{error || 'No profile data available'}</div>
          {!user && (
            <p className="text-gray-400">Log in with Steam to see your player profile and statistics</p>
          )}
        </div>
      </div>
    )
  }

  const { statistics, recentMatches, topHeroes } = profile
  const roleDistribution = statistics.totalMatches > 0
    ? {
        core: (statistics.coreGames / statistics.totalMatches) * 100,
        support: (statistics.supportGames / statistics.totalMatches) * 100,
      }
    : { core: 0, support: 0 }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* User Header */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <img
              src={profile.user.avatar}
              alt={profile.user.displayName}
              className="w-24 h-24 rounded-lg border-2 border-dota-blue"
            />
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{profile.user.displayName}</h1>
              <p className="text-gray-400">Account ID: {profile.user.accountId}</p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`px-6 py-2 rounded-md font-semibold transition-colors ${
                refreshing
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-dota-blue text-white hover:bg-blue-600'
              }`}
            >
              {refreshing ? 'Refreshing...' : 'Sync from OpenDota'}
            </button>
            {refreshMessage && (
              <p className={`text-sm ${refreshMessage.includes('✓') ? 'text-green-400' : 'text-red-400'}`}>
                {refreshMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Matches Analyzed"
          value={statistics.totalMatches}
          subtitle={`${statistics.totalWins}W - ${statistics.totalLosses}L`}
        />
        <StatCard
          title="Win Rate"
          value={`${statistics.winRate.toFixed(1)}%`}
          subtitle={statistics.totalMatches > 0 ? 'All analyzed matches' : 'No matches yet'}
          highlight={statistics.winRate >= 50}
        />
        <StatCard
          title="Avg GPM"
          value={statistics.avgGpm}
          subtitle={`Best: ${statistics.bestGpm}`}
        />
        <StatCard
          title="Avg K/D/A"
          value={`${statistics.avgKills.toFixed(1)}/${statistics.avgDeaths.toFixed(1)}/${statistics.avgAssists.toFixed(1)}`}
          subtitle={`Best Kills: ${statistics.bestKills}`}
        />
      </div>

      {/* Recent Performance & Role Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">Recent Performance (Last 20 Analyzed)</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Win Rate</span>
              <span className={`font-semibold ${statistics.recentWinRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                {statistics.recentWinRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Avg GPM</span>
              <span className="text-white font-semibold">{statistics.recentAvgGpm}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Avg Kills</span>
              <span className="text-white font-semibold">{statistics.recentAvgKills.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Avg Deaths</span>
              <span className="text-white font-semibold">{statistics.recentAvgDeaths.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">Role Distribution</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Core</span>
                <span className="text-white font-semibold">{statistics.coreGames} games ({roleDistribution.core.toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-red-500 h-3 rounded-full"
                  style={{ width: `${roleDistribution.core}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Support</span>
                <span className="text-white font-semibold">{statistics.supportGames} games ({roleDistribution.support.toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full"
                  style={{ width: `${roleDistribution.support}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Heroes */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Top Heroes</h2>
        {topHeroes.length === 0 ? (
          <p className="text-gray-400">No heroes played yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Hero</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-semibold">Games</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-semibold">Win Rate</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-semibold">Avg K/D/A</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-semibold">Avg GPM</th>
                </tr>
              </thead>
              <tbody>
                {topHeroes.map((hero, index) => (
                  <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <img src={hero.heroImage} alt={hero.heroName} className="w-12 h-8 rounded" />
                        <span className="text-white font-semibold">{hero.heroName}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4 text-white">{hero.gamesPlayed}</td>
                    <td className="text-center py-3 px-4">
                      <span className={`font-semibold ${hero.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                        {hero.winRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-center py-3 px-4 text-white">
                      {hero.avgKills.toFixed(1)}/{hero.avgDeaths.toFixed(1)}/{hero.avgAssists.toFixed(1)}
                    </td>
                    <td className="text-center py-3 px-4 text-white">{Math.round(hero.avgGpm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Matches */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Recent Matches</h2>
        {recentMatches.length === 0 ? (
          <p className="text-gray-400">No matches analyzed yet. Start analyzing matches to build your history!</p>
        ) : (
          <div className="space-y-3">
            {recentMatches.map((match, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                  match.won ? 'border-green-500 bg-green-900/10' : 'border-red-500 bg-red-900/10'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <img src={match.heroImage} alt={match.heroName} className="w-16 h-10 rounded" />
                  <div>
                    <p className="text-white font-semibold">{match.heroName}</p>
                    <p className="text-gray-400 text-sm">{match.detectedRole}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">K/D/A</p>
                    <p className="text-white font-semibold">
                      {match.kills}/{match.deaths}/{match.assists}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">GPM</p>
                    <p className="text-white font-semibold">{match.gpm}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">Result</p>
                    <p className={`font-semibold ${match.won ? 'text-green-400' : 'text-red-400'}`}>
                      {match.won ? 'Victory' : 'Defeat'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">Duration</p>
                    <p className="text-white font-semibold">{Math.floor(match.duration / 60)}m</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  highlight = false,
}: {
  title: string
  value: string | number
  subtitle: string
  highlight?: boolean
}) {
  return (
    <div className={`bg-gray-800 rounded-lg p-6 border ${highlight ? 'border-green-500' : 'border-gray-700'}`}>
      <h3 className="text-gray-400 text-sm font-semibold mb-2">{title}</h3>
      <p className={`text-3xl font-bold mb-1 ${highlight ? 'text-green-400' : 'text-white'}`}>{value}</p>
      <p className="text-gray-500 text-sm">{subtitle}</p>
    </div>
  )
}

export default ProfilePage
