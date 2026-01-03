import { useEffect, useState } from 'react'
import axios from 'axios'
import type { AnalysisResult } from '../types'
import AdBanner from '../components/AdBanner'
import KeyMomentsTimeline from '../components/KeyMomentsTimeline'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

interface AnalysisPageProps {
  matchId: string
  playerSlot: number
  onBack: () => void
}

function AnalysisPage({ matchId, playerSlot, onBack }: AnalysisPageProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/matches/${matchId}/analysis?playerSlot=${playerSlot}`)
        setAnalysis(response.data)
      } catch (err: any) {
        if (err.response?.data?.message) {
          setError(err.response.data.message)
        } else if (err.response?.status === 403) {
          setError('Access forbidden. OpenDota may be rate limiting. Please wait a few minutes and try again.')
        } else if (err.response?.status === 404) {
          setError('Match not found. This match may be private, too recent, or the Match ID is invalid. Try an older public match.')
        } else {
          setError('Failed to load analysis. Please try again.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysis()
  }, [matchId, playerSlot])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-dota-blue mx-auto"></div>
          <p className="text-gray-400 mt-4">Analyzing your replay...</p>
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-6 py-4 rounded">
          {error || 'Analysis not found'}
        </div>
        <button
          onClick={onBack}
          className="mt-4 text-dota-blue hover:text-blue-400"
        >
          ← Back to Upload
        </button>
      </div>
    )
  }

  const { match, playerPerformance, insights, summary, itemBuild } = analysis

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button
        onClick={onBack}
        className="text-dota-blue hover:text-blue-400 mb-6 flex items-center"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Upload
      </button>

      {/* Match Header */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            {playerPerformance.heroImage && (
              <img
                src={playerPerformance.heroImage}
                alt={playerPerformance.heroName}
                className="w-24 h-24 rounded-lg object-cover"
              />
            )}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold text-white">
                  {playerPerformance.heroName}
                </h2>
                {playerPerformance.detectedRole && (
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    playerPerformance.detectedRole === 'Core'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  }`}>
                    {playerPerformance.detectedRole}
                  </span>
                )}
              </div>
              <p className="text-gray-400">
                {match.gameMode} • {Math.floor(match.duration / 60)}:{(match.duration % 60).toString().padStart(2, '0')} •{' '}
                <span className={match.radiantWin ? 'text-dota-green' : 'text-dota-red'}>
                  {match.radiantWin ? 'Radiant Victory' : 'Dire Victory'}
                </span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-white">
              {playerPerformance.kills}/{playerPerformance.deaths}/{playerPerformance.assists}
            </div>
            <p className="text-gray-400">K/D/A</p>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Last Hits</p>
          <p className="text-2xl font-bold text-white">{playerPerformance.lastHits}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">GPM</p>
          <p className="text-2xl font-bold text-white">{playerPerformance.goldPerMin}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">XPM</p>
          <p className="text-2xl font-bold text-white">{playerPerformance.xpPerMin}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Hero Damage</p>
          <p className="text-2xl font-bold text-white">
            {(playerPerformance.heroDamage / 1000).toFixed(1)}k
          </p>
        </div>
      </div>

      {/* Ad Banner - Top */}
      <AdBanner
        slot="1234567890"
        format="horizontal"
        className="mb-6"
      />

      {/* Mistakes Summary */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h3 className="text-xl font-bold text-white mb-4">Analysis Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-500">{summary.criticalMistakes}</div>
            <p className="text-gray-400 text-sm">Critical</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-500">{summary.highMistakes}</div>
            <p className="text-gray-400 text-sm">High</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-500">{summary.mediumMistakes}</div>
            <p className="text-gray-400 text-sm">Medium</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-500">{summary.lowMistakes}</div>
            <p className="text-gray-400 text-sm">Low</p>
          </div>
        </div>
      </div>

      {/* Item Build Analysis */}
      {itemBuild && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Item Build Analysis</h3>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Item Score:</span>
              <span className={`text-2xl font-bold ${
                itemBuild.score >= 80 ? 'text-green-400' :
                itemBuild.score >= 60 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {itemBuild.score}/100
              </span>
            </div>
          </div>

          {/* Final Items */}
          <div className="mb-4">
            <p className="text-gray-400 text-sm mb-2">Final Items:</p>
            <div className="flex flex-wrap gap-2">
              {itemBuild.items.map((item: string, index: number) => (
                <span key={index} className="px-3 py-1 bg-gray-700 rounded text-white text-sm">
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Positives */}
          {itemBuild.positives && itemBuild.positives.length > 0 && (
            <div className="mb-4">
              <p className="text-green-400 font-semibold text-sm mb-2">✓ What You Did Well:</p>
              <ul className="space-y-1">
                {itemBuild.positives.map((positive: string, index: number) => (
                  <li key={index} className="text-gray-300 text-sm flex items-start">
                    <span className="text-green-400 mr-2">•</span>
                    {positive}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Issues */}
          {itemBuild.keyIssues && itemBuild.keyIssues.length > 0 && (
            <div>
              <p className="text-red-400 font-semibold text-sm mb-2">⚠ Areas to Improve:</p>
              <ul className="space-y-1">
                {itemBuild.keyIssues.map((issue: string, index: number) => (
                  <li key={index} className="text-gray-300 text-sm flex items-start">
                    <span className="text-red-400 mr-2">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Key Moments Timeline */}
      {analysis.keyMoments && (
        <KeyMomentsTimeline
          moments={analysis.keyMoments.moments}
          topMoments={analysis.keyMoments.topMoments}
          matchDuration={match.duration}
          matchId={match.matchId.toString()}
          deepLink={analysis.keyMoments.deepLink}
          openDotaLink={analysis.keyMoments.openDotaLink}
        />
      )}

      {/* Insights List */}
      <div className="bg-gray-800 rounded-lg p-6 mt-6">
        <h3 className="text-xl font-bold text-white mb-4">Coaching Insights</h3>
        <div className="space-y-4">
          {insights.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              Great game! No major issues detected.
            </p>
          ) : (
            insights.map((insight) => {
              // Handle both AI insights format and item build insights format
              const title = insight.title || insight.category || 'Insight'
              const description = insight.description || insight.message || ''
              const recommendation = insight.recommendation || insight.suggestion || ''

              // Skip insights with no meaningful content
              if (!description && !recommendation) {
                return null
              }

              return (
                <div
                  key={insight.id}
                  className={`border-l-4 p-4 rounded ${
                    insight.severity === 'critical'
                      ? 'border-red-500 bg-red-900/20'
                      : insight.severity === 'high'
                      ? 'border-orange-500 bg-orange-900/20'
                      : insight.severity === 'medium'
                      ? 'border-yellow-500 bg-yellow-900/20'
                      : insight.severity === 'important'
                      ? 'border-yellow-500 bg-yellow-900/20'
                      : 'border-blue-500 bg-blue-900/20'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-white">{title}</h4>
                    {insight.gameTime && (
                      <span className="text-gray-400 text-sm">
                        {Math.floor(insight.gameTime / 60)}:{(insight.gameTime % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  {description && (
                    <p className="text-gray-300 text-sm mb-2">{description}</p>
                  )}
                  {recommendation && (
                    <div className="bg-gray-900/50 rounded p-3 mt-2">
                      <p className="text-sm text-gray-400 mb-1">💡 Recommendation:</p>
                      <p className="text-sm text-gray-200">{recommendation}</p>
                    </div>
                  )}
                  {insight.category && (
                    <div className="mt-2 flex gap-2">
                      <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">
                        {insight.category}
                      </span>
                      {insight.insightType && (
                        <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">
                          {insight.insightType}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Ad Banner - Bottom */}
      <AdBanner
        slot="0987654321"
        format="horizontal"
        className="mt-6"
      />
    </div>
  )
}

export default AnalysisPage
