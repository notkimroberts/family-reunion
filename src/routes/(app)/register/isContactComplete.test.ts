import { describe, expect, it } from 'vitest'
import { isContactComplete } from './isContactComplete'
import type { PersonDetails } from './types'

const COMPLETE_DETAILS: PersonDetails = {
    tierId: 'tier-adult',
    birthDate: '1980-05-05',
    shirtSize: 'L',
    addressLine1: '123 Fake Street',
    addressLine2: 'Apt 1',
    addressCity: 'Oakland',
    addressState: 'CA',
    addressZip: '94612',
    vegetarianMeal: 'no',
    attendedReunion2025: 'yes',
}

const COMPLETE = {
    firstName: 'Alice',
    lastName: 'Patterson',
    email: 'alice@example.com',
    details: COMPLETE_DETAILS,
}

describe('isContactComplete', () => {
    it('accepts a fully filled contact', () => {
        expect(isContactComplete(COMPLETE)).toBe(true)
    })

    it.each([
        ['firstName', { firstName: '' }],
        ['lastName', { lastName: '' }],
        ['email', { email: '' }],
        ['whitespace-only firstName', { firstName: '   ' }],
    ])('rejects a missing %s', (_label, override) => {
        expect(isContactComplete({ ...COMPLETE, ...override })).toBe(false)
    })

    it.each([
        ['tierId', { tierId: '' }],
        ['addressLine1', { addressLine1: '' }],
        ['addressCity', { addressCity: '' }],
        ['addressState', { addressState: '' }],
        ['addressZip', { addressZip: '' }],
        ['vegetarianMeal', { vegetarianMeal: '' as const }],
        ['attendedReunion2025', { attendedReunion2025: '' as const }],
    ])('rejects a missing %s', (_label, override) => {
        expect(
            isContactComplete({ ...COMPLETE, details: { ...COMPLETE_DETAILS, ...override } }),
        ).toBe(false)
    })

    it('rejects a malformed ZIP even when present', () => {
        expect(
            isContactComplete({
                ...COMPLETE,
                details: { ...COMPLETE_DETAILS, addressZip: 'not-a-zip' },
            }),
        ).toBe(false)
    })

    /* Optional fields must not gate submission. birthDate is optional in the schema, and addressLine2
       is too — an apartment-less address is valid. */
    it.each([
        ['birthDate', { birthDate: undefined }],
        ['addressLine2', { addressLine2: '' }],
    ])('still accepts when optional %s is absent', (_label, override) => {
        expect(
            isContactComplete({ ...COMPLETE, details: { ...COMPLETE_DETAILS, ...override } }),
        ).toBe(true)
    })

    /* Shirt size is REQUIRED now — shirts are made per attendee, so a blank is a person without one.
       This predicate exists to mirror registrationSchema, so it has to move when the schema does or the
       button stays enabled on a form the server will reject. */
    it('rejects a missing shirt size', () => {
        expect(
            isContactComplete({ ...COMPLETE, details: { ...COMPLETE_DETAILS, shirtSize: '' } }),
        ).toBe(false)
    })

    /* Phone is deliberately outside this predicate: it is optional, and only its *validity*
       matters, which each page adds separately. */
    it('does not consider phone at all', () => {
        expect(isContactComplete(COMPLETE)).toBe(true)
    })
})
