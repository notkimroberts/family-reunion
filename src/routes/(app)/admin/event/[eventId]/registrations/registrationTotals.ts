import type { RegistrationSummary } from '$lib/server/registrations'

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
    pendingPeopleCount: number
    pendingPartyCount: number
    outstandingCents: number
}

export function getRegistrationTotals(registrations: RegistrationSummary[]): RegistrationTotals {
    const attending = registrations.filter((r) => r.status === 'paid' || r.status === 'waived')
    const pending = registrations.filter((r) => r.status === 'pending')

    return {
        attendingCount: attending.reduce((sum, r) => sum + r.memberCount, 0),
        partyCount: attending.length,
        paidCents: registrations
            .filter((r) => r.status === 'paid')
            .reduce((sum, r) => sum + r.totalCents, 0),
        pendingPeopleCount: pending.reduce((sum, r) => sum + r.memberCount, 0),
        /* Also the number of registrations to chase. There used to be a separate chaseCount that
           filtered pending rows through getPaymentState for 'cancelled' — but that state only ever comes
           from status 'refunded', which is not pending, so the filter could never remove anything and
           the two numbers were provably identical. One number, one name. */
        pendingPartyCount: pending.length,
        outstandingCents: pending.reduce((sum, r) => sum + r.totalCents, 0),
    }
}
