import { desc } from 'drizzle-orm'
import { env } from '$env/dynamic/private'
import { requireAdmin } from '$lib/server/auth/guards'
import { isOwner } from '$lib/server/auth/isOwner'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async (event) => {
    const user = requireAdmin(event)

    /* Only the four columns the shell renders. The previous bare .select() shipped every whole row —
       venue, menu, drinks, schedule, recommendedSites and recommendedActivities JSONB —
       to the browser on every admin page load. It was invisible because the context type only declared
       four fields. */
    const events = await db
        .select({
            id: reunionEvents.id,
            year: reunionEvents.year,
            title: reunionEvents.title,
            status: reunionEvents.status,
        })
        .from(reunionEvents)
        .orderBy(desc(reunionEvents.year))

    /* No currentEventId any more. It answered "which event do the links point at when the URL does not
       name one", which was only ever a question for the Setup pages — every remaining admin route
       except /admin has the id in its path, and /admin is a list of all of them. It cost a second
       query on every admin page load to resolve an event nothing then used. */
    return {
        user,
        events,
        /* Drives whether the registrations page offers the Event settings link. The server still
           guards the settings load and every action there — this only stops advertising a door that
           will not open. */
        isOwner: isOwner(user, env.OWNER_EMAIL),
    }
}
