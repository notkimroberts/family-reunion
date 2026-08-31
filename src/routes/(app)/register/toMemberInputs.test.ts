import { describe, expect, it } from 'vitest'
import type { MemberData } from './schema'
import { toMemberInputs } from './toMemberInputs'

const MEMBER: MemberData = {
    name: 'Marcus Patterson',
    tierId: 'tier-adult',
    birthDate: '1985-02-02',
    shirtSize: 'L',
    addressLine1: '1 Main St',
    addressLine2: '',
    addressCity: 'Oakland',
    addressState: 'CA',
    addressZip: '94612',
    vegetarianMeal: 'yes',
    attendedReunion2025: 'no',
}

describe('toMemberInputs', () => {
    it('returns an empty array for an empty party', () => {
        expect(toMemberInputs([])).toEqual([])
    })

    it('converts the yes/no answers to booleans', () => {
        const [member] = toMemberInputs([MEMBER])
        expect(member.vegetarianMeal).toBe(true)
        expect(member.attendedReunion2025).toBe(false)
    })

    it('preserves every other field', () => {
        const [member] = toMemberInputs([MEMBER])
        expect(member).toMatchObject({
            name: 'Marcus Patterson',
            tierId: 'tier-adult',
            birthDate: '1985-02-02',
            shirtSize: 'L',
            addressLine1: '1 Main St',
            addressCity: 'Oakland',
            addressState: 'CA',
            addressZip: '94612',
        })
    })

    it('maps a multi-member party in order', () => {
        const result = toMemberInputs([
            { ...MEMBER, name: 'A' },
            { ...MEMBER, name: 'B' },
        ])
        expect(result.map((m) => m.name)).toEqual(['A', 'B'])
    })
})
