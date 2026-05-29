import type { Logger } from 'drizzle-orm/logger'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '$env/dynamic/private'
import { dbg } from '$lib/server/debug'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle<typeof schema>>

class DebugLogger implements Logger {
    logQuery(query: string, params: unknown[]): void {
        dbg.db({ query, params })
    }
}

export function getDb() {
    const { DATABASE_LOG, DATABASE_URL } = env
    if (!DATABASE_URL) {
        throw new Error('Missing DATABASE_URL')
    }
    if (!_db) {
        dbg.db('initializing postgres connection')
        const client = postgres(DATABASE_URL!)
        _db = drizzle(client, {
            schema,
            logger: DATABASE_LOG === 'true' ? new DebugLogger() : undefined,
        })
        dbg.db('postgres connection established')
    }
    return _db
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
    get(_, prop) {
        const inst = getDb()
        const val = (inst as any)[prop]
        return typeof val === 'function' ? val.bind(inst) : val
    },
})
