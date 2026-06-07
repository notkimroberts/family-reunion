import { desc } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async (event) => {
    const user = requireAdmin(event)
    const events = await db.select().from(reunionEvents).orderBy(desc(reunionEvents.year))
    return { user, events }
}
