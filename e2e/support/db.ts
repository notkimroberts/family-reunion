import postgres from 'postgres'
import { e2eDatabaseUrl } from './env'

/* The tests read and reset the e2e database directly: assertions are on rows, as in the unit tests,
   and every scenario starts from the same seeded reunion. */
export const sql = postgres(e2eDatabaseUrl(process.env.DATABASE_URL ?? ''), { max: 2 })
