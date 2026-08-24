import { json } from '@sveltejs/kit'
import { sql } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { dbg } from '$lib/server/debug'
import type { RequestHandler } from './$types'

/* Bounded retry for the optional DB probe. The Postgres service has "Sleep when inactive"
   enabled, and the internal DATABASE_URL does not reliably wake it, so the first connection
   after an idle period fails and the attempt itself triggers the wake — the observed
   degraded-then-ok on two consecutive refreshes. Observed wake time is ~3s (see the
   predeploy log, which hits the same race). */
const DB_PROBE_ATTEMPTS = 4
const DB_PROBE_DELAY_MS = 1500

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/* Liveness check for Railway's healthcheckPath.

   Deliberately does NOT touch the database. Three reasons, in order of weight:

   1. Predeploy already gates on the database. `bun run db:migrate` runs before the server
      starts, retries the connection for ~30s, and fails the deploy loudly if the DB is
      unreachable. A second DB gate here is redundant with a better-placed one.
   2. The DB sleeps when inactive. A health check that opens a connection would fail during
      the cold-start race and could block promotion of a good deployment — and if Railway
      polls the path periodically, it would hold the DB awake and defeat the sleep setting.
   3. Refusing to promote a deployment because the DB is down gains nothing: the deployment
      it would keep serving has exactly the same DB.

   Pass ?probe=db to check the database explicitly, with retry so a sleeping DB reports
   'ok' rather than a misleading 'unreachable'. Use that for debugging, not as the
   healthcheckPath. */
export const GET: RequestHandler = async ({ url }) => {
    if (url.searchParams.get('probe') !== 'db') {
        return json({ status: 'ok' })
    }

    for (let attempt = 1; attempt <= DB_PROBE_ATTEMPTS; attempt++) {
        try {
            await db.execute(sql`select 1`)
            return json({ status: 'ok', database: 'ok', attempts: attempt })
        } catch (err) {
            if (attempt === DB_PROBE_ATTEMPTS) {
                dbg.hooks('db probe failed after %d attempts: %o', attempt, err)
                return json(
                    { status: 'ok', database: 'unreachable', attempts: attempt },
                    { status: 503 },
                )
            }
            await sleep(DB_PROBE_DELAY_MS)
        }
    }

    /* Unreachable: the loop either returns or exhausts into the branch above. */
    return json({ status: 'ok', database: 'unknown' })
}
