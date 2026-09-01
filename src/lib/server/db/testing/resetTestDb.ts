import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import * as schema from '../schema'
import { TEST_DB_TEMPLATE_PATH } from './TEST_DB_TEMPLATE_PATH'
import { setTestDb } from './pgliteDb'

/* A fresh, empty, fully-migrated database for one test case. Call in beforeEach.

   ONE INSTANCE PER TEST FILE, EMPTIED BY TRUNCATE — not a fresh restore per test.

   The previous version rebuilt a PGlite from the 4.7 MB template on every beforeEach, on the
   reasoning that restoring and truncating both cost ~145ms. Measured, they do not: a restore is
   ~161ms and truncating all eleven public tables is ~7ms. With 294 database-touching tests that
   difference was most of the suite. Worse, each restore left the previous instance open — nothing
   closed it — and every live instance holds ~200 MB, so a worker climbed past 6 GB and the
   contention inflated a 161ms restore into ~660ms inside a full run.

   Vitest isolates per test file, so the module-scoped instance below is created once per file: 26
   restores rather than 294.

   ISOLATION IS UNCHANGED FOR THIS SCHEMA. `TRUNCATE ... RESTART IDENTITY CASCADE` removes every row
   and resets every sequence, which is the whole of what a test can dirty here — nothing in the
   suite issues DDL. THE ONE THING IT DOES NOT UNDO IS DDL: a test that creates, alters or drops
   something must restore the template itself rather than assume this cleaned up after it.

   The table list is discovered from the catalogue, never hardcoded. A migration that adds a table
   has to be truncated automatically or rows start surviving between tests, which presents as
   flakiness somewhere unrelated. Only the `public` schema is touched: drizzle's migration tracker
   lives in its own `drizzle` schema and must survive, since globalSetup's template depends on it.

   Returns the handle so a test can seed and assert directly; the module under test reaches the same
   instance through the aliased `db`. */

let client: PGlite | undefined
let db: ReturnType<typeof drizzle<typeof schema>> | undefined
let truncateAll: string | undefined

async function start() {
    const template = await readFile(TEST_DB_TEMPLATE_PATH)
    client = new PGlite({ loadDataDir: new Blob([template]) })
    db = drizzle(client, { schema })

    const tables = await client.query<{ tablename: string }>(
        `select tablename from pg_tables where schemaname = 'public'`,
    )
    /* Quoted because `user` is a reserved word, and one table is called exactly that. */
    const names = tables.rows.map((row) => `"${row.tablename}"`).join(', ')
    truncateAll = `truncate table ${names} restart identity cascade`
}

export async function resetTestDb() {
    if (!db) {
        await start()
    } else {
        await db.execute(sql.raw(truncateAll!))
    }

    setTestDb(db)
    return db!
}

/* Closes the shared instance. Nothing calls this in a normal run and it is not wired to a setup
   file on purpose: vitest isolates per test file, so the process holding the instance exits with
   the file and the OS reclaims it. A `setupFiles` hook that imported this module was tried and
   reverted — the alias makes `$lib/server/db` and `./pgliteDb` the same module, so importing it
   into every file collided with the four suites that `vi.mock` that path or `$lib/general/constants`
   (auth, api/health, and the two email files).

   Kept exported for a test that needs to force a rebuild, and to make the lifecycle explicit. */
export async function closeTestDb() {
    await client?.close()
    client = undefined
    db = undefined
    truncateAll = undefined
    setTestDb(undefined)
}
