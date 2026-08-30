import type { RegistrationSummary } from '$lib/server/registrations'
import { stripeFeeOnChargeCents } from '$lib/utils/stripeFee'

/* What a year adds up to, for the panel beside the registrations list.

   A pure function rather than a set of $derived expressions in the page, so the arithmetic that an
   organiser will read off a screen and repeat on a phone call is testable.

   Two matched groups, paid-or-covered and not-paid, because a count whose qualifier is invisible gets
   read as a bug: "Parties 4" beside a list of eleven bookings — whose Party column sums to every
   registered person — looks like broken maths until something on screen says the four are the settled
   ones.

   People counts party MEMBERS, not rows. A party of six is one booking and six chairs, and six is the
   number catering needs.

   Refunded belongs to neither group. Those people are not coming and nobody is waiting on their money. */
export type RegistrationTotals = {
    /* Paid AND waived: both have a place. */
    attendingCount: number
    partyCount: number
    /* Paid only — a waived place brings in no money, so folding it in would overstate the bank. */
    paidCents: number
    /* What registrants paid, split by how it arrived, because only one side of it loses a fee.

       Card money is charged gross and arrives short. Cash and cheques arrive whole, so counting them
       through the fee formula would invent a deduction Stripe never made — which is exactly what a
       single "Collected minus 2.9%" line would have done to a year of paper registrations. */
    cardPaidCents: number
    offlinePaidCents: number
    /* Stripe's cut on the money still held. Real where the webhook recorded it, falling back to the
       2.9% + 30¢ estimate for rows that predate the column or whose balance transaction could not be
       read — see stripeFeeOnChargeCents. */
    feeCents: number
    /* The fees on CANCELLED card bookings, which is money gone.

       Stripe does not return the processing fee when a charge is refunded: the refund is its own
       balance transaction with fee 0, so a $165.09 booking refunded in full costs $5.09 that never
       comes back. Refunded registrations are excluded from every other figure here — nobody is coming
       and no money is owed — which left this loss invisible in a panel whose job is to say what the
       reunion has. */
    lostToRefundsCents: number
    /* Collected, minus the fees on it, minus the fees lost to cancellations: what a bank statement
       will show. Cheques still have to be deposited; nothing here knows whether that has happened. */
    bankedCents: number
    /* False when any contributing figure came from the estimate, so the panel can stop claiming
       precision it does not have. */
    feesAreExact: boolean
    pendingPeopleCount: number
    pendingPartyCount: number
    outstandingCents: number
}

export function getRegistrationTotals(registrations: RegistrationSummary[]): RegistrationTotals {
    const attending = registrations.filter((r) => r.status === 'paid' || r.status === 'waived')
    const pending = registrations.filter((r) => r.status === 'pending')
    const paid = registrations.filter((r) => r.status === 'paid')

    /* The Stripe session is what says a card was involved — the same signal getPaymentState uses to tell
       paid_online from paid_offline. NOT stripePaymentIntentId: that is null on every registration paid
       before the column existed, so keying on it would silently reclassify real card payments as cash
       and overstate the bank. */
    const cardPaid = paid.filter((r) => r.stripeSessionId !== null)
    const offlinePaid = paid.filter((r) => r.stripeSessionId === null)

    /* Cancelled bookings that went through Stripe. Their fee is the loss; a cancelled cheque
       registration costs nothing, because Stripe never touched it. */
    const cardRefunded = registrations.filter(
        (r) => r.status === 'refunded' && r.stripeSessionId !== null,
    )

    const cardPaidCents = cardPaid.reduce((sum, r) => sum + r.totalCents, 0)
    const offlinePaidCents = offlinePaid.reduce((sum, r) => sum + r.totalCents, 0)

    /* The recorded fee when there is one, the estimate when there is not. Per registration either
       way, never on the summed total: the 30¢ is charged once per PAYMENT, so a single deduction from
       the sum would undercount by 30¢ for every registration after the first.

       `?? undefined` before the nullish check because the column is `number | null` and 0 is a real
       fee — a truthiness test here would silently re-estimate a genuinely free charge. */
    const feeOf = (registration: RegistrationSummary) =>
        registration.stripeFeeCents ?? stripeFeeOnChargeCents(registration.totalCents)

    const feeCents = cardPaid.reduce((sum, r) => sum + feeOf(r), 0)
    const lostToRefundsCents = cardRefunded.reduce((sum, r) => sum + feeOf(r), 0)

    return {
        cardPaidCents,
        offlinePaidCents,
        feeCents,
        lostToRefundsCents,
        bankedCents: cardPaidCents + offlinePaidCents - feeCents - lostToRefundsCents,
        feesAreExact: [...cardPaid, ...cardRefunded].every((r) => r.stripeFeeCents !== null),
        attendingCount: attending.reduce((sum, r) => sum + r.memberCount, 0),
        partyCount: attending.length,
        /* The same money as the two lines above, added up rather than re-filtered, so "Collected" and
           its own breakdown cannot drift apart by a cent. */
        paidCents: cardPaidCents + offlinePaidCents,
        pendingPeopleCount: pending.reduce((sum, r) => sum + r.memberCount, 0),
        /* Also the number of registrations to chase. There used to be a separate chaseCount that
           filtered pending rows through getPaymentState for 'cancelled' — but that state only ever comes
           from status 'refunded', which is not pending, so the filter could never remove anything and
           the two numbers were provably identical. One number, one name. */
        pendingPartyCount: pending.length,
        outstandingCents: pending.reduce((sum, r) => sum + r.totalCents, 0),
    }
}
