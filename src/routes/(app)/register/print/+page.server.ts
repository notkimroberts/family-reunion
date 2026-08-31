import { getOpenEvent } from '$lib/server/registrations'
import { getTiersForEvent } from '$lib/server/tiers'
import type { PageServerLoad } from './$types'

/* Same two reads as the register page's load, so the tiers and prices on paper are the ones the
   online form is charging. No form: this page collects nothing and posts nowhere — a filled-in
   sheet is typed into /admin/event/[eventId]/registrations/new. */
export const load: PageServerLoad = async () => {
    const openEvent = await getOpenEvent()
    const tiers = openEvent ? await getTiersForEvent(openEvent.id) : []

    return {
        event: openEvent,
        tiers: tiers.map(({ id, label, priceCents }) => ({ id, label, priceCents })),
    }
}
