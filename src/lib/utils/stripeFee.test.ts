import { describe, expect, it } from 'vitest'
import {
    STRIPE_FEE_FIXED_CENTS,
    STRIPE_FEE_PERCENT,
    grossUpForStripe,
    stripeFeeCents,
    stripeFeeOnChargeCents,
} from './stripeFee'

describe('grossUpForStripe', () => {
    it('returns 0 for non-positive amounts', () => {
        expect(grossUpForStripe(0)).toBe(0)
        expect(grossUpForStripe(-100)).toBe(0)
    })

    it('grosses up so net equals input minus fee', () => {
        const net = 10000 // $100.00
        const gross = grossUpForStripe(net)
        const realFee = Math.round(gross * STRIPE_FEE_PERCENT) + STRIPE_FEE_FIXED_CENTS
        /* Stripe's actual fee is computed on the gross. Within 1¢ accounts for the rounding band. */
        expect(gross - realFee).toBeGreaterThanOrEqual(net)
        expect(gross - realFee).toBeLessThanOrEqual(net + 1)
    })

    it('matches a known case: $100 net -> $103.20 gross', () => {
        expect(grossUpForStripe(10000)).toBe(10330)
    })

    it('always rounds up (never undercollects)', () => {
        for (const net of [1, 99, 333, 1234, 9999, 50000]) {
            const gross = grossUpForStripe(net)
            const fee = Math.round(gross * STRIPE_FEE_PERCENT) + STRIPE_FEE_FIXED_CENTS
            expect(gross - fee).toBeGreaterThanOrEqual(net)
        }
    })
})

describe('stripeFeeCents', () => {
    it('is the difference between gross and net', () => {
        for (const net of [100, 5000, 12345]) {
            expect(stripeFeeCents(net)).toBe(grossUpForStripe(net) - net)
        }
    })

    it('returns 0 for non-positive amounts', () => {
        expect(stripeFeeCents(0)).toBe(0)
        expect(stripeFeeCents(-50)).toBe(0)
    })
})

/* The inverse direction, used by the admin panel to say how much of the money collected went to Stripe
   and how much reaches the bank. */
describe('stripeFeeOnChargeCents', () => {
    it('returns 0 for non-positive amounts', () => {
        expect(stripeFeeOnChargeCents(0)).toBe(0)
        expect(stripeFeeOnChargeCents(-500)).toBe(0)
    })

    it('is 2.9% of the charge plus 30¢', () => {
        expect(stripeFeeOnChargeCents(10000)).toBe(290 + 30)
    })

    /* Round-trips with the gross-up, which is the property the panel depends on: charge the grossed-up
       amount, and what lands is the tier price the organiser set. */
    it.each([100, 5000, 10000, 16000, 26000, 58000])(
        'leaves the intended net of %d cents after the fee',
        (net) => {
            const gross = grossUpForStripe(net)
            expect(gross - stripeFeeOnChargeCents(gross)).toBeGreaterThanOrEqual(net)
            /* Rounding up on the gross means the org may net a cent more, never less. */
            expect(gross - stripeFeeOnChargeCents(gross)).toBeLessThanOrEqual(net + 1)
        },
    )

    /* Distinct from stripeFeeCents, which takes a NET amount. Passing a gross to that one computes the
       fee on a base 2.9% too large, so the two must not be swapped. */
    it('is not interchangeable with stripeFeeCents', () => {
        const gross = grossUpForStripe(16000)
        expect(stripeFeeOnChargeCents(gross)).not.toBe(stripeFeeCents(gross))
        expect(stripeFeeOnChargeCents(gross)).toBeLessThan(stripeFeeCents(gross))
    })

    /* Per charge, not per amount: splitting the same money across more payments costs more in fixed
       fees. This is why the panel sums the fee per registration. */
    it('costs 30¢ more for each additional payment', () => {
        const one = stripeFeeOnChargeCents(30000)
        const two = stripeFeeOnChargeCents(15000) * 2
        expect(two - one).toBe(STRIPE_FEE_FIXED_CENTS)
    })

    it('uses the same rate constants as the gross-up', () => {
        expect(stripeFeeOnChargeCents(100000)).toBe(
            Math.round(100000 * STRIPE_FEE_PERCENT) + STRIPE_FEE_FIXED_CENTS,
        )
    })
})
