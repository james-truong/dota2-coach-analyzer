// Quick test to verify OpenDota API key is working
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const apiKey = process.env.OPENDOTA_API_KEY

console.log('=== OpenDota API Key Test ===\n')
console.log('API Key found:', apiKey ? `Yes (${apiKey.substring(0, 8)}...)` : 'No')
console.log('Testing with a known public match...\n')

const testMatchId = '7938571234' // A known public match

async function testAPI() {
  try {
    const config = {
      headers: {
        'User-Agent': 'Dota2CoachAnalyzer/1.0',
        'Accept': 'application/json',
      },
      timeout: 10000,
    }

    if (apiKey && apiKey.trim()) {
      config.params = { api_key: apiKey }
      console.log('✓ Using API key in request')
    } else {
      console.log('✗ No API key - using anonymous access')
    }

    console.log(`Fetching match ${testMatchId}...\n`)
    const response = await axios.get(
      `https://api.opendota.com/api/matches/${testMatchId}`,
      config
    )

    if (response.status === 200) {
      console.log('✓ SUCCESS! API request worked')
      console.log(`Match ID: ${response.data.match_id}`)
      console.log(`Duration: ${Math.floor(response.data.duration / 60)} minutes`)
      console.log(`Winner: ${response.data.radiant_win ? 'Radiant' : 'Dire'}`)
      console.log('\n✓ Your API key is working correctly!')
    }
  } catch (error) {
    console.error('✗ ERROR:', error.message)
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Status Text:', error.response.statusText)

      if (error.response.status === 403) {
        console.error('\n❌ 403 Forbidden - Possible causes:')
        console.error('  1. API key is invalid')
        console.error('  2. Still rate limited (wait 1-2 hours)')
        console.error('  3. Try using DEMO mode instead')
      } else if (error.response.status === 429) {
        console.error('\n❌ 429 Rate Limited - Wait before trying again')
      } else if (error.response.status === 404) {
        console.error('\n❌ 404 Match Not Found')
      }
    }
  }
}

testAPI()
