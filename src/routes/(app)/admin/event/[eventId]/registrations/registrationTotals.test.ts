import { describe, it, expect } from 'vitest'
import type { RegistrationSummary } from '$lib/server/registrations'
import { getRegistrationTotals } from './registrationTotals'

function reg(overrides: Partial<RegistrationSummary>): RegistrationSummary {
    return {
        id: 'reg-1',
        contactName: 'Alice Patterson',
        contactEmail: 'alice@example.com',
        contactPhone: null,
        status: 'paid',
        stripeSessionId: 'cs_test_1',
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
            paidCents: 0,
            outstandingCents: 0,
            chaseCount: 0,
        })
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

    /* Both kinds of pending need chasing — one family thinks their payment failed, the other owes money
       by post — so both are counted, and the list rows say which is which. */
    it('counts both an abandoned checkout and an unpaid paper entry as needing chasing', () => {
        const totals = getRegistrationTotals([
            reg({ id: 'a', status: 'pending', stripeSessionId: 'cs_test_abandoned' }),
            reg({ id: 'b', status: 'pending', stripeSessionId: null }),
            reg({ id: 'c', status: 'paid' }),
        ])

        expect(totals.chaseCount).toBe(2)
    })

    it('does not ask you to chase a refunded registration', () => {
        expect(getRegistrationTotals([reg({ status: 'refunded' })]).chaseCount).toBe(0)
    })
})
