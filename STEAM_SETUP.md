# Steam Integration Setup Guide

## What's Been Implemented

Steam integration allows users to:
- ✅ Login with their Steam account (one-click OAuth)
- ✅ Automatically fetch their last 20 Dota 2 matches from OpenDota
- ✅ View match history with hero images, KDA, game results
- ✅ Click any match to analyze it instantly
- ✅ No more manual Match ID entry!

## Setup Instructions

### 1. Get Your Steam API Key

1. Go to https://steamcommunity.com/dev/apikey
2. Login with your Steam account
3. Enter a domain name (use `localhost` for development)
4. Click "Register" to get your API key
5. Copy the API key

### 2. Configure Backend

1. Open `backend/.env`
2. Add your Steam API key:
   ```
   STEAM_API_KEY=your-api-key-here
   ```
3. Restart the backend server:
   ```bash
   cd backend
   npm run dev
   ```

### 3. Test the Integration

1. Make sure both servers are running:
   - Backend: http://localhost:5001
   - Frontend: http://localhost:3001

2. Open http://localhost:3001 in your browser

3. Click "Login with Steam" button in the top-right navbar

4. You'll be redirected to Steam's login page

5. After logging in, you'll be redirected back to your app

6. You should see your Steam avatar and name in the navbar!

7. Click "My Matches" to see your recent Dota 2 matches

8. Click any match to analyze it automatically

## How It Works

### Authentication Flow

```
User clicks "Login with Steam"
    ↓
Redirect to Steam OpenID (passport-steam)
    ↓
User authorizes on Steam
    ↓
Steam redirects back with Steam ID
    ↓
Backend converts Steam ID64 → Account ID (OpenDota format)
    ↓
Session created with user data
    ↓
Frontend shows user avatar + name
```

### Match History Flow

```
User clicks "My Matches"
    ↓
Frontend checks if user is logged in
    ↓
Fetch matches from OpenDota API: /api/players/{accountId}/matches
    ↓
Display last 20 matches with hero images, KDA, results
    ↓
User clicks a match → Automatically analyze it
```

## API Endpoints Created

### Authentication
- `GET /api/auth/steam` - Initiate Steam login
- `GET /api/auth/steam/return` - Steam callback URL
- `GET /api/auth/me` - Get current logged-in user
- `GET /api/auth/logout` - Logout

### Player Data
- `GET /api/players/:accountId/matches?limit=20` - Fetch player's recent matches
- `GET /api/players/me/matches` - Fetch logged-in user's matches (authenticated)

## Files Modified/Created

### Backend
- ✅ `backend/src/services/steamAuthService.ts` - Steam OAuth logic
- ✅ `backend/src/routes/auth.ts` - Authentication routes
- ✅ `backend/src/routes/player.ts` - Player match history routes
- ✅ `backend/src/services/openDotaService.ts` - Added `fetchPlayerMatches()`
- ✅ `backend/src/index.ts` - Added session + passport middleware
- ✅ `backend/.env` - Added Steam API key config

### Frontend
- ✅ `frontend/src/components/SteamLoginButton.tsx` - Steam login UI component
- ✅ `frontend/src/pages/MatchHistory.tsx` - Updated to fetch from OpenDota
- ✅ `frontend/src/App.tsx` - Added user state management
- ✅ `frontend/.env` - Added backend API URL

## Troubleshooting

### "Login with Steam" button doesn't work
- Check that backend is running on port 5001
- Verify STEAM_API_KEY is set in `backend/.env`
- Check browser console for CORS errors

### Can't see match history
- Make sure you're logged in (avatar should show in navbar)
- Check that your Steam profile is public
- Verify your matches are public on OpenDota

### CORS errors
- Ensure `FRONTEND_URL=http://localhost:3001` in `backend/.env`
- Restart backend after changing .env

### No matches showing
- Your Dota 2 profile must be public
- Matches must exist on OpenDota (they update automatically after games)

## Next Steps

Now that Steam integration works, you can:
1. ✅ Add AI-powered coaching (Claude API integration)
2. ✅ Multi-match trend analysis (analyze last 20 matches)
3. ✅ Deploy to production with proper domain
4. ✅ Add custom domain for better AdSense approval

## Production Deployment Notes

When deploying to production (Vercel):

1. Add environment variables in Vercel dashboard:
   - `STEAM_API_KEY`
   - `SESSION_SECRET` (generate a secure random string)
   - `BACKEND_URL` (your production backend URL)
   - `FRONTEND_URL` (your production frontend URL)

2. Update Steam API key domain:
   - Go to https://steamcommunity.com/dev/apikey
   - Update domain to your production domain (e.g., `dota2-coach-analyzer.vercel.app`)

3. Session cookies in production:
   - Cookies will use `secure: true` (HTTPS only)
   - Cross-site cookies require proper CORS configuration

## Sources

- [passport-steam documentation](https://www.npmjs.com/package/passport-steam)
- [OpenDota API documentation](https://docs.opendota.com/)
