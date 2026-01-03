import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

interface SteamUser {
  id: string // Database UUID
  steamId: string
  accountId: number
  displayName: string
  avatar: string
  profileUrl: string
}

interface SteamLoginButtonProps {
  onLoginSuccess?: (user: SteamUser) => void
}

function SteamLoginButton({ onLoginSuccess }: SteamLoginButtonProps) {
  const [user, setUser] = useState<SteamUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if we just logged in (token in URL)
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')

    if (token) {
      // Store token in localStorage
      localStorage.setItem('auth_token', token)
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        if (onLoginSuccess) {
          onLoginSuccess(data.user)
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    window.location.href = `${API_BASE}/api/auth/steam`
  }

  const handleLogout = async () => {
    try {
      localStorage.removeItem('auth_token')
      setUser(null)
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex items-center space-x-3">
        <img
          src={user.avatar}
          alt={user.displayName}
          className="w-10 h-10 rounded-full border-2 border-dota-blue"
        />
        <div className="flex flex-col">
          <span className="text-white font-medium text-sm">{user.displayName}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-white text-left"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={handleLogin}
      className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15h-2v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95 0-5.52-4.48-10-10-10z"/>
      </svg>
      <span className="text-white font-medium">Login with Steam</span>
    </button>
  )
}

export default SteamLoginButton
