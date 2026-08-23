import { json } from '@sveltejs/kit'
import { sql } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { dbg } from '$lib/server/debug'
import type { RequestHandler } from './$types'

/* Railway's healthcheckPath points here. It checks the database too, not just that the
   process is listening: an instance that boots with an unreachable DB serves errors on every
   page, and without this Railway would happily replace a working deployment with it.

   Public by necessity — Railway's checker carries no session. It returns no detail beyond
   ok/degraded, so it leaks nothing about the deployment. */
export const GET: RequestHandler = async () => {
    try {
        await db.execute(sql`select 1`)
        return json({ status: 'ok' })
    } catch (err) {
        dbg.hooks('health check failed: %o', err)
        return json({ status: 'degraded' }, { status: 503 })
    }
}
