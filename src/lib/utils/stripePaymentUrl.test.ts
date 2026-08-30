import { describe, it, expect } from 'vitest'
import { stripePaymentUrl } from './stripePaymentUrl'

const INTENT = 'pi_3Abc123XyZ'

describe('stripePaymentUrl', () => {
    it('links to the live dashboard', () => {
        expect(stripePaymentUrl(INTENT, false)).toBe(
            `https://dashboard.stripe.com/payments/${INTENT}`,
        )
    })

    /* The mode cannot be read off the id — test and live intents look alike — and a test id under the
       live path shows "no such payment", which reads as a lost payment rather than a wrong link. */
    it('links to the test dashboard in test mode', () => {
        expect(stripePaymentUrl(INTENT, true)).toBe(
            `https://dashboard.stripe.com/test/payments/${INTENT}`,
        )
    })

    /* No intent covers every cheque payer, every abandoned checkout, and everything paid before the id
       was stored at registration level. A link that goes nowhere is worse than no link. */
    it.each([
        ['null', null],
        ['undefined', undefined],
        ['empty', ''],
    ])('returns undefined for a %s intent', (_label, intent) => {
        expect(stripePaymentUrl(intent, false)).toBeUndefined()
        expect(stripePaymentUrl(intent, true)).toBeUndefined()
    })
})
