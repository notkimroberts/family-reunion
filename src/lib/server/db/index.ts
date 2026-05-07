import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '$env/dynamic/private'
import { dbg } from '$lib/server/debug'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle<typeof schema>>

export function getDb() {
    if (!_db) {
        dbg.db('initializing postgres connection')
        const client = postgres(env.DATABASE_URL!)
        _db = drizzle(client, { schema })
        dbg.db('postgres connection established')
    }
    return _db
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
    get(_, prop) {
        return (getDb() as any)[prop]
    },
})
