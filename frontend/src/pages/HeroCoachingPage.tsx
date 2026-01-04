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

interface HeroCoachingPageProps {
  user: SteamUser | null
}

interface HeroPerformance {
  heroId: number
  heroName: string
  heroImage: string
  gamesPlayed: number
  wins: number
  winRate: number
  avgKills: number
  avgDeaths: number
  avgAssists: number
  avgKDA: number
  avgGpm: number
  avgXpm: number
  avgLastHits: number
  avgHeroDamage: number
  coreGames: number
  supportGames: number
  recentWinRate: number
  bestMatch: { matchId: string; kda: number; gpm: number } | null
  worstMatch: { matchId: string; kda: number; gpm: number } | null
}

interface HeroBenchmark {
  heroName: string
  heroImage: string
  gamesPlayed: number
  playerStats: {
    gpm: number
    xpm: number
    kills: number
    deaths: number
    assists: number
    lastHits: number
    heroDamage: number
  }
  benchmarks: {
    avgGpm: number
    avgXpm: number
    avgKills: number
    avgDeaths: number
    avgAssists: number
    avgLastHits: number
    avgHeroDamage: number
  }
  comparison: {
    gpmDiff: number
    xpmDiff: number
    kdaDiff: number
    lastHitsDiff: number
    heroDamageDiff: number
  }
  percentileRating: 'below_average' | 'average' | 'above_average' | 'top_25'
  strengths: string[]
  weaknesses: string[]
}

interface HeroRanking {
  bestHeroes: Array<{
    heroName: string
    heroImage: string
    heroId: number
    gamesPlayed: number
    winRate: number
    score: number
    reason: string
  }>
  needsWorkHeroes: Array<{
    heroName: string
    heroImage: string
    heroId: number
    gamesPlayed: number
    winRate: number
    score: number
    reason: string
  }>
}

function HeroCoachingPage({ user }: HeroCoachingPageProps) {
  const [heroes, setHeroes] = useState<HeroPerformance[]>([])
  const [rankings, setRankings] = useState<HeroRanking | null>(null)
  const [selectedHero, setSelectedHero] = useState<HeroPerformance | null>(null)
  const [benchmark, setBenchmark] = useState<HeroBenchmark | null>(null)
  const [loading, setLoading] = useState(true)
  const [benchmarkLoading, setBenchmarkLoading] = useState(false)
  const [sortBy, setSortBy] = useState<'games' | 'winRate' | 'kda' | 'gpm'>('games')

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    fetchHeroData()
  }, [user])

  const fetchHeroData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')

      const [heroesRes, rankingsRes] = await Promise.all([
        fetch(`${API_BASE}/api/hero-coaching/heroes?userId=${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/hero-coaching/rankings?userId=${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ])

      const heroesData = await heroesRes.json()
      const rankingsData = await rankingsRes.json()

      setHeroes(heroesData)
      setRankings(rankingsData)
    } catch (error) {
      console.error('Error fetching hero data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBenchmarks = async (heroId: number) => {
    if (!user) return

    try {
      setBenchmarkLoading(true)
      const token = localStorage.getItem('auth_token')

      const res = await fetch(
        `${API_BASE}/api/hero-coaching/heroes/${heroId}/benchmarks?userId=${user.id}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      const data = await res.json()
      setBenchmark(data)
    } catch (error) {
      console.error('Error fetching benchmarks:', error)
    } finally {
      setBenchmarkLoading(false)
    }
  }

  const handleHeroClick = (hero: HeroPerformance) => {
    setSelectedHero(hero)
    fetchBenchmarks(hero.heroId)
  }

  const sortedHeroes = [...heroes].sort((a, b) => {
    switch (sortBy) {
      case 'winRate': return b.winRate - a.winRate
      case 'kda': return b.avgKDA - a.avgKDA
      case 'gpm': return b.avgGpm - a.avgGpm
      default: return b.gamesPlayed - a.gamesPlayed
    }
  })

  const getPercentileColor = (rating: string) => {
    switch (rating) {
      case 'top_25': return 'text-yellow-400'
      case 'above_average': return 'text-green-400'
      case 'below_average': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getPercentileLabel = (rating: string) => {
    switch (rating) {
      case 'top_25': return 'Top 25%'
      case 'above_average': return 'Above Average'
      case 'below_average': return 'Below Average'
      default: return 'Average'
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
          <p className="text-gray-400">Please sign in with Steam to see your hero stats.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-dota-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your hero data...</p>
        </div>
      </div>
    )
  }

  if (heroes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">No Hero Data Yet</h2>
          <p className="text-gray-400 mb-4">
            Analyze some matches first to see your hero-specific stats.
          </p>
          <p className="text-gray-500 text-sm">
            Go to "My Matches" and analyze at least 3 matches to get started.
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
          <h1 className="text-3xl font-bold text-white mb-2">Hero Coaching</h1>
          <p className="text-gray-400">See how you perform on each hero compared to benchmarks</p>
        </div>

        {/* Hero Rankings */}
        {rankings && (rankings.bestHeroes.length > 0 || rankings.needsWorkHeroes.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Best Heroes */}
            <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-lg p-6 border border-green-500/50">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🏆</span> Your Best Heroes
              </h3>
              <div className="space-y-3">
                {rankings.bestHeroes.map((hero, idx) => (
                  <div
                    key={hero.heroId}
                    className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 cursor-pointer hover:bg-gray-700/50"
                    onClick={() => {
                      const fullHero = heroes.find(h => h.heroId === hero.heroId)
                      if (fullHero) handleHeroClick(fullHero)
                    }}
                  >
                    <span className="text-xl font-bold text-green-400 w-6">#{idx + 1}</span>
                    <img src={hero.heroImage} alt={hero.heroName} className="w-12 h-8 rounded" />
                    <div className="flex-1">
                      <p className="text-white font-semibold">{hero.heroName}</p>
                      <p className="text-gray-400 text-xs">{hero.reason}</p>
                    </div>
                    <span className="text-green-400 font-bold">{hero.winRate.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Needs Work Heroes */}
            <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-lg p-6 border border-red-500/50">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🎯</span> Needs Improvement
              </h3>
              <div className="space-y-3">
                {rankings.needsWorkHeroes.map((hero, idx) => (
                  <div
                    key={hero.heroId}
                    className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 cursor-pointer hover:bg-gray-700/50"
                    onClick={() => {
                      const fullHero = heroes.find(h => h.heroId === hero.heroId)
                      if (fullHero) handleHeroClick(fullHero)
                    }}
                  >
                    <span className="text-xl font-bold text-red-400 w-6">#{idx + 1}</span>
                    <img src={hero.heroImage} alt={hero.heroName} className="w-12 h-8 rounded" />
                    <div className="flex-1">
                      <p className="text-white font-semibold">{hero.heroName}</p>
                      <p className="text-gray-400 text-xs">{hero.reason}</p>
                    </div>
                    <span className="text-red-400 font-bold">{hero.winRate.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Hero Detail Modal */}
        {selectedHero && (
          <div className="mb-8 bg-gray-800 rounded-lg p-6 border border-dota-blue">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <img
                  src={selectedHero.heroImage}
                  alt={selectedHero.heroName}
                  className="w-20 h-14 rounded-lg"
                />
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedHero.heroName}</h2>
                  <p className="text-gray-400">
                    {selectedHero.gamesPlayed} games | {selectedHero.wins} wins
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedHero(null)
                  setBenchmark(null)
                }}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Win Rate</p>
                <p className={`text-2xl font-bold ${selectedHero.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                  {selectedHero.winRate.toFixed(1)}%
                </p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm">KDA</p>
                <p className="text-2xl font-bold text-white">{selectedHero.avgKDA.toFixed(2)}</p>
                <p className="text-gray-500 text-xs">
                  {selectedHero.avgKills.toFixed(1)}/{selectedHero.avgDeaths.toFixed(1)}/{selectedHero.avgAssists.toFixed(1)}
                </p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm">GPM</p>
                <p className="text-2xl font-bold text-white">{Math.round(selectedHero.avgGpm)}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Last Hits</p>
                <p className="text-2xl font-bold text-white">{Math.round(selectedHero.avgLastHits)}</p>
              </div>
            </div>

            {/* Benchmark Comparison */}
            {benchmarkLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dota-blue mx-auto"></div>
              </div>
            ) : benchmark ? (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">
                  Compared to Average Players
                  <span className={`ml-3 text-sm ${getPercentileColor(benchmark.percentileRating)}`}>
                    {getPercentileLabel(benchmark.percentileRating)}
                  </span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Comparison Bars */}
                  <div className="space-y-3">
                    <ComparisonBar
                      label="GPM"
                      playerValue={benchmark.playerStats.gpm}
                      benchmarkValue={benchmark.benchmarks.avgGpm}
                      diff={benchmark.comparison.gpmDiff}
                    />
                    <ComparisonBar
                      label="XPM"
                      playerValue={benchmark.playerStats.xpm}
                      benchmarkValue={benchmark.benchmarks.avgXpm}
                      diff={benchmark.comparison.xpmDiff}
                    />
                    <ComparisonBar
                      label="Last Hits"
                      playerValue={benchmark.playerStats.lastHits}
                      benchmarkValue={benchmark.benchmarks.avgLastHits}
                      diff={benchmark.comparison.lastHitsDiff}
                    />
                    <ComparisonBar
                      label="Hero Damage"
                      playerValue={benchmark.playerStats.heroDamage}
                      benchmarkValue={benchmark.benchmarks.avgHeroDamage}
                      diff={benchmark.comparison.heroDamageDiff}
                    />
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="space-y-4">
                    {benchmark.strengths.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-green-400 mb-2">Strengths</h4>
                        <div className="flex flex-wrap gap-2">
                          {benchmark.strengths.map((s, i) => (
                            <span key={i} className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-sm">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {benchmark.weaknesses.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-red-400 mb-2">Areas to Improve</h4>
                        <div className="flex flex-wrap gap-2">
                          {benchmark.weaknesses.map((w, i) => (
                            <span key={i} className="px-3 py-1 bg-red-900/30 text-red-400 rounded-full text-sm">
                              {w}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Sort Controls */}
        <div className="flex gap-2 mb-4">
          <span className="text-gray-400 py-2">Sort by:</span>
          {(['games', 'winRate', 'kda', 'gpm'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`px-4 py-2 rounded-md transition-colors ${
                sortBy === option
                  ? 'bg-dota-blue text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option === 'games' ? 'Games' : option === 'winRate' ? 'Win Rate' : option.toUpperCase()}
            </button>
          ))}
        </div>

        {/* All Heroes Grid */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">All Heroes ({heroes.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedHeroes.map((hero) => (
              <div
                key={hero.heroId}
                onClick={() => handleHeroClick(hero)}
                className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-colors border ${
                  selectedHero?.heroId === hero.heroId
                    ? 'bg-dota-blue/20 border-dota-blue'
                    : 'bg-gray-700/50 border-transparent hover:bg-gray-700'
                }`}
              >
                <img src={hero.heroImage} alt={hero.heroName} className="w-16 h-10 rounded" />
                <div className="flex-1">
                  <p className="text-white font-semibold">{hero.heroName}</p>
                  <p className="text-gray-400 text-sm">{hero.gamesPlayed} games</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${hero.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                    {hero.winRate.toFixed(0)}%
                  </p>
                  <p className="text-gray-400 text-sm">{hero.avgKDA.toFixed(1)} KDA</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ComparisonBar({
  label,
  playerValue,
  benchmarkValue,
  diff,
}: {
  label: string
  playerValue: number
  benchmarkValue: number
  diff: number
}) {
  const isPositive = diff > 0
  const barWidth = Math.min(Math.abs(diff), 50) // Cap at 50%

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white">
          {Math.round(playerValue)} vs {Math.round(benchmarkValue)}
          <span className={`ml-2 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            ({isPositive ? '+' : ''}{diff.toFixed(0)}%)
          </span>
        </span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${50 + (isPositive ? barWidth : -barWidth)}%` }}
        ></div>
      </div>
    </div>
  )
}

export default HeroCoachingPage
