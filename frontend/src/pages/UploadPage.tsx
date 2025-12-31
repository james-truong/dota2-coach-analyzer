import { useState, useCallback } from 'react'
import axios from 'axios'

interface UploadPageProps {
  onAnalysisComplete: (matchId: string) => void
}

function UploadPage({ onAnalysisComplete }: UploadPageProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith('.dem')) {
        setFile(droppedFile)
        setError(null)
      } else {
        setError('Please upload a .dem replay file')
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.name.endsWith('.dem')) {
        setFile(selectedFile)
        setError(null)
      } else {
        setError('Please upload a .dem replay file')
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)
    setProgress(0)

    const formData = new FormData()
    formData.append('replay', file)

    try {
      const response = await axios.post('/api/replays/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0
          setProgress(percentCompleted)
        },
      })

      // Assuming the API returns the match ID
      const matchId = response.data.matchId
      onAnalysisComplete(matchId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-4">
          Upload Your Dota 2 Replay
        </h2>
        <p className="text-gray-400 text-lg">
          Get instant AI-powered analysis and personalized coaching tips
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragActive
            ? 'border-dota-blue bg-blue-900/20'
            : 'border-gray-600 bg-gray-800/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {!file ? (
          <>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-4">
              <label
                htmlFor="file-upload"
                className="cursor-pointer rounded-md font-medium text-dota-blue hover:text-blue-400 focus-within:outline-none"
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  accept=".dem"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>
              <p className="text-gray-400 mt-2">or drag and drop</p>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              .dem replay files only (max 500MB)
            </p>
          </>
        ) : (
          <div>
            <svg
              className="mx-auto h-12 w-12 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-4 text-white font-medium">{file.name}</p>
            <p className="text-gray-400 text-sm mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <button
              onClick={() => setFile(null)}
              className="mt-4 text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {file && !uploading && (
        <div className="mt-6 text-center">
          <button
            onClick={handleUpload}
            className="bg-dota-blue hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Analyze Replay
          </button>
        </div>
      )}

      {uploading && (
        <div className="mt-6">
          <div className="bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="bg-dota-blue h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-gray-400 mt-2">
            {progress < 100 ? `Uploading... ${progress}%` : 'Processing replay...'}
          </p>
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="text-dota-blue text-3xl mb-2">1</div>
          <h3 className="text-white font-semibold mb-2">Upload Replay</h3>
          <p className="text-gray-400 text-sm">
            Upload your .dem replay file from any recent match
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
    </div>
  )
}

export default UploadPage
