import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'

/* The statuses an organiser may set by hand. */
export type AdminSettableStatus = 'pending' | 'paid' | 'waived'

/* Records that a paper registration's money arrived, was waived, or is still outstanding.

   This exists because nothing else could do it. Only fulfillCheckout writes status 'paid', and
   only in response to a Stripe webhook, so a paper registration entered as 'pending' was stuck
   there permanently — with the registrant's manage page still reporting payment outstanding and
   add-a-member refused — short of manual SQL.

   'refunded' is excluded in both directions, on purpose:

   - It cannot be SET here, because that transition has to issue the actual refund. That is
     cancelRegistration's job; writing the column alone would tell everyone the money went back
     when it did not.
   - It cannot be moved AWAY from here, because a cancelled-and-refunded party would be silently
     revived into a paid one whose money is gone. Re-registering is the correct route. */
export async function setRegistrationStatus(params: {
    registrationId: string
    status: AdminSettableStatus
}): Promise<void> {
    const [registration] = await db
        .select({ status: registrations.status })
        .from(registrations)
        .where(eq(registrations.id, params.registrationId))
        .limit(1)

    if (!registration) {
        throw error(404, 'Registration not found')
    }

    if (registration.status === 'refunded') {
        throw error(
            409,
            'This registration was cancelled and refunded. Ask them to register again rather than reviving it.',
        )
    }

    if (registration.status === params.status) {
        return
    }

    await db
        .update(registrations)
        .set({ status: params.status, updatedAt: new Date() })
        .where(eq(registrations.id, params.registrationId))

    dbg.register(
        'admin set registration %s status %s -> %s',
        params.registrationId,
        registration.status,
        params.status,
    )
}
