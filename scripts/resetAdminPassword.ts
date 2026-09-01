/* Resets an existing admin's password.
   Usage: bun scripts/resetAdminPassword.ts <email> <new-password>

   Thin wrapper: the logic lives in $lib/server/auth/resetPassword, where it is tested against a real
   Postgres. This file only supplies the database client, because a standalone script cannot use
   $env/dynamic/private — the same reason seed.ts and migrate.ts build their own.

   Use this rather than admin:create when the account already exists: that calls signUpEmail, which
   fails outright on a duplicate, so it can bootstrap but cannot recover. */
import { hashPassword, verifyPassword } from 'better-auth/crypto'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../src/lib/server/db/schema'

const MIN_PASSWORD_LENGTH = 8

const [, , email, password] = process.argv

if (!email || !password) {
    console.error('Usage: bun scripts/resetAdminPassword.ts <email> <new-password>')
    process.exit(1)
}

if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
    console.error('DATABASE_URL must be set')
    process.exit(1)
}

const client = postgres(databaseUrl)
const db = drizzle(client, { schema })

const [found] = await db
    .select({ accountId: schema.account.id, userId: schema.user.id, role: schema.user.role })
    .from(schema.user)
    .innerJoin(schema.account, eq(schema.account.userId, schema.user.id))
    .where(and(eq(schema.user.email, email), eq(schema.account.providerId, 'credential')))
    .limit(1)

if (!found) {
    console.error(`No credential account for ${email}. Use admin:create to make one.`)
    await client.end()
    process.exit(1)
}

/* Better Auth's own hasher: the stored format is its to define, and a hash written any other way is
   silently unverifiable at sign-in. Verified before it is written, for the same reason. */
const hash = await hashPassword(password)
if (!(await verifyPassword({ hash, password }))) {
    console.error('Refusing to write: the new hash did not verify')
    await client.end()
    process.exit(1)
}

await db
    .update(schema.account)
    .set({ password: hash, updatedAt: new Date() })
    .where(eq(schema.account.id, found.accountId))

/* Revoked deliberately. Better Auth leaves sessions alive across a password change, which is wrong
   for a reset: if someone else knew the old password, their session outliving it defeats the point. */
const revoked = await db
    .delete(schema.session)
    .where(eq(schema.session.userId, found.userId))
    .returning({ id: schema.session.id })

console.log(`Password reset for ${email} (role=${found.role ?? 'none'})`)
console.log(`Signed out ${revoked.length} existing session(s)`)

await client.end()
