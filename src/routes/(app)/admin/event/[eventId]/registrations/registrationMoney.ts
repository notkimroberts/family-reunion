import { stripeFeeOnChargeCents } from '$lib/utils/stripeFee'

/* What one registration is worth, what Stripe took out of it, and what is left.

   Shared by the money panel beside the list and the money card on the registration itself, so the two
   cannot disagree about a single booking. The panel sums these; the detail page prints one.

   THE BUG THIS EXISTS TO FIX. The panel used to treat "has a Stripe session" as "a card was charged".
   It is not: createPendingRegistration writes stripeSessionId the moment Checkout opens, while the
   registration is still 'pending' and before anyone has typed a card number. Every abandoned checkout
   therefore carries a session. Cancelling one marks it 'refunded' and refunds nothing —
   _performCancellation says so in as many words — and the panel then estimated 2.9% + 30¢ on it and
   reported that as money lost to refunds. A registration that never took a penny was shown costing the
   reunion eight dollars. */

/* The columns any caller must supply. Deliberately a structural shape rather than RegistrationSummary:
   the detail page holds a full `registrations` row and the list holds a summary, and both satisfy
   this. */
export type RegistrationMoneyInput = {
    status: 'pending' | 'paid' | 'waived' | 'refunded'
    stripeSessionId: string | null
    stripePaymentIntentId: string | null
    stripeFeeCents: number | null
    paidAt: Date | null
    totalCents: number
}

export type RegistrationMoney = {
    /* The sum of the snapshotted member prices — what the party is worth, whoever paid or did not. */
    totalCents: number
    /* Whether a card was really charged, as opposed to a Checkout session merely having been opened. */
    wasCharged: boolean
    /* Stripe's cut on that charge. Zero when there was no charge. */
    feeCents: number
    /* False when feeCents is the 2.9% + 30¢ estimate rather than the figure the webhook recorded. */
    feeIsExact: boolean
    /* What the reunion keeps from this registration. Zero unless it is paid: pending money has not
       arrived, waived money never will, and refunded money has gone back. */
    netCents: number
    /* The fee on a cancelled card booking. Stripe does not return its fee on a refund — the refund is
       its own balance transaction with fee 0 — so this is money gone with nobody attending. */
    lostFeeCents: number
}

/* Evidence that money actually moved, rather than that Checkout was merely opened.

   All three signals are written by the Stripe webhook and only by it, so any one of them means
   checkout.session.completed fired. A 'paid' row with a session is taken at face value without them,
   which is the deliberate asymmetry: those three columns are all newer than the app, so demanding
   evidence would reclassify genuinely-paid older rows as cash and OVERSTATE the bank. On a refunded
   row the same demand understates a loss by one fee, which is the safer of the two errors — and is
   the error this whole function exists to stop making in the opposite direction. */
function wasCardCharged(registration: RegistrationMoneyInput): boolean {
    if (registration.stripeSessionId === null) {
        return false
    }
    if (registration.status === 'paid') {
        return true
    }
    if (registration.status === 'refunded') {
        return (
            registration.paidAt !== null ||
            registration.stripePaymentIntentId !== null ||
            registration.stripeFeeCents !== null
        )
    }
    /* pending: the session is open and nothing has been taken. waived: nothing was ever going to be. */
    return false
}

export function getRegistrationMoney(registration: RegistrationMoneyInput): RegistrationMoney {
    const wasCharged = wasCardCharged(registration)

    /* The recorded fee when there is one, the estimate when there is not. `?? undefined` semantics
       matter: the column is `number | null` and 0 is a real fee, so a truthiness test here would
       silently re-estimate a genuinely free charge. */
    const feeCents = wasCharged
        ? (registration.stripeFeeCents ?? stripeFeeOnChargeCents(registration.totalCents))
        : 0

    const refunded = registration.status === 'refunded'

    return {
        totalCents: registration.totalCents,
        wasCharged,
        feeCents,
        /* Vacuously exact when there is no fee — nothing was estimated. */
        feeIsExact: !wasCharged || registration.stripeFeeCents !== null,
        netCents: registration.status === 'paid' ? registration.totalCents - feeCents : 0,
        lostFeeCents: refunded ? feeCents : 0,
    }
}
