import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { sumMemberPrices } from '$lib/general/pricing'
import { db } from '$lib/server/db'
import { partyMembers, registrations, reunionEvents } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { getPaidGiftsForRegistration } from '$lib/server/donations'
import { sendCancellationEmail, type RefundRoute } from '$lib/server/email'
import { refundPaymentIntent, retrieveSessionPaymentIntent } from '$lib/server/payments'
import { reportError } from '$lib/server/reportError'
import { markRegistrationRefunded } from '../lifecycle'
import { planRefunds } from './_planRefunds'

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

   Cancelling is now organiser-only, through cancelRegistrationAsAdmin. This was extracted when the
   registrant could also cancel their own booking with nothing but the management link — the two paths
   differed ONLY in how the caller was authorised — and it stays a separate function because that is
   still the right seam: the refund rules, the loud failure, the status write and the email are the
   cancellation, and who may ask for it is not.

   A FAILED REFUND ABORTS THE CANCELLATION. This used to swallow refund errors and mark the
   registration 'refunded' regardless, which meant the admin list, the registrant's own page and the
   confirmation copy all reported that the money had gone back when it had not — the worst available
   outcome, because nothing anywhere disagreed. The contract instead: leave the state alone, raise a
   502, let them retry. Retrying is safe because every refund carries a stable
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

    /* What a full refund would hand back that nobody asked for. A gift is not refunded with the
       booking — the reunion keeps it — but Stripe refunds CHARGES, not line items, so a gift given
       during registration comes back with the party unless the refund is made partial. planRefunds
       is what decides that; every intent carrying no gift is still refunded in full. */
    const gifts = await getPaidGiftsForRegistration(registrationId)
    const planned = planRefunds({ intentIds: intents, members, gifts })

    const results = await Promise.allSettled(
        planned.map((refund) =>
            /* Per-intent idempotency key keyed on the cancellation: a Stripe redelivery or a
               double-click will not issue a second refund. */
            refundPaymentIntent(
                refund.intentId,
                refund.amountCents,
                `cancel-registration-${registrationId}-${refund.intentId}`,
            ),
        ),
    )

    const failed = results
        .map((result, index) => ({ result, intentId: planned[index].intentId }))
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

    for (const refund of planned) {
        dbg.register(
            '%s refund issued for payment_intent=%s',
            refund.amountCents === undefined ? 'full' : 'partial',
            refund.intentId,
        )
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
                /* Named so the donor is not left waiting for money that is not coming: the refund
                   is the places only, and their gift stays with the reunion. Only the gifts on a
                   charge that was actually refunded — a paper entry refunds nothing here. */
                keptDonationCents: gifts.reduce((sum, gift) => sum + gift.amountCents, 0),
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
