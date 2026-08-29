import { requireAdmin } from '$lib/server/auth/guards'
import { getEventSummaries } from '$lib/server/registrations'
import type { PageServerLoad } from './$types'

/* /admin is the way in — /login sends you here, and it is the only entry point into the admin area
   anywhere in the app. It lists the reunions.

   It was briefly a redirect straight to the open event's registrations, which was wrong twice over: it
   made the other years invisible, so there was no way to see that 2025 collected more than 2027 is
   collecting, and it made the sign-in destination depend on which event happens to be open — a state that
   changes twice a year. Landing on the list is one extra click and no guessing.

   With no events at all the page says so and points at Setup, which is the only place a year can be
   created, so a fresh production database does not dead-end. */
export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    return { events: await getEventSummaries() }
}
