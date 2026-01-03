// Environment variable validation on startup
export function validateEnvironment(): void {
  const errors: string[] = []
  const warnings: string[] = []

  // Required variables
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required')
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    errors.push('ANTHROPIC_API_KEY is required')
  }

  if (!process.env.SESSION_SECRET) {
    errors.push('SESSION_SECRET is required')
  }

  if (!process.env.STEAM_API_KEY) {
    errors.push('STEAM_API_KEY is required for Steam authentication')
  }

  // Recommended variables
  if (!process.env.OPENDOTA_API_KEY) {
    warnings.push('OPENDOTA_API_KEY not set - you will be limited to 60 requests/min (get a free key at https://www.opendota.com/api-keys)')
  }

  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    warnings.push('JWT_SECRET not set - using SESSION_SECRET as fallback (recommended to set a separate JWT_SECRET)')
  }

  // Print results
  console.log('\n🔍 Environment Variable Validation:')

  if (errors.length > 0) {
    console.error('\n❌ CRITICAL ERRORS:')
    errors.forEach(err => console.error(`  - ${err}`))
    console.error('\n💡 Add these to your .env file\n')
    process.exit(1)
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  WARNINGS:')
    warnings.forEach(warn => console.warn(`  - ${warn}`))
  }

  console.log('✅ All required environment variables are set\n')
}
