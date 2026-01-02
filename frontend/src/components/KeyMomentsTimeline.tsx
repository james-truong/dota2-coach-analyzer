import { useState } from 'react'

interface KeyMoment {
  timestamp: number
  type: 'kill' | 'death' | 'multikill' | 'objective' | 'item_purchase' | 'comeback' | 'team_fight'
  title: string
  description: string
  importance: 'high' | 'medium' | 'low'
  metadata?: {
    heroKilled?: string
    itemPurchased?: string
    goldSwing?: number
    killStreak?: number
  }
}

interface KeyMomentsTimelineProps {
  moments: KeyMoment[]
  topMoments: KeyMoment[]
  matchDuration: number
  matchId: string
  deepLink: string
  openDotaLink: string
}

function KeyMomentsTimeline({
  moments,
  topMoments,
  matchDuration,
  matchId,
  deepLink,
  openDotaLink,
}: KeyMomentsTimelineProps) {
  const [selectedMoment, setSelectedMoment] = useState<KeyMoment | null>(null)
  const [showAllMoments, setShowAllMoments] = useState(false)

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getMomentColor = (moment: KeyMoment): string => {
    // Positive moments (green)
    if (moment.type === 'kill' || moment.type === 'multikill' || moment.type === 'item_purchase' || moment.type === 'comeback') {
      return moment.importance === 'high'
        ? 'border-green-500 bg-green-900/20'
        : 'border-green-400 bg-green-900/15'
    }

    // Negative moments (red)
    if (moment.type === 'death') {
      return moment.importance === 'high'
        ? 'border-red-500 bg-red-900/20'
        : 'border-red-400 bg-red-900/15'
    }

    // Neutral moments (blue) - objectives, team fights
    return moment.importance === 'high'
      ? 'border-blue-500 bg-blue-900/20'
      : 'border-blue-400 bg-blue-900/15'
  }

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'kill':
        return '⚔️'
      case 'death':
        return '💀'
      case 'multikill':
        return '🔥'
      case 'objective':
        return '🏰'
      case 'item_purchase':
        return '🛡️'
      case 'comeback':
        return '📈'
      case 'team_fight':
        return '⚔️'
      default:
        return '•'
    }
  }

  const handleDeepLink = (timestamp?: number) => {
    // Generate proper deep link without timestamp (timestamps don't work reliably)
    const link = `steam://rungame/570/76561202255233023/+download_match ${matchId} +playdemo replays/${matchId}.dem`
    window.location.href = link

    // Show helpful message with timestamp
    if (timestamp !== undefined) {
      setTimeout(() => {
        alert(`Opening Dota 2 to download and play this replay.\n\nOnce loaded, manually skip to ${formatTime(timestamp)} using the timeline slider.\n\nTip: Click "Copy Console Command" to get a command you can paste in Dota 2 console for precise seeking.`)
      }, 100)
    }
  }

  const handleCopyCommand = (timestamp: number) => {
    // Copy console command to clipboard
    const command = `playdemo replays/${matchId}.dem ${timestamp}`
    navigator.clipboard.writeText(command).then(() => {
      alert(`Console command copied!\n\nCommand: ${command}\n\nHow to use:\n1. Open Dota 2\n2. Press ~ (tilde) to open console\n3. Paste and press Enter\n4. The replay will start at ${formatTime(timestamp)}`)
    }).catch(() => {
      // Fallback if clipboard API fails
      prompt('Copy this command and paste it in Dota 2 console (~):', command)
    })
  }

  const displayedMoments = showAllMoments ? moments : topMoments

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Key Moments & Replay Highlights</h3>
        <div className="flex gap-3">
          <button
            onClick={() => window.open(openDotaLink, '_blank')}
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
          >
            View on OpenDota
          </button>
          <button
            onClick={() => handleDeepLink()}
            className="px-4 py-2 bg-dota-blue text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-semibold"
          >
            Open in Dota 2 Client
          </button>
        </div>
      </div>

      {/* Top Moments Highlights */}
      {topMoments.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-3">🌟 Top 5 Moments to Review</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {topMoments.map((moment, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedMoment(moment)
                  handleDeepLink(moment.timestamp)
                }}
                className={`text-left p-4 rounded-lg border-l-4 transition-all hover:shadow-lg ${getMomentColor(moment)}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getTypeIcon(moment.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-semibold text-sm truncate">{moment.title}</p>
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{formatTime(moment.timestamp)}</span>
                    </div>
                    <p className="text-gray-300 text-xs line-clamp-2">{moment.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Visualization */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-semibold text-gray-400">Match Timeline</h4>
          <button
            onClick={() => setShowAllMoments(!showAllMoments)}
            className="text-xs text-dota-blue hover:text-blue-400 transition-colors"
          >
            {showAllMoments ? `Show Top 5 Only (${topMoments.length})` : `Show All Moments (${moments.length})`}
          </button>
        </div>

        {/* Timeline Bar */}
        <div className="relative h-16 bg-gray-700 rounded-lg overflow-hidden">
          {/* Duration markers */}
          <div className="absolute inset-0 flex justify-between items-end px-2 pb-1">
            <span className="text-xs text-gray-500">0:00</span>
            <span className="text-xs text-gray-500">{formatTime(Math.floor(matchDuration / 2))}</span>
            <span className="text-xs text-gray-500">{formatTime(matchDuration)}</span>
          </div>

          {/* Moment markers */}
          {displayedMoments.map((moment, index) => {
            const position = (moment.timestamp / matchDuration) * 100
            return (
              <button
                key={index}
                onClick={() => {
                  setSelectedMoment(moment)
                  handleDeepLink(moment.timestamp)
                }}
                className="absolute top-2 w-8 h-8 flex items-center justify-center transform -translate-x-1/2 hover:scale-125 transition-transform"
                style={{ left: `${position}%` }}
                title={`${moment.title} - ${formatTime(moment.timestamp)}`}
              >
                <span
                  className={`text-xl ${
                    // Positive moments - green glow
                    (moment.type === 'kill' || moment.type === 'multikill' || moment.type === 'item_purchase' || moment.type === 'comeback')
                      ? (moment.importance === 'high' ? 'drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]')
                      // Negative moments - red glow
                      : moment.type === 'death'
                      ? (moment.importance === 'high' ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]')
                      // Neutral moments - blue glow
                      : (moment.importance === 'high' ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]')
                  }`}
                >
                  {getTypeIcon(moment.type)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Moment Details */}
      {selectedMoment && (
        <div className={`p-4 rounded-lg border-l-4 ${getMomentColor(selectedMoment)}`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getTypeIcon(selectedMoment.type)}</span>
              <div>
                <h5 className="text-white font-bold">{selectedMoment.title}</h5>
                <p className="text-gray-400 text-sm">At {formatTime(selectedMoment.timestamp)}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedMoment(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-300 mb-3">{selectedMoment.description}</p>

          {selectedMoment.metadata && (
            <div className="text-sm text-gray-400 mb-3">
              {selectedMoment.metadata.heroKilled && (
                <p>Hero: {selectedMoment.metadata.heroKilled}</p>
              )}
              {selectedMoment.metadata.itemPurchased && (
                <p>Item: {selectedMoment.metadata.itemPurchased}</p>
              )}
              {selectedMoment.metadata.goldSwing && (
                <p>Gold Swing: {Math.round(selectedMoment.metadata.goldSwing / 1000)}k</p>
              )}
              {selectedMoment.metadata.killStreak && (
                <p>Kill Streak: {selectedMoment.metadata.killStreak}</p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => handleDeepLink(selectedMoment.timestamp)}
              className="flex-1 px-4 py-2 bg-dota-blue text-white rounded-md hover:bg-blue-600 transition-colors font-semibold"
            >
              Watch This Moment in Dota 2
            </button>
            <button
              onClick={() => handleCopyCommand(selectedMoment.timestamp)}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
            >
              Copy Console Command
            </button>
          </div>
        </div>
      )}

      {/* All Moments List (when expanded) */}
      {showAllMoments && moments.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-400 mb-3">All Moments</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {moments.map((moment, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedMoment(moment)
                  handleDeepLink(moment.timestamp)
                }}
                className={`w-full text-left p-3 rounded-lg border-l-4 transition-all hover:shadow-md ${getMomentColor(moment)}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getTypeIcon(moment.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-semibold text-sm truncate">{moment.title}</p>
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{formatTime(moment.timestamp)}</span>
                    </div>
                    <p className="text-gray-300 text-xs truncate">{moment.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {moments.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No key moments detected for this match.</p>
          <p className="text-gray-500 text-sm mt-2">
            This may occur if the match data is incomplete or still being processed.
          </p>
        </div>
      )}
    </div>
  )
}

export default KeyMomentsTimeline
