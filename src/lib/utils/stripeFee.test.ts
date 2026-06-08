import { describe, expect, it } from 'vitest'
import {
    STRIPE_FEE_FIXED_CENTS,
    STRIPE_FEE_PERCENT,
    grossUpForStripe,
    stripeFeeCents,
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
