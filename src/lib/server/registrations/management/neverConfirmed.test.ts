import { describe, expect, it } from 'vitest'
import { neverConfirmed } from './neverConfirmed'

describe('neverConfirmed', () => {
    it('is true for a public checkout abandoned at Stripe', () => {
        expect(
            neverConfirmed({
                status: 'pending',
                stripeSessionId: 'cs_1',
                stripePaymentIntentId: null,
            }),
        ).toBe(true)
    })

    it.each([
        [
            'a paper entry awaiting payment',
            { status: 'pending', stripeSessionId: null, stripePaymentIntentId: null },
        ],
        [
            'a booking paid by card',
            { status: 'paid', stripeSessionId: 'cs_1', stripePaymentIntentId: 'pi_1' },
        ],
        [
            'an abandoned checkout already settled',
            { status: 'paid', stripeSessionId: 'cs_1', stripePaymentIntentId: null },
        ],
        [
            'a waived booking',
            { status: 'waived', stripeSessionId: null, stripePaymentIntentId: null },
        ],
    ] as const)('is false for %s', (_case, registration) => {
        expect(neverConfirmed(registration)).toBe(false)
    })
})
