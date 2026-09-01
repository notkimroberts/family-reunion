import { z } from 'zod'
import { getRequestEvent, query } from '$app/server'
import { requireAdmin } from '$lib/server/auth/guards'
import { searchEventAttendees } from '$lib/server/registrations'

const unlistedInput = z.object({
    eventId: z.string().uuid(),
    search: z.string(),
})

/* The people a search finds who are NOT on the check-in list — unpaid or refunded bookings.

   A query rather than page data because it is keyed on what the greeter typed, and loading every
   pending and refunded attendee up front would ship a list nobody asked for on a phone.

   Guarded in-function for the same reason as the command: /_app/remote/<id> skips route handling, so no
   layout guard covers it, and this returns attendee names and who booked them. */
export const findUnlisted = query(unlistedInput, async ({ eventId, search }) => {
    requireAdmin(getRequestEvent())

    return searchEventAttendees(eventId, search)
})
