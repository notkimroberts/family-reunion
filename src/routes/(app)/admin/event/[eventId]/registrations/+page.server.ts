import { requireAdmin } from '$lib/server/auth/guards'
import { getRegistrationsForEvent } from '$lib/server/registrations'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    /* The event is in the path now, so there is nothing to resolve and no `hasEvent` case to handle —
       the parent layout has already 404'd an id that does not exist.

       What this replaces: the old version read ?eventId and fell through open → most recent, while the
       shell treated the same absent param as "all years". Two files disagreeing about what no filter
       meant is why clicking Registrations and then Attendees silently widened from one event to every
       year, with the pills still highlighting "All years". */
    const registrations = await getRegistrationsForEvent(event.params.eventId)

    return { registrations }
}
