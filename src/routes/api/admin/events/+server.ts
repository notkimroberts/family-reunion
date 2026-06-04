import { json } from '@sveltejs/kit'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import type { RequestHandler } from './$types'

// All reunion events ordered by year
export const GET: RequestHandler = async (event) => {
    requireAdmin(event)
    const events = await db.select().from(reunionEvents).orderBy(reunionEvents.year)
    return json(events)
}
