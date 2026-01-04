import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

interface SteamUser {
  id: string
  steamId: string
  accountId: number
  displayName: string
  avatar: string
  profileUrl: string
}

interface SessionAnalysisPageProps {
  user: SteamUser | null
}

interface SessionMatch {
  matchId: string
  heroName: string
  heroImage: string
  won: boolean
  kills: number
  deaths: number
  assists: number
  gpm: number
}

interface PlaySession {
  sessionId: string
  startTime: string
  endTime: string
  matches: SessionMatch[]
  stats: {
    totalMatches: number
    wins: number
    losses: number
    winRate: number
    avgKDA: number
    avgGpm: number
    longestLosingStreak: number
    performanceTrend: 'improving' | 'declining' | 'stable'
  }
}

interface TiltAnalysis {
  currentTiltRisk: 'low' | 'medium' | 'high'
  recentLosingStreak: number
  lastMatchWon: boolean | null
  activeWarnings: Array<{
    type: string
    message: string
    severity: 'warning' | 'danger'
  }>
  patterns: {
    performanceAfterLoss: number
    lateNightWinRate: number
    longSessionWinRate: number
  }
}

interface TimeOfDayStats {
  morning: { games: number; wins: number; winRate: number }
  afternoon: { games: number; wins: number; winRate: number }
  evening: { games: number; wins: number; winRate: number }
  night: { games: number; wins: number; winRate: number }
  bestTimeToPlay: string
}

interface DayOfWeekStats {
  days: Array<{
    day: string
    games: number
    wins: number
    winRate: number
  }>
  bestDay: string
  worstDay: string
}

function SessionAnalysisPage({ user }: SessionAnalysisPageProps) {
  const [sessions, setSessions] = useState<PlaySession[]>([])
  const [tiltAnalysis, setTiltAnalysis] = useState<TiltAnalysis | null>(null)
  const [timeStats, setTimeStats] = useState<TimeOfDayStats | null>(null)
  const [dayStats, setDayStats] = useState<DayOfWeekStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    fetchSessionData()
  }, [user])

  const fetchSessionData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')

      const [sessionsRes, tiltRes, timeRes, dayRes] = await Promise.all([
        fetch(`${API_BASE}/api/sessions/recent?userId=${user.id}&daysBack=30`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/sessions/tilt-analysis?userId=${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/sessions/time-stats?userId=${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/sessions/day-stats?userId=${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ])

      const [sessionsData, tiltData, timeData, dayData] = await Promise.all([
        sessionsRes.json(),
        tiltRes.json(),
        timeRes.json(),
        dayRes.json(),
      ])

      setSessions(sessionsData)
      setTiltAnalysis(tiltData)
      setTimeStats(timeData)
      setDayStats(dayData)
    } catch (error) {
      console.error('Error fetching session data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTiltRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'from-red-900/50 to-red-800/50 border-red-500'
      case 'medium': return 'from-orange-900/50 to-yellow-800/50 border-orange-500'
      default: return 'from-green-900/50 to-emerald-800/50 border-green-500'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈'
      case 'declining': return '📉'
      default: return '➡️'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
          <p className="text-gray-400">Please sign in with Steam to see your session analysis.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-dota-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Analyzing your sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Session Analysis</h1>
          <p className="text-gray-400">Track your play sessions and detect tilt patterns</p>
        </div>

        {/* Tilt Warning Banner */}
        {tiltAnalysis && tiltAnalysis.currentTiltRisk !== 'low' && (
          <div className={`mb-6 p-6 rounded-lg border-l-4 bg-gradient-to-r ${getTiltRiskColor(tiltAnalysis.currentTiltRisk)}`}>
            <div className="flex items-start gap-4">
              <span className="text-4xl">
                {tiltAnalysis.currentTiltRisk === 'high' ? '🚨' : '⚠️'}
              </span>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">
                  {tiltAnalysis.currentTiltRisk === 'high' ? 'High Tilt Risk!' : 'Tilt Warning'}
                </h3>
                {tiltAnalysis.activeWarnings.map((warning, idx) => (
                  <p key={idx} className="text-gray-200 mb-1">
                    {warning.message}
                  </p>
                ))}
                <p className="text-white font-semibold mt-3">
                  Consider taking a break before your next game.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {tiltAnalysis && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm">Current Streak</p>
              <p className={`text-2xl font-bold ${tiltAnalysis.recentLosingStreak > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {tiltAnalysis.recentLosingStreak > 0
                  ? `${tiltAnalysis.recentLosingStreak}L`
                  : tiltAnalysis.lastMatchWon
                    ? 'Win!'
                    : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm">Win Rate After Loss</p>
              <p className={`text-2xl font-bold ${tiltAnalysis.patterns.performanceAfterLoss >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                {tiltAnalysis.patterns.performanceAfterLoss.toFixed(0)}%
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm">Late Night Win Rate</p>
              <p className={`text-2xl font-bold ${tiltAnalysis.patterns.lateNightWinRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                {tiltAnalysis.patterns.lateNightWinRate.toFixed(0)}%
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm">Long Session Win Rate</p>
              <p className={`text-2xl font-bold ${tiltAnalysis.patterns.longSessionWinRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                {tiltAnalysis.patterns.longSessionWinRate.toFixed(0)}%
              </p>
            </div>
          </div>
        )}

        {/* Time of Day & Day of Week */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Time of Day */}
          {timeStats && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4">Win Rate by Time of Day</h3>
              <div className="space-y-4">
                {(['morning', 'afternoon', 'evening', 'night'] as const).map((time) => {
                  const data = timeStats[time]
                  const label = time === 'morning' ? 'Morning (6am-12pm)'
                    : time === 'afternoon' ? 'Afternoon (12pm-6pm)'
                    : time === 'evening' ? 'Evening (6pm-12am)'
                    : 'Night (12am-6am)'

                  return (
                    <div key={time}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">{label}</span>
                        <span className="text-white">
                          {data.games} games |{' '}
                          <span className={data.winRate >= 50 ? 'text-green-400' : 'text-red-400'}>
                            {data.winRate.toFixed(0)}%
                          </span>
                        </span>
                      </div>
                      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${data.winRate >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(data.winRate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-sm text-gray-400 mt-4">
                Best time to play: <span className="text-green-400 font-semibold">{timeStats.bestTimeToPlay}</span>
              </p>
            </div>
          )}

          {/* Day of Week */}
          {dayStats && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4">Win Rate by Day of Week</h3>
              <div className="space-y-3">
                {dayStats.days.map((day) => (
                  <div key={day.day} className="flex items-center gap-3">
                    <span className={`w-12 text-sm ${
                      day.day === dayStats.bestDay ? 'text-green-400 font-bold' :
                      day.day === dayStats.worstDay ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {day.day.slice(0, 3)}
                    </span>
                    <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${day.winRate >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(day.winRate, 100)}%` }}
                      ></div>
                    </div>
                    <span className={`w-16 text-right text-sm ${day.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                      {day.winRate.toFixed(0)}% ({day.games})
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-sm text-gray-400 mt-4">
                <span>Best: <span className="text-green-400 font-semibold">{dayStats.bestDay}</span></span>
                <span>Worst: <span className="text-red-400 font-semibold">{dayStats.worstDay}</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Recent Sessions</h3>

          {sessions.length === 0 ? (
            <p className="text-gray-400">
              No session data yet. Sessions are tracked when matches have timestamp data.
              Analyze more matches to build your session history!
            </p>
          ) : (
            <div className="space-y-4">
              {sessions.slice(0, 10).map((session) => (
                <div key={session.sessionId} className="border border-gray-700 rounded-lg overflow-hidden">
                  <div
                    className={`p-4 cursor-pointer hover:bg-gray-700/50 transition-colors ${
                      session.stats.winRate >= 50 ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'
                    }`}
                    onClick={() => setExpandedSession(
                      expandedSession === session.sessionId ? null : session.sessionId
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{getTrendIcon(session.stats.performanceTrend)}</span>
                        <div>
                          <p className="text-white font-semibold">
                            {formatDate(session.startTime)} | {formatTime(session.startTime)} - {formatTime(session.endTime)}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {session.stats.totalMatches} games | {session.stats.wins}W - {session.stats.losses}L
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${session.stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                          {session.stats.winRate.toFixed(0)}%
                        </p>
                        {session.stats.longestLosingStreak >= 3 && (
                          <p className="text-red-400 text-sm">
                            {session.stats.longestLosingStreak} loss streak
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded matches */}
                  {expandedSession === session.sessionId && (
                    <div className="bg-gray-900/50 p-4 space-y-2">
                      {session.matches.map((match, idx) => (
                        <div
                          key={match.matchId}
                          className={`flex items-center gap-3 p-2 rounded-lg ${
                            match.won ? 'bg-green-900/20' : 'bg-red-900/20'
                          }`}
                        >
                          <span className="text-gray-500 w-6">#{idx + 1}</span>
                          <img src={match.heroImage} alt={match.heroName} className="w-12 h-8 rounded" />
                          <span className="text-white flex-1">{match.heroName}</span>
                          <span className="text-gray-400 text-sm">
                            {match.kills}/{match.deaths}/{match.assists}
                          </span>
                          <span className="text-gray-400 text-sm w-16 text-right">
                            {match.gpm} GPM
                          </span>
                          <span className={`font-semibold w-12 text-right ${match.won ? 'text-green-400' : 'text-red-400'}`}>
                            {match.won ? 'W' : 'L'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SessionAnalysisPage
