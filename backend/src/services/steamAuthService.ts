import passport from 'passport'
import { Strategy as SteamStrategy } from 'passport-steam'
import { upsertUser } from './databaseService.js'
import { triggerAutoImportBackground } from './autoImportService.js'

// Convert Steam ID64 to account ID (32-bit)
// Steam ID64 format: 76561197960265728 + account_id
const STEAM_ID_BASE = BigInt('76561197960265728')

export function steamId64ToAccountId(steamId64: string): number {
  const steamIdBig = BigInt(steamId64)
  const accountId = steamIdBig - STEAM_ID_BASE
  return Number(accountId)
}

export function accountIdToSteamId64(accountId: number): string {
  const steamIdBig = STEAM_ID_BASE + BigInt(accountId)
  return steamIdBig.toString()
}

export interface SteamUser {
  id?: string // Database UUID
  steamId: string
  accountId: number
  displayName: string
  avatar: string
  profileUrl: string
}

export function configureSteamAuth(realm: string, returnURL: string) {
  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user)
  })

  // Deserialize user from session
  passport.deserializeUser((user: any, done) => {
    done(null, user)
  })

  // Configure Steam strategy
  passport.use(
    new SteamStrategy(
      {
        returnURL,
        realm,
        apiKey: process.env.STEAM_API_KEY || '', // Optional: for fetching profile data
      },
      async (identifier: string, profile: any, done: any) => {
        try {
          // Extract Steam ID from OpenID identifier
          // Format: https://steamcommunity.com/openid/id/{STEAM_ID}
          const steamId = identifier.match(/\d+$/)?.[0] || ''

          if (!steamId) {
            return done(new Error('Invalid Steam ID'), null)
          }

          const accountId = steamId64ToAccountId(steamId)

          // Save/update user in database
          const dbUser = await upsertUser({
            steamId,
            accountId,
            displayName: profile.displayName || 'Steam User',
            avatar: profile.photos?.[2]?.value || profile.photos?.[0]?.value || '',
            profileUrl: profile._json?.profileurl || `https://steamcommunity.com/profiles/${steamId}`,
          })

          const user: SteamUser = {
            id: dbUser.id,
            steamId: dbUser.steamId,
            accountId: dbUser.accountId,
            displayName: dbUser.displayName,
            avatar: dbUser.avatar,
            profileUrl: dbUser.profileUrl,
          }

          console.log(`✓ Steam login: ${user.displayName} (Account ID: ${accountId}, User ID: ${user.id}, First login: ${dbUser.isFirstLogin})`)

          // Trigger auto-import ONLY for first-time users to avoid unnecessary API calls
          if (dbUser.isFirstLogin) {
            console.log(`🆕 First-time user detected - triggering auto-import of 5 matches`)
            triggerAutoImportBackground(user.id!, accountId, 5)
          } else {
            console.log(`♻️  Returning user - skipping auto-import`)
          }

          return done(null, user)
        } catch (error) {
          console.error('Error saving user to database:', error)
          return done(error, null)
        }
      }
    )
  )

  return passport
}
