import { desc } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import { getOpenEvent, getRegistrationsForEvent } from '$lib/server/registrations'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    /* The admin shell's year filter drives which event's registrations are listed. 'all' has no
       meaningful single list here, so it falls back to the open event, then the most recent. */
    const selected = event.url.searchParams.get('eventId')

    const openEvent = await getOpenEvent()
    const targetEventId =
        selected ??
        openEvent?.id ??
        (await db.select().from(reunionEvents).orderBy(desc(reunionEvents.year)).limit(1))[0]?.id

    const registrations = targetEventId ? await getRegistrationsForEvent(targetEventId) : []

    return { registrations, hasEvent: Boolean(targetEventId) }
}
