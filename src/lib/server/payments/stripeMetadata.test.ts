import { describe, it, expect } from 'vitest'
import {
    encodeRegistrationMetadata,
    encodeAddMemberMetadata,
    decodeSessionMetadata,
} from './stripeMetadata'

describe('encodeRegistrationMetadata / decode round-trip', () => {
    it('encodes and decodes a registration session', () => {
        const encoded = encodeRegistrationMetadata('reg-123', 'plaintext-token')
        const decoded = decodeSessionMetadata(encoded)
        expect(decoded).toEqual({
            type: 'registration',
            registrationId: 'reg-123',
            managementToken: 'plaintext-token',
        })
    })
})

describe('encodeAddMemberMetadata / decode round-trip', () => {
    it('encodes and decodes an add_member session with all fields', () => {
        const encoded = encodeAddMemberMetadata({
            registrationId: 'reg-123',
            memberName: 'Alice',
            memberTierId: 'tier-1',
            memberTierLabel: 'Adult',
            memberBirthDate: '1990-05-15',
            memberShirtSize: 'M',
            memberPriceCents: 5000,
        })
        const decoded = decodeSessionMetadata(encoded)
        expect(decoded).toEqual({
            type: 'add_member',
            registrationId: 'reg-123',
            memberName: 'Alice',
            memberTierId: 'tier-1',
            memberTierLabel: 'Adult',
            memberBirthDate: '1990-05-15',
            memberShirtSize: 'M',
            memberPriceCents: '5000',
        })
    })

    it('encodes optional fields as empty strings when absent', () => {
        const encoded = encodeAddMemberMetadata({
            registrationId: 'reg-123',
            memberName: 'Bob',
            memberTierId: 'tier-2',
            memberTierLabel: 'Child',
            memberPriceCents: 2500,
        })
        expect(encoded.memberBirthDate).toBe('')
        expect(encoded.memberShirtSize).toBe('')
    })

    it('serialises memberPriceCents as a string', () => {
        const encoded = encodeAddMemberMetadata({
            registrationId: 'reg-123',
            memberName: 'Carol',
            memberTierId: 'tier-3',
            memberTierLabel: 'Teen',
            memberPriceCents: 7500,
        })
        expect(encoded.memberPriceCents).toBe('7500')
        expect(typeof encoded.memberPriceCents).toBe('string')
    })
})

describe('decodeSessionMetadata edge cases', () => {
    it('returns null for null input', () => {
        expect(decodeSessionMetadata(null)).toBeNull()
    })

    it('returns null for undefined input', () => {
        expect(decodeSessionMetadata(undefined)).toBeNull()
    })

    it('returns null for empty metadata', () => {
        expect(decodeSessionMetadata({})).toBeNull()
    })

    it('returns null for unrecognised type with no registrationId', () => {
        expect(decodeSessionMetadata({ type: 'unknown' })).toBeNull()
    })
})
