import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import { getPublicDonationTotal } from '$lib/server/donations'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    /* Only what the page renders. The page is public, and `metadata` is the program content that
       /program keeps behind the login — page data is readable in the source whether or not it renders. */
    const events = await db
        .select({
            id: reunionEvents.id,
            title: reunionEvents.title,
            startDate: reunionEvents.startDate,
            endDate: reunionEvents.endDate,
            registrationOpensAt: reunionEvents.registrationOpensAt,
            registrationLockDate: reunionEvents.registrationLockDate,
        })
        .from(reunionEvents)
        .where(eq(reunionEvents.status, 'open'))

    if (events.length === 0) {
        return { event: null, raised: { totalCents: 0, giftCount: 0 } }
    }

    const event = events[0]

    const raised = await getPublicDonationTotal(event.id)

    return { event, raised }
}
