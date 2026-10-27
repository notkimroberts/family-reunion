import { and, eq, inArray, sql } from 'drizzle-orm'
import type Stripe from 'stripe'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { retrievePaymentFee, type MemberPaymentSessionMetadata } from '$lib/server/payments'
import { reportError } from '$lib/server/reportError'
import { addedChargeFee } from './_addedChargeFee'
import { sendConfirmation } from './_sendConfirmation'

/* Webhook branch for a card payment of the places still owed on a paid booking (/register/pay).

   Each member is settled by a conditional UPDATE on payment_due = true, which is what makes a Stripe
   redelivery harmless: the second delivery matches no row, so it adds no fee and sends no email. The
   rows are updated in a fixed order inside one transaction, so two concurrent deliveries lock them in
   the same order and the second finds nothing left to settle.

   The member's price becomes the gross that was CHARGED, and the payment intent is recorded on the
   member. Both matter at cancellation: _performCancellation refunds every intent it finds on the
   party, and planRefunds reads these prices as the line items that charge carried.

   A charge for someone no longer owed is not an error Stripe can fix by retrying: the organizer
   recorded a check, removed the person, or cancelled or re-statused the booking (both clear the flag)
   while the payer was on Stripe's page.
   The money is captured either way, so it is reported to Sentry with the intent to refund by hand,
   and the webhook still answers 200. */
export async function fulfillMemberPayment(params: {
    session: Stripe.Checkout.Session
    metadata: MemberPaymentSessionMetadata
    paymentIntentId: string | null
    origin: string
}): Promise<void> {
    const { session, metadata, paymentIntentId } = params
    const { registrationId, charges } = metadata
    const context = { registrationId, stripeSessionId: session.id, paymentIntentId }

    dbg.stripe('member_payment registrationId=%s members=%d', registrationId, charges.length)

    /* Read before the transaction: a network call to Stripe must not hold one open. Undefined when
       the fee could not be read, which leaves the column alone. */
    const feeCents = paymentIntentId ? await retrievePaymentFee(paymentIntentId) : undefined

    const ordered = [...charges].sort((a, b) => a.memberId.localeCompare(b.memberId))

    const settledIds = await db.transaction(async (tx) => {
        const settled: string[] = []
        for (const charge of ordered) {
            const rows = await tx
                .update(partyMembers)
                .set({
                    paymentDue: false,
                    /* SET reads the row as it was, so this is the gross less the net still stored. */
                    cardFeeCents: sql`${charge.grossCents} - ${partyMembers.priceCents}`,
                    priceCents: charge.grossCents,
                    stripePaymentIntentId: paymentIntentId,
                })
                .where(
                    and(
                        eq(partyMembers.id, charge.memberId),
                        eq(partyMembers.registrationId, registrationId),
                        eq(partyMembers.paymentDue, true),
                    ),
                )
                .returning({ id: partyMembers.id })
            settled.push(...rows.map((row) => row.id))
        }

        /* Inside the same guard as the settlement, so a redelivery that settles nobody cannot
           count the fee twice. */
        if (settled.length > 0) {
            await tx
                .update(registrations)
                .set(addedChargeFee(feeCents))
                .where(eq(registrations.id, registrationId))
        }
        return settled
    })

    const unsettledIds = charges
        .map((charge) => charge.memberId)
        .filter((memberId) => !settledIds.includes(memberId))

    if (unsettledIds.length > 0 && paymentIntentId) {
        /* Rows this same payment settled on an earlier delivery carry its intent. Anything else was
           paid for twice, or for someone who has gone. */
        const alreadySettled = await db
            .select({ id: partyMembers.id })
            .from(partyMembers)
            .where(
                and(
                    inArray(partyMembers.id, unsettledIds),
                    eq(partyMembers.stripePaymentIntentId, paymentIntentId),
                ),
            )
        const orphanedIds = unsettledIds.filter(
            (memberId) => !alreadySettled.some((row) => row.id === memberId),
        )
        if (orphanedIds.length > 0) {
            reportError(
                'card payment covered people who no longer owed anything; refund their share by hand',
                new Error(`${orphanedIds.length} member(s) not owed at fulfillment`),
                { ...context, memberIds: orphanedIds.join(',') },
            )
        }
    }

    if (settledIds.length === 0) {
        dbg.stripe('member_payment for session %s settled nobody; not emailing', session.id)
        return
    }

    dbg.stripe('member_payment settled %d member(s) on %s', settledIds.length, registrationId)

    /* Outside the transaction, as on the registration branch: a failed send must not roll back a
       captured payment. */
    await sendConfirmation({
        registrationId,
        viewUrl: `${params.origin}/register/view?token=${metadata.viewToken}`,
        idempotencyKey: `member-payment/${session.id}`,
    })
}
