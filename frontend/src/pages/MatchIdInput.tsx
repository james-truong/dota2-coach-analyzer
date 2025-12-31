import { useState } from 'react'

interface MatchIdInputProps {
  onAnalysisStart: (matchId: string) => void
}

function MatchIdInput({ onAnalysisStart }: MatchIdInputProps) {
  const [matchId, setMatchId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedId = matchId.trim()

    // Validate match ID (should be a number or DEMO)
    if (!trimmedId) {
      setError('Please enter a Match ID')
      return
    }

    // Allow DEMO or numeric match IDs
    const isDemoMode = trimmedId.toUpperCase() === 'DEMO' || trimmedId === '0'
    if (!isDemoMode && !/^\d+$/.test(trimmedId)) {
      setError('Match ID must be a number or "DEMO"')
      return
    }

    setError(null)
    onAnalysisStart(isDemoMode ? 'DEMO' : trimmedId)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-4">
          Analyze Your Dota 2 Match
        </h2>
        <p className="text-gray-400 text-lg">
          Enter your Match ID to get instant AI-powered analysis and personalized coaching tips
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <div className="bg-gray-800/50 rounded-lg p-8 border border-gray-700">
          <label htmlFor="matchId" className="block text-white font-semibold mb-3">
            Match ID
          </label>
          <input
            type="text"
            id="matchId"
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            placeholder='e.g., 7938571234 or type "DEMO"'
            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-dota-blue transition-colors"
          />
          <p className="text-gray-500 text-sm mt-2">
            Find your Match ID in the Dota 2 client or on{' '}
            <a
              href="https://www.opendota.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-dota-blue hover:underline"
            >
              OpenDota.com
            </a>
            {' • Or type '}
            <span className="text-green-400 font-semibold">DEMO</span>
            {' to test with sample data'}
          </p>

          {error && (
            <div className="mt-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="mt-6 w-full bg-dota-blue hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Analyze Match
          </button>
        </div>
      </form>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="text-dota-blue text-3xl mb-2">1</div>
          <h3 className="text-white font-semibold mb-2">Find Match ID</h3>
          <p className="text-gray-400 text-sm">
            Get your Match ID from Dota 2 client or OpenDota after playing
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="text-dota-blue text-3xl mb-2">2</div>
          <h3 className="text-white font-semibold mb-2">AI Analysis</h3>
          <p className="text-gray-400 text-sm">
            Our AI analyzes your gameplay and identifies key mistakes
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="text-dota-blue text-3xl mb-2">3</div>
          <h3 className="text-white font-semibold mb-2">Get Better</h3>
          <p className="text-gray-400 text-sm">
            Receive actionable tips to improve your gameplay
          </p>
        </div>
      </div>

      <div className="mt-12 bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
        <h3 className="text-white font-semibold mb-3 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          How to find your Match ID
        </h3>
        <ol className="text-gray-300 text-sm space-y-2 ml-7">
          <li>1. Open Dota 2 and go to your profile</li>
          <li>2. Click on "Matches" tab</li>
          <li>3. Click on any recent match</li>
          <li>4. The Match ID appears in the top-left corner</li>
          <li>
            5. Alternatively, visit{' '}
            <a
              href="https://www.opendota.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-dota-blue hover:underline"
            >
              OpenDota.com
            </a>{' '}
            and search for your Steam ID
          </li>
        </ol>
      </div>
    </div>
  )
}

export default MatchIdInput
