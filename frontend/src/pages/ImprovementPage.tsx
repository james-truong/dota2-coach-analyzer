import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

interface SteamUser {
  id: string // Database UUID
  steamId: string
  accountId: number
  displayName: string
  avatar: string
  profileUrl: string
}

interface ImprovementPageProps {
  user: SteamUser | null
}

interface PeriodStats {
  periodStart: string
  periodEnd: string
  totalMatches: number
  wins: number
  losses: number
  winRate: number
  avgKills: number
  avgDeaths: number
  avgAssists: number
  avgKDA: number
  avgLastHits: number
  avgGPM: number
  avgXPM: number
  totalCriticalMistakes: number
  totalHighMistakes: number
  totalMediumMistakes: number
  topMistakeCategories: Array<{ category: string; count: number }>
}

interface PlayerHabit {
  id: string
  habitType: string
  category: string
  occurrences: number
  firstDetectedAt: string
  lastDetectedAt: string
  status: 'active' | 'improving' | 'resolved'
  improvementPercentage: number
  description: string
}

interface ImprovementMetrics {
  currentPeriod: PeriodStats
  previousPeriod: PeriodStats | null
  improvement: {
    winRate: number
    avgKDA: number
    avgGPM: number
    mistakeReduction: number
  }
  habits: PlayerHabit[]
  recentTrend: 'improving' | 'declining' | 'stable'
}

interface WeeklyFocus {
  category: string
  description: string
  goal: string
  currentStatus: string
}

function ImprovementPage({ user }: ImprovementPageProps) {
  const [metrics, setMetrics] = useState<ImprovementMetrics | null>(null)
  const [weeklyFocus, setWeeklyFocus] = useState<WeeklyFocus | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<30 | 60 | 90>(30)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetchImprovementData()
  }, [user, timeRange])

  const fetchImprovementData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')

      // Fetch improvement metrics
      const metricsRes = await fetch(
        `${API_BASE}/api/improvement/metrics?userId=${user.id}&daysBack=${timeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )
      const metricsData = await metricsRes.json()
      setMetrics(metricsData)

      // Fetch weekly focus
      const focusRes = await fetch(
        `${API_BASE}/api/improvement/weekly-focus?userId=${user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )
      const focusData = await focusRes.json()
      setWeeklyFocus(focusData)
    } catch (error) {
      console.error('Error fetching improvement data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatChange = (value: number): string => {
    if (value > 0) return `+${value.toFixed(1)}%`
    return `${value.toFixed(1)}%`
  }

  const getChangeColor = (value: number): string => {
    if (value > 5) return 'text-green-400'
    if (value < -5) return 'text-red-400'
    return 'text-gray-400'
  }

  const getTrendIcon = (trend: string): string => {
    if (trend === 'improving') return '📈'
    if (trend === 'declining') return '📉'
    return '➡️'
  }

  const getTrendColor = (trend: string): string => {
    if (trend === 'improving') return 'bg-green-900/20 border-green-500'
    if (trend === 'declining') return 'bg-red-900/20 border-red-500'
    return 'bg-gray-900/20 border-gray-500'
  }

  const getHabitStatusColor = (status: string): string => {
    if (status === 'resolved') return 'bg-green-900/30 text-green-400 border-green-500'
    if (status === 'improving') return 'bg-blue-900/30 text-blue-400 border-blue-500'
    return 'bg-red-900/30 text-red-400 border-red-500'
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
          <p className="text-gray-400">Please sign in with Steam to track your improvement.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-dota-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your improvement data...</p>
        </div>
      </div>
    )
  }

  if (!metrics || metrics.currentPeriod.totalMatches === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">No Data Yet</h2>
          <p className="text-gray-400 mb-4">
            You need to analyze some matches first to see your improvement metrics.
          </p>
          <p className="text-gray-500 text-sm">
            Go to "My Matches" and analyze at least 5 matches to get started.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Improvement Tracker</h1>
          <p className="text-gray-400">Track your progress and know for sure if you're improving</p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex gap-2">
          {[30, 60, 90].map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days as 30 | 60 | 90)}
              className={`px-4 py-2 rounded-md transition-colors ${
                timeRange === days
                  ? 'bg-dota-blue text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Last {days} Days
            </button>
          ))}
        </div>

        {/* Overall Trend */}
        <div className={`mb-6 p-6 rounded-lg border-l-4 ${getTrendColor(metrics.recentTrend)}`}>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{getTrendIcon(metrics.recentTrend)}</span>
            <div>
              <h3 className="text-xl font-bold text-white capitalize">
                You're {metrics.recentTrend}!
              </h3>
              <p className="text-gray-400 text-sm">
                Based on your last {metrics.currentPeriod.totalMatches} matches
              </p>
            </div>
          </div>
        </div>

        {/* Weekly Focus Area */}
        {weeklyFocus && (
          <div className="mb-6 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-6 border border-purple-500/50">
            <h3 className="text-xl font-bold text-white mb-3">🎯 This Week's Focus</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-purple-300 font-semibold">Category:</span>
                <span className="text-white ml-2 capitalize">{weeklyFocus.category.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-sm text-purple-300 font-semibold">Goal:</span>
                <span className="text-white ml-2">{weeklyFocus.goal}</span>
              </div>
              <div>
                <span className="text-sm text-purple-300 font-semibold">Current Status:</span>
                <span className="text-gray-300 ml-2">{weeklyFocus.currentStatus}</span>
              </div>
              <p className="text-gray-400 text-sm mt-3">{weeklyFocus.description}</p>
            </div>
          </div>
        )}

        {/* Key Metrics Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Win Rate */}
          <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-semibold text-gray-400">Win Rate</h4>
              <span className={`text-sm font-bold ${getChangeColor(metrics.improvement.winRate)}`}>
                {formatChange(metrics.improvement.winRate)}
              </span>
            </div>
            <p className="text-3xl font-bold text-white">{metrics.currentPeriod.winRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.currentPeriod.wins}W - {metrics.currentPeriod.losses}L
            </p>
          </div>

          {/* KDA */}
          <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-semibold text-gray-400">KDA Ratio</h4>
              <span className={`text-sm font-bold ${getChangeColor(metrics.improvement.avgKDA)}`}>
                {formatChange(metrics.improvement.avgKDA)}
              </span>
            </div>
            <p className="text-3xl font-bold text-white">{metrics.currentPeriod.avgKDA.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.currentPeriod.avgKills.toFixed(1)} / {metrics.currentPeriod.avgDeaths.toFixed(1)} /{' '}
              {metrics.currentPeriod.avgAssists.toFixed(1)}
            </p>
          </div>

          {/* GPM */}
          <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-semibold text-gray-400">GPM</h4>
              <span className={`text-sm font-bold ${getChangeColor(metrics.improvement.avgGPM)}`}>
                {formatChange(metrics.improvement.avgGPM)}
              </span>
            </div>
            <p className="text-3xl font-bold text-white">{Math.round(metrics.currentPeriod.avgGPM)}</p>
            <p className="text-xs text-gray-500 mt-1">Gold per minute</p>
          </div>

          {/* Mistake Reduction */}
          <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-semibold text-gray-400">Mistakes</h4>
              <span className={`text-sm font-bold ${getChangeColor(metrics.improvement.mistakeReduction)}`}>
                {formatChange(metrics.improvement.mistakeReduction)}
              </span>
            </div>
            <p className="text-3xl font-bold text-white">
              {metrics.currentPeriod.totalHighMistakes + metrics.currentPeriod.totalCriticalMistakes}
            </p>
            <p className="text-xs text-gray-500 mt-1">High + Critical</p>
          </div>
        </div>

        {/* Habits & Patterns */}
        {metrics.habits.length > 0 && (
          <div className="mb-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">🔄 Recurring Patterns</h3>
            <div className="space-y-3">
              {metrics.habits.map((habit) => (
                <div
                  key={habit.id}
                  className={`p-4 rounded-lg border-l-4 ${getHabitStatusColor(habit.status)}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold capitalize">
                        {habit.category.replace('_', ' ')} Issues
                      </h4>
                      <p className="text-sm text-gray-400 mt-1">{habit.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs uppercase font-semibold">{habit.status}</span>
                      <p className="text-xs text-gray-500">{habit.occurrences} occurrences</p>
                    </div>
                  </div>
                  {habit.improvementPercentage > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                        <span>Improvement</span>
                        <span>{habit.improvementPercentage}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(habit.improvementPercentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Mistake Categories */}
        {metrics.currentPeriod.topMistakeCategories.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">📊 Most Common Mistake Types</h3>
            <div className="space-y-3">
              {metrics.currentPeriod.topMistakeCategories.map((category, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-600 w-8">#{index + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white font-semibold capitalize">
                        {category.category.replace('_', ' ')}
                      </span>
                      <span className="text-gray-400 text-sm">{category.count} times</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{
                          width: `${(category.count / metrics.currentPeriod.topMistakeCategories[0].count) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImprovementPage
