import { drizzle } from 'drizzle-orm/pglite'
import * as schema from '../schema'

/* The test adapter for $lib/server/db.

   vitest.config.ts aliases `$lib/server/db` to this file, so every module under test imports a REAL
   Postgres — PGLite, in process — instead of a hand-rolled object that pretends to be a query
   builder. Production imports the postgres-js one and is untouched: there is no test branch in
   src/lib/server/db/index.ts and PGLite never reaches the production bundle.

   Two adapters at one seam, which is what makes it a seam rather than indirection.

   This file mirrors the real module's interface — `db` and `getDb` — because the alias has to be a
   drop-in. It deliberately does not construct the database itself: restoring the migrated template
   is async and `db` must stay synchronously importable, so resetTestDb() installs the instance and
   `db` throws a legible error if a test forgot to call it. */
type TestDb = ReturnType<typeof drizzle<typeof schema>>

let current: TestDb | undefined

export function setTestDb(instance: TestDb | undefined): void {
    current = instance
}

export function getDb(): TestDb {
    if (!current) {
        throw new Error(
            'No test database. Call `await resetTestDb()` in beforeEach before exercising code that queries.',
        )
    }
    return current
}

/* Same Proxy shape as the production module, so `db` resolves per property access rather than at
   import time — which is what lets resetTestDb() swap the instance between cases. */
export const db = new Proxy({} as TestDb, {
    get(_, prop: string | symbol) {
        const instance = getDb()
        const value = Reflect.get(instance, prop)
        return typeof value === 'function' ? value.bind(instance) : value
    },
})
