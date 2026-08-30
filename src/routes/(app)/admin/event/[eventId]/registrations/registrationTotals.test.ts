import { describe, it, expect } from 'vitest'
import type { RegistrationSummary } from '$lib/server/registrations'
import { grossUpForStripe, stripeFeeOnChargeCents } from '$lib/utils/stripeFee'
import { getRegistrationTotals } from './registrationTotals'

function reg(overrides: Partial<RegistrationSummary>): RegistrationSummary {
    return {
        id: 'reg-1',
        contactName: 'Alice Patterson',
        contactEmail: 'alice@example.com',
        contactPhone: null,
        status: 'paid',
        stripeSessionId: 'cs_test_1',
        stripePaymentIntentId: 'pi_test_1',
        paidAt: new Date('2026-08-10T00:00:00Z'),
        memberCount: 1,
        totalCents: 16000,
        createdAt: new Date('2026-08-01T00:00:00Z'),
        ...overrides,
    }
}

describe('getRegistrationTotals', () => {
    it('reports zeroes for a year with no registrations', () => {
        expect(getRegistrationTotals([])).toEqual({
            attendingCount: 0,
            partyCount: 0,
            pendingPeopleCount: 0,
            pendingPartyCount: 0,
            paidCents: 0,
            cardPaidCents: 0,
            offlinePaidCents: 0,
            estimatedFeeCents: 0,
            bankedCents: 0,
            outstandingCents: 0,
        })
    })

    /* The panel shows two matched groups, paid-or-covered and not-paid, because a count whose qualifier
       is invisible reads as a miscount: "Parties 4" beside a booking list whose Party column sums to
       every registered person looks like broken maths. This is the arithmetic behind both groups. */
    it('splits people and parties into paid-or-covered and not-paid', () => {
        const totals = getRegistrationTotals([
            reg({ id: 'a', status: 'paid', memberCount: 2 }),
            reg({ id: 'b', status: 'waived', memberCount: 1 }),
            reg({ id: 'c', status: 'pending', memberCount: 4 }),
            reg({ id: 'd', status: 'pending', memberCount: 3 }),
            /* Refunded belongs to NEITHER group — not coming, and nobody is waiting on the money. */
            reg({ id: 'e', status: 'refunded', memberCount: 9 }),
        ])

        expect(totals.attendingCount).toBe(3)
        expect(totals.partyCount).toBe(2)
        expect(totals.pendingPeopleCount).toBe(7)
        expect(totals.pendingPartyCount).toBe(2)
    })

    /* People, not rows: this is the number that decides how many chairs and meals are needed. */
    it('counts party members rather than registrations', () => {
        const totals = getRegistrationTotals([
            reg({ id: 'a', memberCount: 6 }),
            reg({ id: 'b', memberCount: 2 }),
        ])

        expect(totals.attendingCount).toBe(8)
        expect(totals.partyCount).toBe(2)
    })

    /* Waived people are coming, so they are chairs; they brought no money, so they are not revenue.
       Folding them into "collected" would overstate the bank balance. */
    it('counts a waived party as attending but not as money', () => {
        const totals = getRegistrationTotals([
            reg({ id: 'a', status: 'paid', memberCount: 2, totalCents: 32000 }),
            reg({ id: 'b', status: 'waived', memberCount: 3, totalCents: 48000 }),
        ])

        expect(totals.attendingCount).toBe(5)
        expect(totals.paidCents).toBe(32000)
    })

    it.each([
        ['pending', 'pending' as const],
        ['refunded', 'refunded' as const],
    ])('excludes a %s registration from the head count', (_label, status) => {
        const totals = getRegistrationTotals([reg({ status, memberCount: 4 })])

        expect(totals.attendingCount).toBe(0)
        expect(totals.partyCount).toBe(0)
    })

    it('sums outstanding money from pending registrations only', () => {
        const totals = getRegistrationTotals([
            reg({ id: 'a', status: 'pending', totalCents: 16000 }),
            reg({ id: 'b', status: 'pending', totalCents: 10000 }),
            reg({ id: 'c', status: 'refunded', totalCents: 99900 }),
            reg({ id: 'd', status: 'paid', totalCents: 32000 }),
        ])

        expect(totals.outstandingCents).toBe(26000)
        expect(totals.paidCents).toBe(32000)
    })

    /* Both kinds of pending are Not paid — one family thinks their payment failed, the other owes money
       by post — so both are counted here, and the list rows say which is which. */
    it('counts an abandoned checkout and an unpaid paper entry alike as not paid', () => {
        const totals = getRegistrationTotals([
            reg({ id: 'a', status: 'pending', stripeSessionId: 'cs_test_abandoned' }),
            reg({ id: 'b', status: 'pending', stripeSessionId: null }),
            reg({ id: 'c', status: 'paid' }),
        ])

        expect(totals.pendingPartyCount).toBe(2)
    })

    /* The money already went back, so it is not outstanding and the party is not one to chase. */
    it('leaves a refunded registration out of the not-paid group entirely', () => {
        const totals = getRegistrationTotals([reg({ status: 'refunded', totalCents: 99900 })])

        expect(totals.pendingPartyCount).toBe(0)
        expect(totals.pendingPeopleCount).toBe(0)
        expect(totals.outstandingCents).toBe(0)
    })

    /* Collected is what registrants paid; it is not what the reunion can spend. The fee breakdown below
       is the difference, and getting it wrong in the optimistic direction means budgeting money Stripe
       has already taken. */
    describe('fees versus what reaches the bank', () => {
        /* An adult place nets $160, so the card is charged $165.09 and Stripe keeps $5.09. */
        const ADULT_GROSS = grossUpForStripe(16000)

        it('separates card money from cash and cheques', () => {
            const totals = getRegistrationTotals([
                reg({ id: 'a', stripeSessionId: 'cs_1', totalCents: ADULT_GROSS }),
                reg({ id: 'b', stripeSessionId: null, totalCents: 16000 }),
            ])

            expect(totals.cardPaidCents).toBe(ADULT_GROSS)
            expect(totals.offlinePaidCents).toBe(16000)
        })

        /* THE point of the split. Cash never went near Stripe, so no fee may be deducted from it —
           a flat "Collected minus 2.9%" would quietly shrink a year of paper registrations. */
        it('charges no fee against cash or cheques', () => {
            const totals = getRegistrationTotals([
                reg({ id: 'a', stripeSessionId: null, totalCents: 58000 }),
            ])

            expect(totals.estimatedFeeCents).toBe(0)
            expect(totals.bankedCents).toBe(58000)
        })

        /* The gross-up is designed so the org nets the tier price. That is the sum this must reproduce:
           charge $165.09, Stripe keeps $5.09, $160 lands. */
        it('lands the intended net on a single card payment', () => {
            const totals = getRegistrationTotals([
                reg({ stripeSessionId: 'cs_1', totalCents: ADULT_GROSS }),
            ])

            expect(totals.paidCents).toBe(ADULT_GROSS)
            expect(totals.bankedCents).toBe(16000)
        })

        /* 30¢ is charged once per PAYMENT. Deducting it once from the summed total instead would
           undercount the fee by 30¢ for every registration after the first — the error grows with the
           reunion. */
        it('applies the fixed fee once per payment, not once overall', () => {
            const totals = getRegistrationTotals([
                reg({ id: 'a', stripeSessionId: 'cs_1', totalCents: ADULT_GROSS }),
                reg({ id: 'b', stripeSessionId: 'cs_2', totalCents: ADULT_GROSS }),
                reg({ id: 'c', stripeSessionId: 'cs_3', totalCents: ADULT_GROSS }),
            ])

            expect(totals.estimatedFeeCents).toBe(3 * stripeFeeOnChargeCents(ADULT_GROSS))
            /* And strictly more than treating the three as one charge. */
            expect(totals.estimatedFeeCents).toBeGreaterThan(
                stripeFeeOnChargeCents(3 * ADULT_GROSS),
            )
        })

        it('always adds up: collected minus fees equals banked', () => {
            const totals = getRegistrationTotals([
                reg({ id: 'a', stripeSessionId: 'cs_1', totalCents: ADULT_GROSS }),
                reg({ id: 'b', stripeSessionId: 'cs_2', totalCents: 41236 }),
                reg({ id: 'c', stripeSessionId: null, totalCents: 26000 }),
            ])

            expect(totals.cardPaidCents + totals.offlinePaidCents).toBe(totals.paidCents)
            expect(totals.bankedCents).toBe(totals.paidCents - totals.estimatedFeeCents)
        })

        /* Only paid money is counted. A pending card registration has been charged nothing, so it must
           contribute no fee — otherwise the bank figure is reduced by a fee nobody has paid. */
        it('ignores pending, waived and refunded money', () => {
            const totals = getRegistrationTotals([
                reg({ id: 'a', status: 'pending', stripeSessionId: 'cs_1', totalCents: 99900 }),
                reg({ id: 'b', status: 'waived', stripeSessionId: null, totalCents: 48000 }),
                reg({ id: 'c', status: 'refunded', stripeSessionId: 'cs_2', totalCents: 77700 }),
            ])

            expect(totals.cardPaidCents).toBe(0)
            expect(totals.offlinePaidCents).toBe(0)
            expect(totals.estimatedFeeCents).toBe(0)
            expect(totals.bankedCents).toBe(0)
        })

        /* stripeSessionId is the signal, NOT stripePaymentIntentId — that column is null on every
           registration paid before it existed, so keying on it would file real card payments as cash
           and overstate the bank by the whole fee. */
        it('treats a card payment with no recorded intent as card money', () => {
            const totals = getRegistrationTotals([
                reg({
                    stripeSessionId: 'cs_1',
                    stripePaymentIntentId: null,
                    totalCents: ADULT_GROSS,
                }),
            ])

            expect(totals.cardPaidCents).toBe(ADULT_GROSS)
            expect(totals.offlinePaidCents).toBe(0)
            expect(totals.estimatedFeeCents).toBeGreaterThan(0)
        })
    })
})
