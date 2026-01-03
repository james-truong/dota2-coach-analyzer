import jwt from 'jsonwebtoken'
import { User } from './databaseService.js'

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret-change-in-production'
const JWT_EXPIRY = '7d' // 7 days

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      steamId: user.steamId,
      accountId: user.accountId,
      displayName: user.displayName,
      avatar: user.avatar,
      profileUrl: user.profileUrl,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  )
}

export function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User
    return decoded
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}
