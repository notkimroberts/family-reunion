import { describe, expect, it } from 'vitest'
import {
    decodeSessionMetadata,
    encodeAddMemberMetadata,
    encodeDonationMetadata,
    encodeRegistrationMetadata,
} from './stripeMetadata'

describe('encodeRegistrationMetadata / decode round-trip', () => {
    it('encodes and decodes a registration session', () => {
        const encoded = encodeRegistrationMetadata('reg-123', 'plaintext-token')
        const decoded = decodeSessionMetadata(encoded)
        expect(decoded).toEqual({
            type: 'registration',
            registrationId: 'reg-123',
            managementToken: 'plaintext-token',
            donationId: undefined,
        })
    })

    /* A gift shares the registration's checkout, so its id rides in the same metadata. */
    it('carries a gift id when one was added to the checkout', () => {
        const encoded = encodeRegistrationMetadata('reg-123', 'plaintext-token', 'gift-1')

        expect(encoded.donationId).toBe('gift-1')
        expect(decodeSessionMetadata(encoded)).toMatchObject({ donationId: 'gift-1' })
    })

    /* Omitted rather than sent as '', so the two spellings of "no gift" cannot disagree. Every
       session created before gifts existed decodes the same way. */
    it('omits the key entirely when there is no gift', () => {
        expect('donationId' in encodeRegistrationMetadata('reg-123', 'tok')).toBe(false)
    })

    it('reads an empty donationId as no gift', () => {
        expect(
            decodeSessionMetadata({
                type: 'registration',
                registrationId: 'reg-123',
                managementToken: 'tok',
                donationId: '',
            }),
        ).toMatchObject({ donationId: undefined })
    })
})

describe('encodeDonationMetadata / decode round-trip', () => {
    it('encodes and decodes a standalone gift session', () => {
        expect(decodeSessionMetadata(encodeDonationMetadata('gift-1'))).toEqual({
            type: 'donation',
            donationId: 'gift-1',
        })
    })

    /* Fail closed. A donation session with no id names no row, and defaulting it would mark an
       arbitrary gift paid. */
    it('returns null for a donation session with no id', () => {
        expect(decodeSessionMetadata({ type: 'donation' })).toBeNull()
        expect(decodeSessionMetadata({ type: 'donation', donationId: '' })).toBeNull()
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
            memberAddressLine1: '123 Main St',
            memberAddressLine2: 'Apt 4B',
            memberAddressCity: 'Springfield',
            memberAddressState: 'IL',
            memberAddressZip: '62704',
            memberVegetarianMeal: true,
            memberAttendedReunion2025: false,
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
            memberAddressLine1: '123 Main St',
            memberAddressLine2: 'Apt 4B',
            memberAddressCity: 'Springfield',
            memberAddressState: 'IL',
            memberAddressZip: '62704',
            memberVegetarianMeal: 'true',
            memberAttendedReunion2025: 'false',
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
        expect(encoded.memberAddressLine1).toBe('')
        expect(encoded.memberAddressLine2).toBe('')
        expect(encoded.memberAddressCity).toBe('')
        expect(encoded.memberAddressState).toBe('')
        expect(encoded.memberAddressZip).toBe('')
        expect(encoded.memberVegetarianMeal).toBe('')
        expect(encoded.memberAttendedReunion2025).toBe('')
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
