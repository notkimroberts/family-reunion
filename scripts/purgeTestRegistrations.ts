/* Lists, then with --confirm deletes, every booking and gift paid through Stripe TEST mode — the
   practice registrations from the preview link. Run it before registration opens, or they count in
   the admin totals and in the public "already registered" figure.
   Usage: bun scripts/purgeTestRegistrations.ts [--confirm]

   Thin wrapper: the logic lives in $lib/server/registrations/purgeTestRegistrations, where it is
   tested against a real Postgres. This file only supplies the database client, because a standalone
   script cannot use $env/dynamic/private.

   On production run it inside the container, where DATABASE_URL resolves:
   railway ssh --service family-reunion-app --environment production -- bun run admin:purge-test-registrations */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../src/lib/server/db/schema'
import { purgeTestRegistrations } from '../src/lib/server/registrations/purgeTestRegistrations'
import { formatUsd } from '../src/lib/utils/formatUsd'

const confirm = process.argv.includes('--confirm')

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
    console.error('DATABASE_URL must be set')
    process.exit(1)
}

const client = postgres(databaseUrl)
const result = await purgeTestRegistrations(drizzle(client, { schema }), { confirm })
await client.end()

console.log(`Test-mode bookings: ${result.registrations.length}`)
result.registrations.forEach((registration) => {
    console.log(
        `  ${registration.contactName} <${registration.contactEmail}> (${registration.status})`,
    )
})
console.log(`Test-mode gifts: ${result.donations.length}`)
result.donations.forEach((donation) => {
    console.log(`  ${donation.donorName} ${formatUsd(donation.amountCents)} (${donation.status})`)
})
console.log(
    result.deleted
        ? 'Deleted.'
        : 'Nothing deleted. Run again with --confirm to delete the rows above.',
)
