import { describe, expect, it } from 'vitest'
import { CONTACT_EMAIL } from '$lib/general/constants'
import { checkoutErrorMessage } from './checkoutErrorMessage'

describe('checkoutErrorMessage', () => {
    it('says registration has closed for a 403', () => {
        expect(checkoutErrorMessage(403)).toContain('Registration has closed')
    })

    it.each([500, 502, 400, undefined])('gives a generic retry message for %s', (status) => {
        expect(checkoutErrorMessage(status)).toContain('Something went wrong')
    })

    /* Every failure here happens before the redirect to Stripe, and the first thing a payer worries
       about is whether their card was charged. */
    it.each([403, 500])('says nothing was charged and names a contact for %i', (status) => {
        const message = checkoutErrorMessage(status)
        expect(message).toContain('nothing was charged')
        expect(message).toContain(CONTACT_EMAIL)
    })
})
