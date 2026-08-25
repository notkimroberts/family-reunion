import { describe, it, expect } from 'vitest'
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

    /* Optional fields must not gate submission. birthDate and shirtSize are optional in the
       schema, and addressLine2 is too — an apartment-less address is valid. */
    it.each([
        ['birthDate', { birthDate: undefined }],
        ['shirtSize', { shirtSize: '' }],
        ['addressLine2', { addressLine2: '' }],
    ])('still accepts when optional %s is absent', (_label, override) => {
        expect(
            isContactComplete({ ...COMPLETE, details: { ...COMPLETE_DETAILS, ...override } }),
        ).toBe(true)
    })

    /* Phone is deliberately outside this predicate: it is optional, and only its *validity*
       matters, which each page adds separately. */
    it('does not consider phone at all', () => {
        expect(isContactComplete(COMPLETE)).toBe(true)
    })
})
