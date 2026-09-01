/* Resets an existing admin's password.
   Usage: bun scripts/resetAdminPassword.ts <email> <new-password>

   Thin wrapper: the logic lives in $lib/server/auth/resetPassword, where it is tested against a real
   Postgres and against the sign-in endpoint itself. This file only supplies the database client,
   because a standalone script cannot use $env/dynamic/private — the same reason seed.ts and
   migrate.ts build their own.

   Use this rather than admin:create when the account already exists: that calls signUpEmail, which
   fails outright on a duplicate, so it can bootstrap but cannot recover. */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { MIN_PASSWORD_LENGTH, resetPassword } from '../src/lib/server/auth/resetPassword'
import * as schema from '../src/lib/server/db/schema'

const [, , email, password] = process.argv

if (!email || !password) {
    console.error('Usage: bun scripts/resetAdminPassword.ts <email> <new-password>')
    process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
    console.error('DATABASE_URL must be set')
    process.exit(1)
}

const client = postgres(databaseUrl)
const result = await resetPassword(drizzle(client, { schema }), email, password)
await client.end()

if (!result.ok) {
    const messages = {
        'no-account': `No credential account for ${email}. Use admin:create to make one.`,
        'too-short': `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        'hash-unverifiable': 'Refusing to write: the new hash did not verify',
    }
    console.error(messages[result.reason])
    process.exit(1)
}

console.log(`Password reset for ${email} (role=${result.role ?? 'none'})`)
console.log(`Signed out ${result.sessionsRevoked} existing session(s)`)
