import type { RegistrationSummary } from '$lib/server/registrations'
import { getPaymentState } from '$lib/utils'

/* What a year adds up to, for the panel beside the registrations list.

   A pure function rather than a set of $derived expressions in the page, so the arithmetic that an
   organiser will read off a screen and repeat on a phone call is testable.

   'People coming' counts party MEMBERS of paid and waived registrations — a party of six is one row and
   six chairs, and the number that matters for catering is the six. A pending registration is nobody
   yet, and a refunded one is nobody any more. */
export type RegistrationTotals = {
    attendingCount: number
    partyCount: number
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
