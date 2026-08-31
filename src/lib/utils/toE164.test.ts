import { describe, expect, it } from 'vitest'
import { CONTACT_PHONE } from '$lib/general/constants'
import { toE164 } from './toE164'

/* The property that matters is not the exact string but that the result is USABLE in an href: no
   spaces, no parens, nothing a URI parser will refuse. That is what was broken. */
describe('toE164', () => {
    /* The real constant, since it is the only number this app ever formats. */
    it('converts the display format the app actually stores', () => {
        expect(toE164(CONTACT_PHONE)).toBe('+15105759080')
    })

    it.each(['(510) 575-9080', '510-575-9080', '510.575.9080', '5105759080', '510 575 9080'])(
        'reads %s as the same number',
        (input) => {
            expect(toE164(input)).toBe('+15105759080')
        },
    )

    it('keeps a number that already carries its country code', () => {
        expect(toE164('1 (510) 575-9080')).toBe('+15105759080')
    })

    it('passes an international number through', () => {
        expect(toE164('+44 20 7946 0958')).toBe('+442079460958')
    })

    /* THE regression. A raw space or paren in an href is what Resend flagged and what some clients
       drop; asserting on the digits alone would not catch a reintroduced format string. */
    it.each(['(510) 575-9080', '+44 20 7946 0958', '510-575-9080'])(
        'produces a value safe in an href from %s',
        (input) => {
            expect(toE164(input)).toMatch(/^\+?\d+$/)
        },
    )

    /* A wrong country code dials a stranger; an unprefixed number simply fails to dial. Guessing is
       the more expensive error, so an unrecognised length is left bare. */
    it('does not invent a country code for an unrecognisable number', () => {
        expect(toE164('12345')).toBe('12345')
    })

    it('tolerates surrounding whitespace', () => {
        expect(toE164('  (510) 575-9080  ')).toBe('+15105759080')
    })
})
