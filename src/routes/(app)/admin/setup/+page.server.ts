import { requireOwner } from '$lib/server/auth/guards'
import type { PageServerLoad } from './$types'

/* The landing page's links need an event id for the two entries that point into the event subtree.
   currentEventId comes from the admin layout, so nothing is queried here. */
export const load: PageServerLoad = async (event) => {
    requireOwner(event)
    return {}
}
