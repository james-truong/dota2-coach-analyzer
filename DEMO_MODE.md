# 🎮 DEMO Mode - Test Without OpenDota Rate Limits!

## The Solution

Since OpenDota API is rate limiting your requests, I've added a **DEMO mode** that uses pre-loaded sample match data. This lets you test the full application without hitting OpenDota's API.

## How to Use DEMO Mode

### Step 1: Start Your Servers
```bash
npm run dev
```

### Step 2: Go to the App
Open http://localhost:3001

### Step 3: Enter "DEMO" as the Match ID
Just type:
```
DEMO
```

That's it! You'll get a full analysis of a sample match with:
- Real stats (KDA, GPM, XPM, CS, etc.)
- Actual coaching insights
- All 10 players from the match
- Complete analysis results

## What You'll See

The DEMO match features:
- **39-minute game** (Radiant victory)
- **Player slot 0**: Anti-Mage (12/3/8 KDA, 720 GPM) - Good core performance
- **Player slot 3**: Crystal Maiden (2/8/20 KDA, 280 GPM, 12 wards) - Support with vision
- **All 10 players** with realistic stats

The analysis will show real coaching tips like:
- "Excellent KDA ratio" for the Anti-Mage
- Vision warnings for supports with low ward placement
- Farm efficiency feedback

## Why This Helps

✅ **No Rate Limits** - Bypass OpenDota completely
✅ **Instant Results** - No API delays
✅ **Test Full Flow** - See the entire UI and analysis
✅ **Develop Faster** - No waiting between tests

## When to Use Real Match IDs

Once OpenDota's rate limit resets (usually 1-2 hours), you can try real Match IDs:

1. Go to https://www.opendota.com/explorer
2. Click on any match
3. Copy the Match ID from the URL
4. Paste it into your app

## Backend Console

When you use DEMO mode, you'll see in the backend:
```
Using DEMO match data (bypassing OpenDota API)
```

When rate limited:
```
Access forbidden or rate limited for match 12345.
🎮 TIP: Use "DEMO" as the Match ID to test with sample data!
```

## Technical Details

The DEMO data is defined in:
- `backend/src/services/demoDataService.ts`

It includes:
- Full 10-player match data
- Realistic stats for all positions
- Core and support players with appropriate metrics
- All the data needed for analysis

## Next Steps

After testing with DEMO mode:

1. **Wait for Rate Limit** - OpenDota usually resets in 1-2 hours
2. **Get OpenDota API Key** (optional) - Register at https://www.opendota.com/api-keys for higher limits
3. **Use Older Matches** - Matches from yesterday are more reliable
4. **Test Full Flow** - Use DEMO to develop UI/analysis features without API calls

---

**Try it now!** Just type "DEMO" in the Match ID field and see the full analysis! 🚀
