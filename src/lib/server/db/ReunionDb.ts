import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import type * as schema from './schema'

/* A drizzle handle over the reunion schema, whatever driver is behind it.

   Server modules reach the database through the `db` singleton, but the two callers that cannot —
   a standalone script, which has no $env/dynamic/private, and a test, which supplies PGLite — need
   to pass one in. Narrowing to postgres-js would exclude both. */
export type ReunionDb = PgDatabase<PgQueryResultHKT, typeof schema>
