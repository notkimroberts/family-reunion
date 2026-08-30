import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { readFile } from 'node:fs/promises'
import * as schema from '../schema'
import { TEST_DB_TEMPLATE_PATH } from './TEST_DB_TEMPLATE_PATH'
import { setTestDb } from './pgliteDb'

/* A fresh, empty, fully-migrated database for one test case. Call in beforeEach.

   Restoring the template rather than truncating: both cost ~145ms, and a restore cannot leave a
   sequence, an enum or a stray row behind. Returns the handle so a test can seed and assert
   directly; the module under test reaches the same instance through the aliased `db`. */
export async function resetTestDb() {
    const template = await readFile(TEST_DB_TEMPLATE_PATH)
    const client = new PGlite({ loadDataDir: new Blob([template]) })
    const db = drizzle(client, { schema })
    setTestDb(db)
    return db
}
