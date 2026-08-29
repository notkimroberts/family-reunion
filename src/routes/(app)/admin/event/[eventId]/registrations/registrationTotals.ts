import type { RegistrationSummary } from '$lib/server/registrations'
import { getPaymentState } from '$lib/utils'

/* What a year adds up to, for the panel beside the registrations list.

   A pure function rather than a set of $derived expressions in the page, so the arithmetic that an
   organiser will read off a screen and repeat on a phone call is testable.

   'Coming' counts party MEMBERS of paid and waived registrations — a party of six is one row and six
   chairs, and the number that matters for catering is the six. A pending registration is nobody yet, and
   a refunded one is nobody any more.

   pendingPeopleCount and pendingPartyCount exist so the panel can SAY that. Beside a list of eleven
   bookings, "Parties 4" reads as a miscount unless something on screen explains that four is the paid
   ones — and the Party column in that same list sums to every registered person, paid or not. Counts
   whose qualifier is invisible get read as bugs. */
export type RegistrationTotals = {
    attendingCount: number
    partyCount: number
    pendingPeopleCount: number
    pendingPartyCount: number
    paidCents: number
    outstandingCents: number
    chaseCount: number
}

export function getRegistrationTotals(registrations: RegistrationSummary[]): RegistrationTotals {
    const attending = registrations.filter((r) => r.status === 'paid' || r.status === 'waived')
    const pending = registrations.filter((r) => r.status === 'pending')

    return {
        attendingCount: attending.reduce((sum, r) => sum + r.memberCount, 0),
        partyCount: attending.length,
        pendingPeopleCount: pending.reduce((sum, r) => sum + r.memberCount, 0),
        pendingPartyCount: pending.length,
        /* Only 'paid' — a waived place brings in no money, so folding it in here would overstate what
           has actually been collected. */
        paidCents: registrations
            .filter((r) => r.status === 'paid')
            .reduce((sum, r) => sum + r.totalCents, 0),
        outstandingCents: pending.reduce((sum, r) => sum + r.totalCents, 0),
        /* Every pending registration needs a follow-up; getPaymentState only decides WHICH one, and the
           list rows say so individually. */
        chaseCount: pending.filter((r) => getPaymentState(r) !== 'cancelled').length,
    }
}
