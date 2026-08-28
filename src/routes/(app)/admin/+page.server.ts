import { redirect } from '@sveltejs/kit'
import { desc, eq } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import type { PageServerLoad } from './$types'

/* /admin is no longer a page. Every admin view is about one reunion, so landing here means "take me to
   the one I am working on" — the open event, else the most recent.

   The old dashboard led with Total Users, a number with no bearing on a reunion, and its three cards
   plus event table were a stop on the way to the registrations list. The numbers that mattered now sit
   beside that list.

   With no events at all, Setup is the only place that can create one, so a fresh production database
   does not dead-end here. /login redirects to /admin, and it is the only entry point into the admin
   area anywhere in the app. */
export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    const [openEvent] = await db
        .select({ id: reunionEvents.id })
        .from(reunionEvents)
        .where(eq(reunionEvents.status, 'open'))
        .orderBy(desc(reunionEvents.year))
        .limit(1)

    if (openEvent) {
        throw redirect(302, `/admin/event/${openEvent.id}/registrations`)
    }

    const [mostRecent] = await db
        .select({ id: reunionEvents.id })
        .from(reunionEvents)
        .orderBy(desc(reunionEvents.year))
        .limit(1)

    if (mostRecent) {
        throw redirect(302, `/admin/event/${mostRecent.id}/registrations`)
    }

    throw redirect(302, '/admin/setup/events')
}
