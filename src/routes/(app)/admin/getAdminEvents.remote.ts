import { desc } from 'drizzle-orm'
import { query } from '$app/server'
import { getRequestEvent } from '$app/server'
import { requireOwner } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import type { ReunionEvent } from './types'

/* Every reunion year, newest first. Owner-only: remote functions bypass route handling entirely, so
   this guard is the only thing protecting the data.

   DESC deliberately, matching the admin layout's own event query and the header's year switcher — it
   used to be ASC here and DESC there, so the Setup table and the switcher listed years in opposite
   directions. */
export const getAdminEvents = query(async (): Promise<ReunionEvent[]> => {
    requireOwner(getRequestEvent())
    return db
        .select({
            id: reunionEvents.id,
            title: reunionEvents.title,
            year: reunionEvents.year,
            status: reunionEvents.status,
            startDate: reunionEvents.startDate,
            endDate: reunionEvents.endDate,
        })
        .from(reunionEvents)
        .orderBy(desc(reunionEvents.year))
})
