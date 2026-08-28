import { requireAdmin } from '$lib/server/auth/guards'
import { getEventPeople, getRegistrationsForEvent } from '$lib/server/registrations'
import type { PageServerLoad } from './$types'

/* Two lenses on one event, chosen by ?view=. Bookings is the default because chasing money is the
   recurring job; people is what you print, cater and check names against on the day. */
export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    /* Both are loaded on every visit, not one per lens. The status panel's head count needs the
       bookings, and toggling the lens has to be instant — a round trip to swap a table you are already
       looking at reads as a page you broke. Two indexed queries on a few hundred rows. */
    const [registrations, people] = await Promise.all([
        getRegistrationsForEvent(event.params.eventId),
        getEventPeople(event.params.eventId),
    ])

    return { registrations, people }
}
