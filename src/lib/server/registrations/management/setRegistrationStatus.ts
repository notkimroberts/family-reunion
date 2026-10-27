import { error } from '@sveltejs/kit'
import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrationStatusEnum, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { assertRegistrationMutable } from '../lifecycle'

/* The statuses an organizer may set by hand — the enum minus 'refunded', which must go through
   cancelRegistrationAsAdmin so the money actually goes back. Derived rather than spelled out, so adding a
   status to the enum cannot leave this list silently stale. */
export type AdminSettableStatus = Exclude<
    (typeof registrationStatusEnum.enumValues)[number],
    'refunded'
>

/* Records that a paper registration's money arrived, was waived, or is still outstanding.

   This exists because nothing else could do it. Only fulfillCheckout writes status 'paid', and
   only in response to a Stripe webhook, so a paper registration entered as 'pending' was stuck
   there permanently — with the registrant's own page still reporting payment outstanding — short of
   manual SQL.

   'refunded' is excluded in both directions, on purpose:

   - It cannot be SET here, because that transition has to issue the actual refund. That is
     cancelRegistrationAsAdmin's job; writing the column alone would tell everyone the money went
     back when it did not.
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

    assertRegistrationMutable(
        registration.status,
        'This registration was cancelled and refunded. Ask them to register again rather than reviving it.',
    )

    if (registration.status === params.status) {
        return
    }

    await db.transaction(async (tx) => {
        await tx
            .update(registrations)
            .set({
                status: params.status,
                /* Recorded when the organizer says the money arrived, and CLEARED when they take it
                   back. A registration moved from paid to pending is owed again, and a stale paid date
                   beside a Pending badge is worse than no date — it reads as a payment that has gone
                   missing. Waived gets none: nothing was paid, so there is no payment date to show. */
                paidAt: params.status === 'paid' ? new Date() : null,
                updatedAt: new Date(),
            })
            .where(eq(registrations.id, params.registrationId))

        /* payment_due means "owed now", and only a paid booking has places owed separately: a pending
           one owes its whole total, a waived one is comped. So leaving 'paid' clears it, as it clears
           paidAt — and setting 'paid' again means everyone is paid, not that the old flags return. */
        if (params.status !== 'paid') {
            await tx
                .update(partyMembers)
                .set({ paymentDue: false })
                .where(eq(partyMembers.registrationId, params.registrationId))
        }

        /* Marked paid by hand: the money came by Zelle or check, so no card fee was paid. A public
           checkout snapshots card prices before anyone pays, so an abandoned checkout settled by check
           still held them — "$165.00 + $5.24 card fee" for a family who never used a card, and $5.24
           too much in the money panel. Those places go back to the tier price. Only places no card paid
           for (no payment intent on the member); this booking was not pending → paid by the webhook,
           which never comes through here. */
        if (params.status === 'paid') {
            await tx
                .update(partyMembers)
                .set({
                    priceCents: sql`${partyMembers.priceCents} - ${partyMembers.cardFeeCents}`,
                    cardFeeCents: 0,
                })
                .where(
                    and(
                        eq(partyMembers.registrationId, params.registrationId),
                        isNull(partyMembers.stripePaymentIntentId),
                        gt(partyMembers.cardFeeCents, 0),
                    ),
                )
        }
    })

    dbg.register(
        'admin set registration %s status %s -> %s',
        params.registrationId,
        registration.status,
        params.status,
    )
}
