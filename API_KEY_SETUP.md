# OpenDota API Key Setup

## Why You Need This

OpenDota's **anonymous API** has strict rate limits:
- **60 requests per minute**
- **50,000 requests per month**

With an API key (FREE), you get:
- **Higher rate limits**
- **More reliable access**
- **No 403 errors**

## How to Get Your API Key (2 minutes)

### Step 1: Visit OpenDota
Go to: **https://www.opendota.com/api-keys**

### Step 2: Sign In with Steam
Click "Sign in through Steam" and authorize with your Steam account

### Step 3: Generate API Key
1. Click "Create New Key"
2. Give it a name (e.g., "Dota 2 Coach Analyzer")
3. Copy the generated key

### Step 4: Add to Your Project
1. Open `backend/.env` file
2. Find the line `OPENDOTA_API_KEY=`
3. Paste your key:
   ```env
   OPENDOTA_API_KEY=your-actual-key-here
   ```

### Step 5: Restart Backend
```bash
# Stop the servers (Ctrl+C)
# Then restart
npm run dev
```

## How to Verify It's Working

When you analyze a match, check your backend terminal:

**Without API key:**
```
No API key - using anonymous access (limited rate)
```

**With API key:**
```
Using OpenDota API key for higher rate limits
```

## Testing

1. **First try DEMO mode** to make sure the error handling fix worked:
   - Type `DEMO` in Match ID
   - Should show instant results

2. **Then try a real Match ID** with your API key:
   - Go to https://www.opendota.com/explorer
   - Click any match
   - Copy the Match ID
   - Paste in your app

## Rate Limits with API Key

With a free API key you get:
- Much higher rate limits
- Shouldn't hit 403 errors anymore
- Can make lots of test requests

## Alternative: Keep Using DEMO Mode

If you don't want to register yet:
- Keep using `DEMO` as the Match ID
- All features will work
- Perfect for development and testing
- No external dependencies

## When You'll Need Real API

You'll need the API key when:
- Testing with your actual matches
- Showing the app to others
- Deploying to production
- Running multiple analyses

---

**Recommendation**: Get the API key now (takes 2 min), use DEMO mode for quick testing.
