/* Makes an account the owner (site admin) or an organizer.
   Usage: bun scripts/setAdminRole.ts <email> <owner|organizer>

   Thin wrapper: the logic lives in $lib/server/auth/setUserRole, where it is tested against a real
   Postgres. This file only supplies the database client, because a standalone script cannot use
   $env/dynamic/private.

   On production run it inside the container, where DATABASE_URL resolves:
   railway ssh --service family-reunion-app --environment production -- bun run admin:set-role <email> owner */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { ROLE_BY_NAME, setUserRole, type RoleName } from '../src/lib/server/auth/setUserRole'
import * as schema from '../src/lib/server/db/schema'

const [, , email, roleName] = process.argv

function isRoleName(value: string | undefined): value is RoleName {
    return value !== undefined && Object.hasOwn(ROLE_BY_NAME, value)
}

if (!email || !isRoleName(roleName)) {
    console.error('Usage: bun scripts/setAdminRole.ts <email> <owner|organizer>')
    process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
    console.error('DATABASE_URL must be set')
    process.exit(1)
}

const client = postgres(databaseUrl)
const result = await setUserRole(drizzle(client, { schema }), email, roleName)
await client.end()

if (!result.ok) {
    console.error(`No account for ${email}`)
    process.exit(1)
}

console.log(`${email} is now ${roleName === 'owner' ? 'the owner' : 'an organizer'}`)
console.log(`Signed out ${result.sessionsRevoked} existing session(s)`)
