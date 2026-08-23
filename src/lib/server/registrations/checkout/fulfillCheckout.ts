import { and, eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { sendRegistrationConfirmation } from '$lib/server/email'
import { decodeSessionMetadata } from '$lib/server/payments'
import { parseBirthDate } from '$lib/utils/age'
/* Relative import, not the $lib/server/registrations barrel: that barrel re-exports this
   folder, so going through it would be a circular import. */
import { getConfirmationEmailData } from '../queries'

/* Webhook handler: branches on metadata.type to either insert an add_member row or mark the registration 'paid'; confirmation email is sent outside the transaction so a send failure never rolls back payment. Stripe redelivers checkout.session.completed on transient failures, so both branches are idempotent — add_member dedupes on paymentIntent, and the registration branch transitions pending → paid conditionally. The confirmation email additionally carries a Resend idempotency key. */
export async function fulfillCheckout(
    session: Stripe.Checkout.Session,
    origin: string,
): Promise<void> {
    const paymentIntentId =
        typeof session.payment_intent === 'string' ? session.payment_intent : null

    const metadata = decodeSessionMetadata(session.metadata)
    if (!metadata) {
        dbg.stripe('checkout.session.completed but no/invalid metadata')
        return
    }

    if (metadata.type === 'add_member') {
        const { registrationId, memberName, memberTierLabel, memberBirthDate, memberShirtSize } =
            metadata
        const memberPriceCents = parseInt(metadata.memberPriceCents, 10)

        dbg.stripe('add_member registrationId=%s member=%s', registrationId, memberName)

        /* Reject add_member on a refunded registration — token may still be valid but the
           registration is closed. Caller should have caught this server-side; this is a
           defense for the case where state changed between checkout creation and webhook. */
        const [parent] = await db
            .select({ status: registrations.status })
            .from(registrations)
            .where(eq(registrations.id, registrationId))
            .limit(1)
        if (!parent) {
            dbg.stripe('add_member webhook for missing registration %s; ignoring', registrationId)
            return
        }
        if (parent.status !== 'paid' && parent.status !== 'waived') {
            dbg.stripe(
                'add_member webhook for registration %s in status=%s; ignoring',
                registrationId,
                parent.status,
            )
            return
        }

        /* Idempotency: Stripe retries deliver the same paymentIntent. Skip insert if already present. */
        if (paymentIntentId) {
            const [existing] = await db
                .select({ id: partyMembers.id })
                .from(partyMembers)
                .where(
                    and(
                        eq(partyMembers.registrationId, registrationId),
                        eq(partyMembers.stripePaymentIntentId, paymentIntentId),
                        eq(partyMembers.name, memberName),
                    ),
                )
                .limit(1)
            if (existing) {
                dbg.stripe('add_member redelivery; party_member already exists id=%s', existing.id)
                return
            }
        }

        await db.transaction(async (tx) => {
            const parsed = memberBirthDate ? parseBirthDate(memberBirthDate) : null
            await tx.insert(partyMembers).values({
                registrationId,
                name: memberName,
                birthYear: parsed?.birthYear ?? null,
                birthMonth: parsed?.birthMonth ?? null,
                birthDay: parsed?.birthDay ?? null,
                shirtSize: memberShirtSize || null,
                addressLine1: metadata.memberAddressLine1 || null,
                addressLine2: metadata.memberAddressLine2 || null,
                addressCity: metadata.memberAddressCity || null,
                addressState: metadata.memberAddressState || null,
                addressZip: metadata.memberAddressZip || null,
                vegetarianMeal:
                    metadata.memberVegetarianMeal === ''
                        ? null
                        : metadata.memberVegetarianMeal === 'true',
                attendedReunion2025:
                    metadata.memberAttendedReunion2025 === ''
                        ? null
                        : metadata.memberAttendedReunion2025 === 'true',
                tierLabel: memberTierLabel,
                priceCents: memberPriceCents,
                stripePaymentIntentId: paymentIntentId,
            })
            await tx
                .update(registrations)
                .set({ updatedAt: new Date() })
                .where(eq(registrations.id, registrationId))
        })
        return
    }

    const { registrationId, managementToken } = metadata

    dbg.stripe('checkout.session.completed registrationId=%s', registrationId)

    /* Conditional pending → paid transition. Doing it in one statement makes concurrent
       Stripe redeliveries serialise: exactly one matches and returns a row, so exactly one
       confirmation email is sent. An unconditional update would re-send on every redelivery.
       'pending' is the only legal source state — a waived or refunded registration must not
       be flipped by a stray webhook. */
    const updated = await db
        .update(registrations)
        .set({ status: 'paid', updatedAt: new Date() })
        .where(and(eq(registrations.id, registrationId), eq(registrations.status, 'pending')))
        .returning({ id: registrations.id })

    if (updated.length === 0) {
        /* Nothing matched: either the row is gone, or it was not pending. Distinguish the two
           so an orphaned charge stays loud while a routine redelivery stays quiet. */
        const [existing] = await db
            .select({ status: registrations.status })
            .from(registrations)
            .where(eq(registrations.id, registrationId))
            .limit(1)

        if (!existing) {
            dbg.stripe(
                'ORPHAN PAYMENT: webhook for registrationId=%s but no DB row exists. Stripe charge is captured.',
                registrationId,
            )
            return
        }

        dbg.stripe(
            'checkout.session.completed for registration=%s status=%s; already fulfilled, ignoring',
            registrationId,
            existing.status,
        )
        return
    }

    if (paymentIntentId) {
        await db
            .update(partyMembers)
            .set({ stripePaymentIntentId: paymentIntentId })
            .where(eq(partyMembers.registrationId, registrationId))
        dbg.stripe('backfilled payment_intent on party members for registration %s', registrationId)
    }

    /* Email outside the transaction — a transient email failure should not roll back payment.
       Plaintext token came through Stripe metadata; the DB only ever holds the hash. */
    const manageUrl = `${origin}/register/manage?token=${managementToken}`
    const confirmation = await getConfirmationEmailData({ registrationId, manageUrl })
    if (!confirmation) {
        dbg.stripe('no confirmation data for registration %s; skipping email', registrationId)
        return
    }

    dbg.stripe('sending confirmation email for registration %s', registrationId)
    try {
        await sendRegistrationConfirmation(
            confirmation.to,
            confirmation.data,
            `confirm/${registrationId}`,
        )
    } catch (err) {
        dbg.stripe('confirmation email failed for registration %s: %o', registrationId, err)
    }
}
