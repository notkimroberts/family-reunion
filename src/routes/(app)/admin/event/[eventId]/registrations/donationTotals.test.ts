import { describe, expect, it } from 'vitest'
import type { DonationSummary } from '$lib/server/donations'
import { getDonationTotals } from './donationTotals'

/* What the year's gifts add up to, for the panel beside the list. Kept apart from
   getRegistrationTotals because gifts buy no place — see the header on donationTotals.ts. */

function gift(overrides: Partial<DonationSummary> = {}): DonationSummary {
    return {
        id: 'gift-1',
        donorName: 'Ruth Patterson',
        donorEmail: 'ruth@example.com',
        message: null,
        amountCents: 5000,
        stripeFeeCents: null,
        status: 'paid',
        registrationId: null,
        paidAt: new Date('2026-06-01'),
        createdAt: new Date('2026-06-01'),
        ...overrides,
    }
}

describe('getDonationTotals', () => {
    it('is all zeroes with no gifts', () => {
        expect(getDonationTotals([])).toEqual({
            giftCount: 0,
            attachedGiftCount: 0,
            grossCents: 0,
            feeCents: 0,
            netCents: 0,
            feesAreExact: true,
        })
    })

    /* Counted so the money panel's tooltip only explains a shared charge when there is one. */
    it('counts how many gifts rode on a registration charge', () => {
        const totals = getDonationTotals([
            gift({ id: 'a' }),
            gift({ id: 'b', registrationId: 'reg-1' }),
            gift({ id: 'c', registrationId: 'reg-2' }),
        ])

        expect(totals.giftCount).toBe(3)
        expect(totals.attachedGiftCount).toBe(2)
    })

    it('sums the paid gifts and takes the recorded fee off them', () => {
        const totals = getDonationTotals([
            gift({ id: 'a', amountCents: 5000, stripeFeeCents: 175 }),
            gift({ id: 'b', amountCents: 2500, stripeFeeCents: 103 }),
        ])

        expect(totals).toMatchObject({
            giftCount: 2,
            grossCents: 7500,
            feeCents: 278,
            netCents: 7222,
            feesAreExact: true,
        })
    })

    /* Money that has not arrived and money that went back are neither of them money the reunion
       has. A pending gift is an abandoned checkout. */
    it.each(['pending', 'refunded'] as const)('excludes a %s gift entirely', (status) => {
        const totals = getDonationTotals([
            gift({ id: 'a', amountCents: 5000, stripeFeeCents: 175 }),
            gift({ id: 'b', status, amountCents: 9900, stripeFeeCents: 317 }),
        ])

        expect(totals.giftCount).toBe(1)
        expect(totals.grossCents).toBe(5000)
        expect(totals.feeCents).toBe(175)
    })

    /* THE double-count guard. A gift given during registration shared one charge — and therefore
       one balance transaction — with the places, and that fee is already counted in the
       registration totals. */
    it('charges no fee against a gift given with a registration', () => {
        const totals = getDonationTotals([gift({ registrationId: 'reg-1', amountCents: 5000 })])

        expect(totals.grossCents).toBe(5000)
        expect(totals.feeCents).toBe(0)
        expect(totals.netCents).toBe(5000)
    })

    /* An attached gift's null fee is not an unknown one — it is a fee counted elsewhere — so it
       must not make the panel start disclaiming precision it does have. */
    it('stays exact when the only null fee belongs to an attached gift', () => {
        const totals = getDonationTotals([
            gift({ id: 'a', stripeFeeCents: 175 }),
            gift({ id: 'b', registrationId: 'reg-1', stripeFeeCents: null }),
        ])

        expect(totals.feesAreExact).toBe(true)
    })

    /* A standalone gift whose balance transaction could not be read falls back to the estimate, and
       the panel has to stop claiming the figure is what Stripe charged. */
    it('estimates a standalone gift with no recorded fee and says so', () => {
        const totals = getDonationTotals([gift({ amountCents: 5000, stripeFeeCents: null })])

        /* 2.9% of $50 plus 30¢. */
        expect(totals.feeCents).toBe(175)
        expect(totals.feesAreExact).toBe(false)
    })

    /* Zero is a real recorded fee, not a missing one — re-estimating it would invent a deduction. */
    it('treats a recorded zero fee as exact', () => {
        const totals = getDonationTotals([gift({ stripeFeeCents: 0 })])

        expect(totals.feeCents).toBe(0)
        expect(totals.feesAreExact).toBe(true)
    })
})
