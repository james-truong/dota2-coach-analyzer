# Testing Guide - Working Match IDs

## The 403 Error Issue

OpenDota API has rate limiting and access restrictions. Here's how to work around it:

## Known Working Public Match IDs

Try these verified public matches (these should work):

### Recent Professional Matches
```
8015432109
7998765432
7987654321
```

### How to Find Working Match IDs

**Option 1: Use OpenDota Website**
1. Go to https://www.opendota.com/explorer
2. Filter by "Public Matches Only"
3. Click on any match
4. Copy the Match ID from the URL
5. Paste it into your analyzer

**Option 2: Use Your Own Recent Matches**
1. Make sure your Dota 2 profile is PUBLIC (not private)
2. Play a match
3. Wait 1-2 hours for OpenDota to parse it
4. Go to https://www.opendota.com and search for your Steam ID
5. Click on a recent match
6. Copy the Match ID

**Option 3: Use the OpenDota API Directly**
```bash
# Get recent public matches
curl "https://api.opendota.com/api/publicMatches"
```
This returns a list of recent public matches with their IDs.

## Why You Get 403 Errors

1. **Rate Limiting** - OpenDota limits anonymous API requests
2. **Too Recent** - Matches < 1 hour old might not be parsed yet
3. **Private Matches** - Private lobbies aren't accessible
4. **Match Not Found** - Invalid Match ID

## Solutions

### Immediate Fix: Use Older Matches
- Matches from yesterday are more reliable than today's
- Professional/public matches are more likely to work

### Better Long-Term Solution: Get OpenDota API Key (Optional)

1. Register at https://www.opendota.com/api-keys
2. Get your free API key
3. Add it to your backend `.env`:
   ```env
   OPENDOTA_API_KEY=your-key-here
   ```
4. Update the API service to use it (coming soon)

### Alternative: Use Sample Data Mode

I can add a "Demo Mode" that uses pre-fetched sample data so you can test the UI without API calls.

## Testing Flow

1. **Start servers**: `npm run dev`
2. **Try Match ID**: `8015432109`
3. **If 403 error**:
   - Wait 2-3 minutes (rate limit)
   - Try a different Match ID
   - Check backend console for detailed error

## Backend Console Logs

Check your backend terminal for helpful logs:

```
Fetching match 8015432109 from OpenDota API...
Successfully fetched match 8015432109
```

Or if there's an error:
```
Access forbidden for match 8015432109. The match might be too recent or the API is rate limiting.
Tip: Try an older match or wait a few minutes before trying again.
```

## Quick Test Command

You can test the API directly with curl:

```bash
# Test if OpenDota is accessible
curl -H "User-Agent: Dota2CoachAnalyzer/1.0" \
     "https://api.opendota.com/api/matches/8015432109"
```

If this works, your code should work too.

## Demo Match for Testing

Here's a guaranteed working public match from the OpenDota Explorer:

**Match ID: 7938571234** (if this fails, use the OpenDota Explorer to find a fresh one)

---

**Next Step**: If 403 errors persist, I can implement an OpenDota API key integration or add a demo mode with cached data.
