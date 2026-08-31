import { and, eq, sql } from 'drizzle-orm'
import type Stripe from 'stripe'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { sendRegistrationConfirmation } from '$lib/server/email'
import { decodeSessionMetadata, retrievePaymentFee } from '$lib/server/payments'
import { reportError } from '$lib/server/reportError'
/* Relative import, not the $lib/server/registrations barrel: that barrel re-exports this
   folder, so going through it would be a circular import. */
import { getConfirmationEmailData } from '../queries'
import { buildPartyMemberRow } from './buildPartyMemberRow'

/* Stripe metadata carries the two yes/no answers as strings: 'true', 'false', or '' for
   unanswered. Undefined rather than null for the unanswered case, so buildPartyMemberRow's
   `?? null` is the single place that decides how "no answer" is stored. */
function decodeMetadataFlag(value: string | undefined): boolean | undefined {
    return value === '' ? undefined : value === 'true'
}

/* Webhook handler: branches on metadata.type to either insert an add_member row or mark the registration 'paid'; confirmation email is sent outside the transaction so a send failure never rolls back payment. Stripe redelivers checkout.session.completed on transient failures, so both branches are idempotent at the database level — add_member relies on a UNIQUE index over the checkout session id, and the registration branch on a conditional pending → paid transition. Neither uses a read-then-insert, which a concurrent redelivery could pass. The confirmation email additionally carries a Resend idempotency key. */
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
        /* Read before the transaction: it is a network call to Stripe and must not hold a DB
           transaction open. Undefined when the fee could not be read, which leaves the column alone. */
        const feeCents = paymentIntentId ? await retrievePaymentFee(paymentIntentId) : undefined
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
                           registrant just paid. */
                        priceCents: memberPriceCents,
                        stripePaymentIntentId: paymentIntentId,
                        stripeCheckoutSessionId: session.id,
                    }),
                )
                .onConflictDoNothing({ target: partyMembers.stripeCheckoutSessionId })
                .returning({ id: partyMembers.id })

            /* Only touch the parent when a row was actually added — on a redelivery nothing
               about the registration has changed.

               The fee is ADDED here rather than assigned: this is a second charge on a registration
               that already paid one fee for its initial checkout. coalesce covers the rows that
               predate the column, so the first add_member on an old registration still lands a value
               instead of adding to null. Inside the same guard as updatedAt, so the unique index on
               stripe_checkout_session_id — which is what rejects a redelivered insert — is also what
               stops the fee being counted twice. */
            if (rows.length > 0) {
                await tx
                    .update(registrations)
                    .set({
                        updatedAt: new Date(),
                        ...(feeCents === undefined
                            ? {}
                            : {
                                  stripeFeeCents: sql`coalesce(${registrations.stripeFeeCents}, 0) + ${feeCents}`,
                              }),
                    })
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
        }
        return
    }

    const { registrationId, managementToken } = metadata

    dbg.stripe('checkout.session.completed registrationId=%s', registrationId)

    /* Conditional pending → paid transition. Doing it in one statement makes concurrent
       Stripe redeliveries serialise: exactly one matches and returns a row, so exactly one
       confirmation email is sent. An unconditional update would re-send on every redelivery.
       'pending' is the only legal source state — a waived or refunded registration must not
       be flipped by a stray webhook. */
    /* Read before the update for the same reason as above, and because the update is the conditional
       transition that must stay a single statement. */
    const registrationFeeCents = paymentIntentId
        ? await retrievePaymentFee(paymentIntentId)
        : undefined

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
            /* Assigned, not accumulated: this is the registration's first charge, and the conditional
               pending -> paid transition below means exactly one redelivery can reach this line.
               Later add_member charges accumulate on top of it. */
            ...(registrationFeeCents === undefined ? {} : { stripeFeeCents: registrationFeeCents }),
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
        /* Deliberately not rethrown: the payment is captured and the row is correct, and a 500
           here would make Stripe retry an event whose DB work is already done. But the
           conditional pending -> paid transition means a redelivery will NOT re-attempt this
           send, so this is the only attempt — it has to reach a human. */
        reportError('confirmation email failed', err, { registrationId })
    }
}
