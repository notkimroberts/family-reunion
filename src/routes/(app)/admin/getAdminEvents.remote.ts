import { query } from '$app/server'
import { getRequestEvent } from '$app/server'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import type { ReunionEvent } from './types'

// All reunion events ordered by year; admin-only
export const getAdminEvents = query(async (): Promise<ReunionEvent[]> => {
    requireAdmin(getRequestEvent())
    return db.select().from(reunionEvents).orderBy(reunionEvents.year)
})
