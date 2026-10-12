/* Bootstraps an organizer account. Make it the owner afterward with `bun run admin:set-role`. */
/* Usage: bun scripts/createAdmin.ts <email> <password> [name] */
/* DATABASE_URL must be set; BETTER_AUTH_URL is optional (any string works for offline signup). */
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { ORGANIZER_ROLE } from '../src/lib/general/constants/ORGANIZER_ROLE'
import * as schema from '../src/lib/server/db/schema'

const [, , email, password, nameArg] = process.argv

if (!email || !password) {
    console.error('Usage: bun scripts/createAdmin.ts <email> <password> [name]')
    process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
    console.error('DATABASE_URL must be set')
    process.exit(1)
}

const client = postgres(databaseUrl)
const db = drizzle(client, { schema })

const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:5173',
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    emailAndPassword: { enabled: true },
})

const name = nameArg ?? email.split('@')[0]

const result = await auth.api.signUpEmail({
    body: { email, password, name },
})

const userId = result.user.id

await db.update(schema.user).set({ role: ORGANIZER_ROLE }).where(eq(schema.user.id, userId))

console.log(`Organizer created: ${email} (id=${userId})`)
await client.end()
