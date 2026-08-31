import { describe, expect, it } from 'vitest'
import { grossUpForStripe, stripeFeeOnChargeCents } from '$lib/utils/stripeFee'
import { getRegistrationMoney, type RegistrationMoneyInput } from './registrationMoney'

/* One registration's money. The case that matters most is the one that had no test and shipped
   wrong: a checkout the payer abandoned, then cancelled. It has a Stripe session, because a session
   is opened when Checkout opens, and it took nothing. */

const ADULT_GROSS = grossUpForStripe(16000)

function reg(overrides: Partial<RegistrationMoneyInput> = {}): RegistrationMoneyInput {
    return {
        status: 'paid',
        stripeSessionId: 'cs_1',
        stripePaymentIntentId: 'pi_1',
        stripeFeeCents: null,
        paidAt: new Date('2026-08-10T00:00:00Z'),
        totalCents: ADULT_GROSS,
        ...overrides,
    }
}

/* An abandoned checkout: a session was opened, the webhook never ran, so none of the three columns
   the webhook writes has a value. This is exactly the row that produced a phantom loss. */
const ABANDONED = {
    stripeSessionId: 'cs_1',
    stripePaymentIntentId: null,
    stripeFeeCents: null,
    paidAt: null,
} as const

describe('getRegistrationMoney', () => {
    describe('whether a card was actually charged', () => {
        it('counts a paid Stripe registration as charged', () => {
            expect(getRegistrationMoney(reg()).wasCharged).toBe(true)
        })

        /* THE BUG. The panel keyed on stripeSessionId alone, so this row was charged an estimated
           2.9% + 30¢ and the total reported it as money lost to refunds — for a payment that never
           happened and a refund that was never issued. */
        it('does not count an abandoned checkout that was later cancelled', () => {
            const money = getRegistrationMoney(reg({ status: 'refunded', ...ABANDONED }))

            expect(money.wasCharged).toBe(false)
            expect(money.feeCents).toBe(0)
            expect(money.lostFeeCents).toBe(0)
        })

        /* A pending row is the same registration one step earlier, and must cost nothing either. */
        it('does not count a checkout still open', () => {
            expect(getRegistrationMoney(reg({ status: 'pending', ...ABANDONED })).wasCharged).toBe(
                false,
            )
        })

        /* Any one of the three webhook-written columns is proof the webhook ran. Enumerated because
           a refunded row may have some and not others: the fee column is newer than the other two. */
        it.each([
            ['a recorded payment date', { paidAt: new Date('2026-08-10T00:00:00Z') }],
            ['a recorded payment intent', { stripePaymentIntentId: 'pi_1' }],
            ['a recorded fee', { stripeFeeCents: 509 }],
        ])('counts a cancelled booking with %s as charged', (_label, evidence) => {
            const money = getRegistrationMoney(
                reg({ status: 'refunded', ...ABANDONED, ...evidence }),
            )

            expect(money.wasCharged).toBe(true)
            expect(money.lostFeeCents).toBeGreaterThan(0)
        })

        /* Zero is evidence too: the webhook wrote it, so a charge happened — it just cost nothing.
           Charged with no loss is a different answer from never charged, and only the first is
           allowed to be exact about a fee of zero. */
        it('counts a cancelled booking whose recorded fee was zero as charged, losing nothing', () => {
            const money = getRegistrationMoney(
                reg({ status: 'refunded', ...ABANDONED, stripeFeeCents: 0 }),
            )

            expect(money.wasCharged).toBe(true)
            expect(money.lostFeeCents).toBe(0)
        })

        it.each(['pending', 'paid', 'waived', 'refunded'] as const)(
            'never counts a %s registration with no Stripe session',
            (status) => {
                expect(
                    getRegistrationMoney(reg({ status, stripeSessionId: null })).wasCharged,
                ).toBe(false)
            },
        )
    })

    describe('the fee', () => {
        it('prefers the recorded fee over the estimate', () => {
            const money = getRegistrationMoney(reg({ stripeFeeCents: 812 }))

            expect(money.feeCents).toBe(812)
            expect(money.feeIsExact).toBe(true)
        })

        it('falls back to the estimate and says it is estimating', () => {
            const money = getRegistrationMoney(reg({ stripeFeeCents: null }))

            expect(money.feeCents).toBe(stripeFeeOnChargeCents(ADULT_GROSS))
            expect(money.feeIsExact).toBe(false)
        })

        /* Zero is a real answer — a charge Stripe took nothing on — not a missing one. */
        it('treats a recorded fee of zero as recorded', () => {
            const money = getRegistrationMoney(reg({ stripeFeeCents: 0 }))

            expect(money.feeCents).toBe(0)
            expect(money.feeIsExact).toBe(true)
        })

        /* Nothing was estimated, so nothing is approximate. Without this an abandoned checkout in the
           list would flip the whole panel to "fees estimated" on the strength of a fee it never had. */
        it('is exact when nothing was charged', () => {
            const money = getRegistrationMoney(reg({ status: 'refunded', ...ABANDONED }))

            expect(money.feeIsExact).toBe(true)
        })
    })

    describe('what the reunion keeps', () => {
        it('nets the tier price on a card payment', () => {
            /* The gross-up is designed so the org nets the tier price: charge $165.09, keep $160. */
            expect(getRegistrationMoney(reg()).netCents).toBe(16000)
        })

        it('keeps a cheque in full', () => {
            const money = getRegistrationMoney(reg({ stripeSessionId: null, totalCents: 16000 }))

            expect(money.feeCents).toBe(0)
            expect(money.netCents).toBe(16000)
        })

        it.each(['pending', 'waived', 'refunded'] as const)(
            'keeps nothing from a %s row',
            (status) => {
                expect(getRegistrationMoney(reg({ status })).netCents).toBe(0)
            },
        )

        /* Stripe keeps its fee on a refund, so a fully cancelled booking costs the reunion the fee
           with nobody attending. */
        it('loses the fee on a genuinely refunded card booking', () => {
            const money = getRegistrationMoney(reg({ status: 'refunded', stripeFeeCents: 509 }))

            expect(money.lostFeeCents).toBe(509)
            expect(money.netCents).toBe(0)
        })

        it('loses nothing on a cancelled cheque', () => {
            const money = getRegistrationMoney(reg({ status: 'refunded', stripeSessionId: null }))

            expect(money.lostFeeCents).toBe(0)
        })
    })
})
