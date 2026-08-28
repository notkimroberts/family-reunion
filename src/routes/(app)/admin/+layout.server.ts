import { desc, eq } from 'drizzle-orm'
import { env } from '$env/dynamic/private'
import { requireAdmin } from '$lib/server/auth/guards'
import { isOwner } from '$lib/server/auth/isOwner'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async (event) => {
    const user = requireAdmin(event)

    /* Only the four columns the shell renders. The previous bare .select() shipped every whole row —
       venue, menu, drinks, schedule, recommendedSites, recommendedActivities and shopProducts JSONB —
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

    /* Which event the Organizer links point at when the URL does not name one — every Setup page, and
       /admin itself. Open first because only one event can be open at a time (the one_open_event
       partial unique index), so it is unambiguous; most recent as the fallback for between years. */
    const [openEvent] = await db
        .select({ id: reunionEvents.id })
        .from(reunionEvents)
        .where(eq(reunionEvents.status, 'open'))
        .orderBy(desc(reunionEvents.year))
        .limit(1)

    return {
        user,
        events,
        currentEventId: openEvent?.id ?? events[0]?.id,
        /* Drives whether the header renders the Setup pill at all. The server still guards every Setup
           load, action and remote function — this only stops advertising a door that will not open. */
        isOwner: isOwner(user, env.OWNER_EMAIL),
    }
}
