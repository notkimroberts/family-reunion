import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { donations, partyMembers, registrations, stripeFees } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'

export type FeeRecording = 'recorded' | 'already-recorded' | 'no-match'

/* Counts Stripe's fee for one payment, once.

   The fee belongs to whatever the payment paid for, found by its payment intent:
   - a booking — its first charge (registrations.stripe_payment_intent_id) or a later one for people
     added to it (party_members.stripe_payment_intent_id). ADDED to the booking's fee, since each
     charge pays its own 2.9% + 30¢; coalesce covers a booking with none yet. A gift given with a
     booking shares that charge, so its fee lands here too and never on the gift.
   - a standalone gift (a donation with no registration) — assigned, since a gift is one charge.

   The stripe_fees row, inserted in the same transaction, is the once: a second call for the same
   intent inserts nothing and adds nothing, whether it is a redelivery or the other of the two paths
   that read the fee (fulfillment and charge.updated).

   'no-match' writes nothing, not even the stripe_fees row: charge.updated can arrive before the
   fulfillment that records the intent, and the fulfillment then calls this again and finds it. */
export async function recordPaymentFee(
    paymentIntentId: string,
    feeCents: number,
): Promise<FeeRecording> {
    return db.transaction(async (tx) => {
        const [booking] = await tx
            .select({ id: registrations.id })
            .from(registrations)
            .where(eq(registrations.stripePaymentIntentId, paymentIntentId))
            .limit(1)
        const [member] = booking
            ? []
            : await tx
                  .select({ registrationId: partyMembers.registrationId })
                  .from(partyMembers)
                  .where(eq(partyMembers.stripePaymentIntentId, paymentIntentId))
                  .limit(1)
        const registrationId = booking?.id ?? member?.registrationId
        const [gift] = registrationId
            ? []
            : await tx
                  .select({ id: donations.id })
                  .from(donations)
                  .where(
                      and(
                          eq(donations.stripePaymentIntentId, paymentIntentId),
                          isNull(donations.registrationId),
                      ),
                  )
                  .limit(1)

        if (!registrationId && !gift) {
            dbg.stripe('fee for %s matches no booking or gift yet', paymentIntentId)
            return 'no-match'
        }

        const inserted = await tx
            .insert(stripeFees)
            .values({ paymentIntentId, feeCents })
            .onConflictDoNothing({ target: stripeFees.paymentIntentId })
            .returning({ paymentIntentId: stripeFees.paymentIntentId })
        if (inserted.length === 0) {
            return 'already-recorded'
        }

        if (registrationId) {
            await tx
                .update(registrations)
                .set({
                    stripeFeeCents: sql`coalesce(${registrations.stripeFeeCents}, 0) + ${feeCents}`,
                })
                .where(eq(registrations.id, registrationId))
        } else if (gift) {
            await tx
                .update(donations)
                .set({ stripeFeeCents: feeCents })
                .where(eq(donations.id, gift.id))
        }
        dbg.stripe('recorded fee %d for %s', feeCents, paymentIntentId)
        return 'recorded'
    })
}
