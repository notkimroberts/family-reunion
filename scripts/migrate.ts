/* Predeploy migration runner. Replaces `drizzle-kit migrate` directly because its
   CLI spinner writes progress via carriage-return redraws — against a non-TTY
   log pipe (e.g. Railway's), a failure's real error gets overwritten and only
   "exited with code 1" survives. This script logs plainly and never swallows
   the underlying error.

   Also retries the initial connection: a Postgres service that scaled to zero
   only reliably wakes on public-proxy traffic, not the internal DATABASE_URL
   the app uses, so the very first predeploy connection attempt can race a
   still-sleeping database. */
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const CONNECT_RETRY_ATTEMPTS = 10
const CONNECT_RETRY_DELAY_MS = 3000

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
    console.error('DATABASE_URL must be set')
    process.exit(1)
}

const url = new URL(databaseUrl)
url.searchParams.set('options', '-c client_min_messages=warning')

const client = postgres(url.toString(), { max: 1 })
const db = drizzle(client)

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForConnection(): Promise<void> {
    for (let attempt = 1; attempt <= CONNECT_RETRY_ATTEMPTS; attempt++) {
        try {
            await db.execute(sql`select 1`)
            return
        } catch (err) {
            if (attempt === CONNECT_RETRY_ATTEMPTS) {
                throw err
            }
            console.log(
                `Database not reachable yet (attempt ${attempt}/${CONNECT_RETRY_ATTEMPTS}), retrying in ${CONNECT_RETRY_DELAY_MS}ms…`,
            )
            await sleep(CONNECT_RETRY_DELAY_MS)
        }
    }
}

try {
    await waitForConnection()
    await migrate(db, { migrationsFolder: './drizzle' })
    console.log('Migrations applied successfully')
    await client.end()
} catch (err) {
    console.error('Migration failed:')
    console.error(err)
    await client.end()
    process.exit(1)
}
