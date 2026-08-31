import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '../schema'
import { TEST_DB_TEMPLATE_PATH } from './TEST_DB_TEMPLATE_PATH'

/* Applies drizzle/ to an empty PGLite once for the whole run and dumps the result.

   Migrating costs ~650ms; restoring the dump costs ~145ms. Paying the 650ms once and the 145ms per
   test is the difference between a suite that stays under a second and one that does not.

   It runs the REAL migration files, not `push` off the schema. That is the point: a test database
   built from the same SQL production runs is the only one that can disagree with production, and a
   migration that would fail on deploy fails here first. */
export default async function setup() {
    const client = new PGlite()
    await migrate(drizzle(client, { schema }), { migrationsFolder: './drizzle' })

    const dump = await client.dumpDataDir()
    await mkdir(dirname(TEST_DB_TEMPLATE_PATH), { recursive: true })
    await writeFile(TEST_DB_TEMPLATE_PATH, Buffer.from(await dump.arrayBuffer()))
    await client.close()
}
