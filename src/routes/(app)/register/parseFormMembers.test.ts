import { describe, it, expect } from 'vitest'
import { parseFormMembers } from './parseFormMembers'

describe('parseFormMembers', () => {
    it('returns an empty array for an empty party', () => {
        expect(parseFormMembers('[]')).toEqual([])
    })

    it('converts the yes/no strings to booleans', () => {
        const [member] = parseFormMembers(
            JSON.stringify([
                {
                    name: 'Bob',
                    tierId: 'tier-1',
                    addressLine1: '1 Main St',
                    addressCity: 'Springfield',
                    addressState: 'LA',
                    addressZip: '71101',
                    vegetarianMeal: 'yes',
                    attendedReunion2025: 'no',
                },
            ]),
        )
        expect(member.vegetarianMeal).toBe(true)
        expect(member.attendedReunion2025).toBe(false)
    })

    /* An unanswered question must stay unknown rather than collapsing to false — catering
       counts read this column and "no answer" is not "no". */
    it('leaves an unanswered question undefined rather than false', () => {
        const [member] = parseFormMembers(
            JSON.stringify([{ name: 'Bob', tierId: 'tier-1', vegetarianMeal: '' }]),
        )
        expect(member.vegetarianMeal).toBeUndefined()
        expect(member.attendedReunion2025).toBeUndefined()
    })

    it('preserves the remaining member fields', () => {
        const [member] = parseFormMembers(
            JSON.stringify([
                {
                    name: 'Bob',
                    tierId: 'tier-1',
                    birthDate: '2015-04-02',
                    shirtSize: 'YM',
                    addressLine1: '1 Main St',
                    addressLine2: 'Apt 2',
                    addressCity: 'Springfield',
                    addressState: 'LA',
                    addressZip: '71101',
                    vegetarianMeal: 'no',
                    attendedReunion2025: 'yes',
                },
            ]),
        )
        expect(member).toMatchObject({
            name: 'Bob',
            tierId: 'tier-1',
            birthDate: '2015-04-02',
            shirtSize: 'YM',
            addressLine1: '1 Main St',
            addressLine2: 'Apt 2',
            addressCity: 'Springfield',
            addressState: 'LA',
            addressZip: '71101',
        })
    })

    it('handles a multi-member party', () => {
        expect(
            parseFormMembers(JSON.stringify([{ name: 'A' }, { name: 'B' }, { name: 'C' }])),
        ).toHaveLength(3)
    })

    it('throws on malformed JSON so the caller can fail the request', () => {
        expect(() => parseFormMembers('not json')).toThrow()
    })
})
