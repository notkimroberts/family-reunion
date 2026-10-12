/* Removes an admin's 2FA enrolment, after a lost phone AND lost backup codes.
   Usage: bun scripts/resetAdminTwoFactor.ts <email>

   Thin wrapper: the logic lives in $lib/server/auth/resetTwoFactor, where it is tested against a real
   Postgres and the sign-in endpoint. This file only supplies the database client, because a
   standalone script cannot use $env/dynamic/private.

   On production run it inside the container, where DATABASE_URL resolves:
   railway ssh --service family-reunion-app --environment production -- bun run admin:reset-2fa <email> */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { resetTwoFactor } from '../src/lib/server/auth/resetTwoFactor'
import * as schema from '../src/lib/server/db/schema'

const [, , email] = process.argv

if (!email) {
    console.error('Usage: bun scripts/resetAdminTwoFactor.ts <email>')
    process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
    console.error('DATABASE_URL must be set')
    process.exit(1)
}

const client = postgres(databaseUrl)
const result = await resetTwoFactor(drizzle(client, { schema }), email)
await client.end()

if (!result.ok) {
    console.error(`No account for ${email}`)
    process.exit(1)
}

console.log(`2FA removed for ${email}. The next sign-in sets it up again.`)
console.log(`Signed out ${result.sessionsRevoked} existing session(s)`)
