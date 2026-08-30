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
    /* Stripe's cut, ESTIMATED at 2.9% + 30¢ per charge — see stripeFeeOnChargeCents for why it can
       only ever be an estimate, and why it is a floor rather than a guess in either direction. */
    estimatedFeeCents: number
    /* Collected minus the estimated fees: the money that ends up in the reunion's hands. Cheques still
       have to be deposited; nothing here knows whether that has happened. */
    bankedCents: number
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

    const cardPaidCents = cardPaid.reduce((sum, r) => sum + r.totalCents, 0)
    const offlinePaidCents = offlinePaid.reduce((sum, r) => sum + r.totalCents, 0)
    /* Per registration, not on the total: the 30¢ is charged once per payment, so one deduction from
       the summed cents would undercount it by 30¢ for every registration after the first. */
    const estimatedFeeCents = cardPaid.reduce(
        (sum, r) => sum + stripeFeeOnChargeCents(r.totalCents),
        0,
    )

    return {
        cardPaidCents,
        offlinePaidCents,
        estimatedFeeCents,
        bankedCents: cardPaidCents + offlinePaidCents - estimatedFeeCents,
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
