import { describe, expect, it } from 'vitest'
import type { DonationSummary } from '$lib/server/donations'
import type { RegistrationSummary } from '$lib/server/registrations'
import { getDonationTotals } from './donationTotals'
import { getEventMoney } from './eventMoney'
import { getRegistrationTotals } from './registrationTotals'

/* The one figure an organiser is actually looking for: what the reunion has.

   THE INVARIANT, and the reason this module exists. The panel prints the headline first and its
   contributing lines beneath it, so those lines have to add up to it on screen:

       registrations + gifts − fees − lost to refunds === in the bank

   It held by construction before anything displayed it as a sum, and nothing asserted it. A break
   here is silent: a wrong headline still looks like a headline.

   Driven through the REAL producers from row fixtures rather than hand-built totals objects, so the
   identity is proved against getRegistrationTotals and getDonationTotals as they actually behave —
   a hand-built pair would only prove my arithmetic against itself. */

function reg(overrides: Partial<RegistrationSummary>): RegistrationSummary {
    return {
        id: 'reg-1',
        contactName: 'Alice Patterson',
        contactEmail: 'alice@example.com',
        contactPhone: null,
        status: 'paid',
        stripeSessionId: 'cs_test_1',
        stripePaymentIntentId: 'pi_test_1',
        stripeFeeCents: null,
        paidAt: new Date('2026-08-10T00:00:00Z'),
        /* Irrelevant here — the room block is getRoomSummary's business. */
        stayingAtHostHotel: null,
        memberCount: 1,
        totalCents: 16509,
        createdAt: new Date('2026-08-01T00:00:00Z'),
        ...overrides,
    }
}

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
        paidAt: new Date('2026-08-10T00:00:00Z'),
        createdAt: new Date('2026-08-01T00:00:00Z'),
        ...overrides,
    }
}

function money(registrations: RegistrationSummary[], gifts: DonationSummary[] = []) {
    return getEventMoney(getRegistrationTotals(registrations), getDonationTotals(gifts))
}

/* Every case below is checked against this, because the failure it guards is the panel's rows not
   summing to its own headline. */
function expectReconciles(result: ReturnType<typeof getEventMoney>) {
    expect(
        result.registrationsCents + result.giftsCents - result.feeCents - result.lostToRefundsCents,
    ).toBe(result.bankedCents)
}

describe('getEventMoney', () => {
    describe('the headline reconciles with its own breakdown', () => {
        it('holds for card registrations and standalone gifts', () => {
            const result = money(
                [
                    reg({ id: 'a', stripeFeeCents: 509 }),
                    reg({ id: 'b', stripeSessionId: 'cs_test_2', stripeFeeCents: 509 }),
                ],
                [gift({ id: 'g1', amountCents: 5000, stripeFeeCents: 175 })],
            )

            expectReconciles(result)
            /* Both places plus the gift, less all three fees. */
            expect(result.bankedCents).toBe(16509 * 2 + 5000 - 509 * 2 - 175)
        })

        it('holds when fees are estimated rather than recorded', () => {
            expectReconciles(money([reg({})], [gift({})]))
        })

        it('holds with cash and cheques in the mix', () => {
            expectReconciles(
                money([
                    reg({ id: 'a', stripeFeeCents: 509 }),
                    reg({ id: 'b', stripeSessionId: null, totalCents: 16000 }),
                ]),
            )
        })

        it('holds when a cancelled booking cost the reunion its fee', () => {
            const result = money([
                reg({ id: 'a', stripeFeeCents: 509 }),
                reg({ id: 'b', status: 'refunded', stripeSessionId: 'cs_2', stripeFeeCents: 509 }),
            ])

            expect(result.lostToRefundsCents).toBe(509)
            expectReconciles(result)
        })

        it('holds with a gift given alongside a registration', () => {
            const result = money(
                [reg({ stripeFeeCents: 509 })],
                [gift({ registrationId: 'reg-1', amountCents: 2500 })],
            )

            /* That gift shared the booking's charge, so it adds no fee of its own. */
            expect(result.feeCents).toBe(509)
            expectReconciles(result)
        })

        it('holds for a year with nothing in it', () => {
            expectReconciles(money([]))
        })
    })

    /* The defect the redesign exists to fix: two "In the bank" figures the organiser had to add up. */
    it('adds registration money and gift money into one spendable figure', () => {
        const registrations = getRegistrationTotals([reg({ stripeFeeCents: 509 })])
        const gifts = getDonationTotals([gift({ stripeFeeCents: 175 })])

        expect(getEventMoney(registrations, gifts).bankedCents).toBe(
            registrations.bankedCents + gifts.netCents,
        )
    })

    it('reports what each source brought in, before fees', () => {
        const result = money([reg({ totalCents: 16509 })], [gift({ amountCents: 5000 })])

        expect(result.registrationsCents).toBe(16509)
        expect(result.giftsCents).toBe(5000)
        expect(result.giftCount).toBe(1)
    })

    it('sums the fees from both sides into one line', () => {
        const result = money([reg({ stripeFeeCents: 509 })], [gift({ stripeFeeCents: 175 })])

        expect(result.feeCents).toBe(684)
    })

    it('carries the money still owed', () => {
        const result = money([reg({ status: 'pending', totalCents: 76000, memberCount: 5 })])

        expect(result.outstandingCents).toBe(76000)
        /* Owed money is not banked money — it must not reach the headline. */
        expect(result.bankedCents).toBe(0)
    })

    it('reports cash and cheques as still to deposit', () => {
        const result = money([reg({ stripeSessionId: null, totalCents: 16000 })])

        expect(result.toDepositCents).toBe(16000)
    })

    /* The panel stops claiming precision the moment either side is estimating, because the figure it
       prints is the two added together. */
    describe('exactness', () => {
        it('is exact when both sides recorded their fees', () => {
            expect(
                money([reg({ stripeFeeCents: 509 })], [gift({ stripeFeeCents: 175 })]).feesAreExact,
            ).toBe(true)
        })

        it('is inexact when the registrations are estimated', () => {
            expect(money([reg({})], [gift({ stripeFeeCents: 175 })]).feesAreExact).toBe(false)
        })

        it('is inexact when the gifts are estimated', () => {
            expect(money([reg({ stripeFeeCents: 509 })], [gift({})]).feesAreExact).toBe(false)
        })
    })

    /* Drives the empty state: a column of $0.00s invites the question every time. */
    describe('hasActivity', () => {
        it('is false for a year nothing has happened in', () => {
            expect(money([]).hasActivity).toBe(false)
        })

        it('is true once money has been collected', () => {
            expect(money([reg({})]).hasActivity).toBe(true)
        })

        /* Owed money is something to show, even though nothing has arrived. */
        it('is true when money is only owed', () => {
            expect(money([reg({ status: 'pending' })]).hasActivity).toBe(true)
        })

        it('is true when the only money is a gift', () => {
            expect(money([], [gift({})]).hasActivity).toBe(true)
        })

        /* A comped-only year has no money at all, and the People block is where it shows up. */
        it('is false for a year of comped places only', () => {
            expect(money([reg({ status: 'waived' })]).hasActivity).toBe(false)
        })
    })
})
