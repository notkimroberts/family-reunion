import { requireAdmin } from '$lib/server/auth/guards'
import { getEventPeople } from '$lib/server/registrations'
import type { PageServerLoad } from './$types'

/* The door list, and nothing else.

   ONE query, unlike the registrations page's three. This is a page held in one hand at a table with a
   queue in front of it: no money, no gift figures, no Stripe links — partly for speed on venue wifi,
   partly because a column of dollar amounts should not be facing a room full of relatives.

   getEventPeople is paid-and-waived only, which makes the expected total here the same number catering
   ordered against. People who are not on it — an abandoned checkout, a refunded booking — are reachable
   by search through findUnlisted, which can say why they cannot be ticked. */
export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    return { people: await getEventPeople(event.params.eventId) }
}
