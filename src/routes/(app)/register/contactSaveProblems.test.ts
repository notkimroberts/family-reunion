import { describe, expect, it } from 'vitest'
import { EMPTY_PERSON_DETAILS } from './EMPTY_PERSON_DETAILS'
import { contactSaveProblems } from './contactSaveProblems'
import type { PersonDetails } from './types'

/* The list behind the Save alert on YourInformationCard. It replaced a disabled button, so the
   property that matters is not "does it say no" — that already worked — but "does it name every
   reason". A field missing from this list is a Save that reports nothing wrong and still refuses. */

const COMPLETE: PersonDetails = {
    ...EMPTY_PERSON_DETAILS,
    tierId: 'tier-adult',
    shirtSize: 'M',
    addressLine1: '1 Main St',
    addressCity: 'Oakland',
    addressState: 'CA',
    addressZip: '94612',
    vegetarianMeal: 'no',
    attendedReunion2025: 'yes',
}

function problemsFor(overrides: Partial<PersonDetails> = {}, phone = '') {
    return contactSaveProblems({
        firstName: 'Alice',
        lastName: 'Patterson',
        email: 'alice@example.com',
        phone,
        details: { ...COMPLETE, ...overrides },
    })
}

describe('contactSaveProblems', () => {
    it('finds nothing wrong with complete details', () => {
        expect(problemsFor()).toEqual([])
    })

    /* Every required field gets its own reason. Enumerated rather than spot-checked because the
       failure this guards against is one field silently dropping out of the list. */
    it.each([
        ['tier', { tierId: '' }],
        ['shirt size', { shirtSize: '' }],
        ['street address', { addressLine1: '' }],
        ['city', { addressCity: '' }],
        ['state', { addressState: '' }],
        ['ZIP', { addressZip: '' }],
        ['vegetarian answer', { vegetarianMeal: '' as const }],
        ['2025 attendance answer', { attendedReunion2025: '' as const }],
    ])('reports a missing %s', (_label, override) => {
        expect(problemsFor(override)).toHaveLength(1)
    })

    it.each([
        ['first name', { firstName: '' }],
        ['last name', { lastName: '' }],
        ['email', { email: '   ' }],
    ])('reports a missing %s', (_label, override) => {
        const problems = contactSaveProblems({
            firstName: 'Alice',
            lastName: 'Patterson',
            email: 'alice@example.com',
            details: COMPLETE,
            ...override,
        })

        expect(problems).toHaveLength(1)
    })

    /* A blank form must not hand back a single vague complaint. */
    it('reports every problem at once, not just the first', () => {
        const problems = contactSaveProblems({
            firstName: '',
            lastName: '',
            email: '',
            details: EMPTY_PERSON_DETAILS,
        })

        expect(problems.length).toBeGreaterThan(5)
    })

    /* Phone is optional, so an empty one is not a problem and a wrong one is. */
    it('accepts no phone number', () => {
        expect(problemsFor({}, '')).toEqual([])
    })

    it('rejects an unusable phone number', () => {
        expect(problemsFor({}, '123')).toEqual(['Please enter a valid phone number'])
    })

    /* A ZIP that is present but malformed is as blocking as a missing one, and was the field most
       likely to fail silently under the old disabled button. */
    it('rejects a malformed ZIP', () => {
        expect(problemsFor({ addressZip: 'ABCDE' })).toEqual(['Please enter a valid ZIP code'])
    })
})
