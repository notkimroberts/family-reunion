import { getOpenEvent } from '$lib/server/registrations'
import { getTiersForEvent } from '$lib/server/tiers'
import type { PageServerLoad } from './$types'

/* Prices and dates come from the open event, so an answer cannot disagree with the form. Only what the
   page renders: `metadata` is the program content /program keeps behind the login. */
export const load: PageServerLoad = async () => {
    const openEvent = await getOpenEvent()
    if (!openEvent) {
        return { event: undefined, tiers: [] }
    }

    const tiers = await getTiersForEvent(openEvent.id)

    return {
        event: {
            startDate: openEvent.startDate,
            endDate: openEvent.endDate,
            registrationLockDate: openEvent.registrationLockDate,
        },
        tiers: tiers.map(({ id, label, priceCents }) => ({ id, label, priceCents })),
    }
}
