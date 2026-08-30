import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { sumMemberPrices } from '$lib/general/pricing'
import { db } from '$lib/server/db'
import { partyMembers, registrations, reunionEvents } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { sendCancellationEmail, type RefundRoute } from '$lib/server/email'
import { refundPaymentIntent, retrieveSessionPaymentIntent } from '$lib/server/payments'
import { reportError } from '$lib/server/reportError'
import { markRegistrationRefunded } from '../lifecycle'

/* Where the money goes back, read off the registration rather than guessed.

   'paid' with a Stripe session means Checkout took a card payment, so the refund is automatic.
   'paid' with no session is a cheque or cash handed to an organiser: nothing to refund through
   Stripe, and the email must say so instead of promising a refund that will never arrive. */
function getRefundRoute(registration: {
    status: string
    stripeSessionId: string | null
}): RefundRoute {
    if (registration.status === 'waived') {
        return 'waived'
    }
    if (registration.status !== 'paid') {
        return 'nothing_paid'
    }
    return registration.stripeSessionId ? 'stripe' : 'by_hand'
}

/* Refunds, marks 'refunded', and emails the registrant — the whole cancellation, minus the question of
   who is allowed to ask for it.

   Shared by the registrant's own cancel (token-gated, cancelRegistration) and the organiser's
   (admin-guarded, cancelRegistrationAsAdmin). Extracted because the two differ ONLY in how the caller
   is authorised: the refund rules, the loud failure, the status write and the email are identical, and
   an organiser cancelling a card payment must refund it exactly as the registrant's own cancel does.
   Duplicating this would have been the second copy of the refund logic to drift.

   A FAILED REFUND ABORTS THE CANCELLATION. This used to swallow refund errors and mark the
   registration 'refunded' regardless, which meant the admin list, the registrant's own page and the
   confirmation copy all reported that the money had gone back when it had not — the worst available
   outcome, because nothing anywhere disagreed. removeMember already had the right contract: leave the
   state alone, raise a 502, let them retry. Retrying is safe because every refund carries a stable
   per-intent idempotency key, so Stripe returns the original refund rather than issuing a second.

   A partial failure across several intents does leave money returned on a registration that is still
   marked paid. That is unavoidable once one refund of several fails, and it is why the error is loud:
   the retry finishes the remainder, and Sentry names the intents that did not go through.

   The email is the one step allowed to fail quietly. By the time it is sent the refund has settled and
   the status is written; throwing here would report a failed cancellation that in fact succeeded, and
   a retry would then find the registration already refunded. So it is reported and the function
   returns — the inverse of /register/recover, which must not commit until its mail is away. */
export async function _performCancellation(
    registration: {
        id: string
        eventId: string
        status: string
        stripeSessionId: string | null
        contactName: string
        contactEmail: string
    },
    registerUrl: string,
): Promise<void> {
    const registrationId = registration.id

    const members = await db
        .select({
            name: partyMembers.name,
            priceCents: partyMembers.priceCents,
            stripePaymentIntentId: partyMembers.stripePaymentIntentId,
        })
        .from(partyMembers)
        .where(eq(partyMembers.registrationId, registrationId))

    const uniqueIntents = new Set<string>()
    for (const member of members) {
        if (member.stripePaymentIntentId) {
            uniqueIntents.add(member.stripePaymentIntentId)
        }
    }

    if (uniqueIntents.size === 0 && registration.stripeSessionId) {
        try {
            const intentId = await retrieveSessionPaymentIntent(registration.stripeSessionId)
            if (intentId) {
                uniqueIntents.add(intentId)
            }
        } catch (err) {
            reportError('could not retrieve payment intent to cancel registration', err, {
                registrationId,
                stripeSessionId: registration.stripeSessionId,
            })
        }
    }

    const refundRoute = getRefundRoute(registration)

    /* Money definitely arrived through Stripe and we cannot find it. Cancelling now would mark the
       registration refunded with no refund issued anywhere — silent, and unrecoverable without
       reading the Stripe dashboard by hand. An unpaid registration reaching this point is normal:
       an abandoned checkout has a session and no payment, and there is nothing to send back. */
    if (refundRoute === 'stripe' && uniqueIntents.size === 0) {
        reportError(
            'paid registration has no payment intent to refund',
            new Error('no payment intent found for paid registration'),
            { registrationId, stripeSessionId: registration.stripeSessionId },
        )
        throw error(
            502,
            'We could not find the payment for this registration, so it has not been cancelled. Please contact us and we will sort it out.',
        )
    }

    const intents = Array.from(uniqueIntents)
    const results = await Promise.allSettled(
        intents.map((intentId) =>
            /* Per-intent idempotency key keyed on the cancellation: a Stripe redelivery or a
               double-click will not issue a second refund. */
            refundPaymentIntent(
                intentId,
                undefined,
                `cancel-registration-${registrationId}-${intentId}`,
            ),
        ),
    )

    const failed = results
        .map((result, index) => ({ result, intentId: intents[index] }))
        .filter((entry) => entry.result.status === 'rejected')

    if (failed.length > 0) {
        for (const entry of failed) {
            reportError(
                'refund failed while cancelling registration',
                entry.result.status === 'rejected' ? entry.result.reason : undefined,
                { registrationId, paymentIntentId: entry.intentId },
            )
        }
        throw error(
            502,
            'The refund did not go through, so nothing has been cancelled. Please try again.',
        )
    }

    for (const intentId of intents) {
        dbg.register('full refund issued for payment_intent=%s', intentId)
    }

    await markRegistrationRefunded(registrationId)

    dbg.register('registration %s cancelled and refunded', registrationId)

    const [reunionEvent] = await db
        .select({ title: reunionEvents.title })
        .from(reunionEvents)
        .where(eq(reunionEvents.id, registration.eventId))
        .limit(1)

    try {
        await sendCancellationEmail(
            registration.contactEmail,
            {
                name: registration.contactName,
                eventTitle: reunionEvent?.title ?? 'the reunion',
                partyNames: members.map((member) => member.name),
                totalCents: sumMemberPrices(members),
                refundRoute,
                registerUrl,
            },
            `cancel/${registrationId}`,
        )
    } catch (err) {
        reportError('cancellation email failed to send', err, {
            registrationId,
            to: registration.contactEmail,
        })
    }
}
