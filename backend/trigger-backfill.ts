import { backfillUserMatches } from './src/services/matchHistoryService.js'
import { initializeHeroData } from './src/services/heroDataService.js'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  console.log('Initializing hero data...')
  await initializeHeroData()
  
  const userId = '0d2ef0c4-5786-4eaf-93ed-e3007569d590'
  const accountId = 49487324
  console.log(`Starting backfill for user ${userId} (account ${accountId})...`)
  const result = await backfillUserMatches(userId, accountId, 20)
  console.log('Backfill result:', result)
  process.exit(0)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
