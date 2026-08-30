import { env } from '$env/dynamic/private'
import { requireAdmin } from '$lib/server/auth/guards'
import { isOwner } from '$lib/server/auth/isOwner'
import { getEventSummaries } from '$lib/server/registrations'
import type { PageServerLoad } from './$types'

/* /admin is the way in — /login sends you here, and it is the only entry point into the admin area
   anywhere in the app. It lists the reunions, and nothing else.

   It was briefly a redirect straight to the open event's registrations, which was wrong twice over: it
   made the other years invisible, so there was no way to see that 2025 collected more than 2027 is
   collecting, and it made the sign-in destination depend on which event happens to be open — a state that
   changes twice a year. Landing on the list is one extra click and no guessing.

   There is no create action here any more. Adding a year is /admin/event/new — a page, not a panel that
   expanded above the cards you were reading. This load keeps `isOwner` only to decide whether to offer
   the link; the route it points at guards itself. */
export const load: PageServerLoad = async (event) => {
    const user = requireAdmin(event)

    return {
        events: await getEventSummaries(),
        /* Hiding is not the protection — /admin/event/new calls requireOwner in its load and in its
           action. This only stops advertising a door that will not open. */
        isOwner: isOwner(user, env.OWNER_EMAIL),
    }
}
