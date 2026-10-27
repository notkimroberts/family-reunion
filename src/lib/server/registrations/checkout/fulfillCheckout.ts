import { and, eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { fulfillDonation, markDonationPaid } from '$lib/server/donations'
import { settlePaymentFee } from '$lib/server/fees'
import { decodeSessionMetadata } from '$lib/server/payments'
import { netBeforeGrossUp } from '$lib/utils/stripeFee'
import { fulfillMemberPayment } from './_fulfillMemberPayment'
import { sendConfirmation } from './_sendConfirmation'
import { buildPartyMemberRow } from './buildPartyMemberRow'

/* Stripe metadata carries the two yes/no answers as strings: 'true', 'false', or '' for
   unanswered. Undefined rather than null for the unanswered case, so buildPartyMemberRow's
   `?? null` is the single place that decides how "no answer" is stored. */
function decodeMetadataFlag(value: string | undefined): boolean | undefined {
    return value === '' ? undefined : value === 'true'
}

/* Webhook handler: branches on metadata.type to settle a donation, settle owed members (member_payment), insert an add_member row or mark the registration 'paid'; confirmation email is sent outside the transaction so a send failure never rolls back payment. Stripe redelivers checkout.session.completed on transient failures, so both branches are idempotent at the database level — add_member relies on a UNIQUE index over the checkout session id, and the registration branch on a conditional pending → paid transition. Neither uses a read-then-insert, which a concurrent redelivery could pass. The confirmation email additionally carries a Resend idempotency key. */
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

    /* A gift given on its own at /donate. Its whole fulfillment is the donation module's — nothing
       here concerns a registration. */
    if (metadata.type === 'donation') {
        await fulfillDonation(metadata.donationId, paymentIntentId, origin)
        return
    }

    /* The places an organizer added to a paid booking, paid by card from /register/pay. */
    if (metadata.type === 'member_payment') {
        await fulfillMemberPayment({ session, metadata, paymentIntentId, origin })
        return
    }

    /* NOTHING CREATES an add_member session any more — self-service add-a-member was removed with the
       rest of the registrant's mutations, and createAddMemberCheckout went with it. This branch stays
       for sessions Stripe may still redeliver: one created before the removal, or one abandoned then
       completed. Deleting it would drop a real payment on the floor. */
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

        /* Atomic idempotency. The UNIQUE index on stripe_checkout_session_id lets the database
           reject a redelivered insert, replacing a read-then-insert that two concurrent
           deliveries could both pass — and that was skipped entirely when payment_intent was
           null, leaving no guard at all on that path.

           Transition note: add_member rows created before this column existed have it NULL, so
           a redelivery of one of those is not deduped by this key. Stripe only redelivers within
           a few days and no live add_member charges predate this change. */
        const inserted = await db.transaction(async (tx) => {
            const rows = await tx
                .insert(partyMembers)
                .values(
                    buildPartyMemberRow({
                        registrationId,
                        member: {
                            name: memberName,
                            birthDate: memberBirthDate,
                            shirtSize: memberShirtSize,
                            addressLine1: metadata.memberAddressLine1,
                            addressLine2: metadata.memberAddressLine2,
                            addressCity: metadata.memberAddressCity,
                            addressState: metadata.memberAddressState,
                            addressZip: metadata.memberAddressZip,
                            /* Stripe metadata is strings only, so the two yes/no answers arrive as
                               'true' / 'false' / '' — the empty string meaning unanswered. Decoded
                               here rather than in buildPartyMemberRow: this is the only path whose
                               source is Stripe, and the other three already hold booleans. */
                            vegetarianMeal: decodeMetadataFlag(metadata.memberVegetarianMeal),
                            attendedReunion2025: decodeMetadataFlag(
                                metadata.memberAttendedReunion2025,
                            ),
                        },
                        tierLabel: memberTierLabel,
                        /* Grossed up already: this price came off the Checkout session the
                           registrant just paid. The session carried no net, so the fee inside it
                           is recovered once, here at the write. */
                        priceCents: memberPriceCents,
                        cardFeeCents: memberPriceCents - netBeforeGrossUp(memberPriceCents),
                        stripePaymentIntentId: paymentIntentId,
                        stripeCheckoutSessionId: session.id,
                    }),
                )
                .onConflictDoNothing({ target: partyMembers.stripeCheckoutSessionId })
                .returning({ id: partyMembers.id })

            /* Only touch the parent when a row was actually added — on a redelivery nothing
               about the registration has changed. Stripe's fee for this second charge is recorded
               after the transaction (settlePaymentFee), once per payment intent. */
            if (rows.length > 0) {
                await tx
                    .update(registrations)
                    .set({ updatedAt: new Date() })
                    .where(eq(registrations.id, registrationId))
            }
            return rows
        })

        if (inserted.length === 0) {
            dbg.stripe(
                'add_member redelivery for session %s; party_member already exists, ignoring',
                session.id,
            )
        } else {
            dbg.stripe('add_member inserted party_member id=%s', inserted[0].id)
            if (paymentIntentId) {
                await settlePaymentFee(paymentIntentId)
            }
        }
        return
    }

    const { registrationId, viewToken } = metadata

    dbg.stripe('checkout.session.completed registrationId=%s', registrationId)

    /* Conditional pending → paid transition. Doing it in one statement makes concurrent
       Stripe redeliveries serialize: exactly one matches and returns a row, so exactly one
       confirmation email is sent. An unconditional update would re-send on every redelivery.
       'pending' is the only legal source state — a waived or refunded registration must not
       be flipped by a stray webhook. */
    const updated = await db
        .update(registrations)
        .set({
            status: 'paid',
            /* When the money arrived. updatedAt cannot answer that later — any edit bumps it — and this
               webhook writes no audit row, so without this column there is no record of the payment date
               at all. */
            paidAt: new Date(),
            /* The registration's own copy of the intent, which is what the admin list deep-links to the
               Stripe dashboard with. party_members gets its own copy below, but that one is per-member
               and null for anyone who did not pay online. */
            stripePaymentIntentId: paymentIntentId,
            updatedAt: new Date(),
        })
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
        /* Usually 'unavailable' here: Stripe attaches the balance transaction about three seconds
           after this event, and charge.updated records it then. Tried now as well, because
           charge.updated can arrive first and find no booking with this intent yet. */
        await settlePaymentFee(paymentIntentId)
    }

    /* A gift paid on the same checkout. Inside the branch that only a successful pending -> paid
       transition reaches, so a redelivery cannot mark it twice.

       No fee on the gift: this charge has ONE balance transaction, and recordPaymentFee puts it on
       the registration. Writing it here too would count Stripe's cut twice across the two figures.

       No separate receipt either — the confirmation email names the gift. */
    if (metadata.donationId) {
        await markDonationPaid({
            donationId: metadata.donationId,
            stripePaymentIntentId: paymentIntentId,
        })
        dbg.stripe(
            'marked donation %s paid with registration %s',
            metadata.donationId,
            registrationId,
        )
    }

    /* Email outside the transaction — a transient email failure should not roll back payment.
       Plaintext token came through Stripe metadata; the DB only ever holds the hash. */
    await sendConfirmation({
        registrationId,
        viewUrl: `${origin}/register/view?token=${viewToken}`,
        idempotencyKey: `confirm/${registrationId}`,
    })
}
