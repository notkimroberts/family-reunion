import { describe, expect, it } from 'vitest'
import {
    decodeSessionMetadata,
    encodeAddMemberMetadata,
    encodeDonationMetadata,
    encodeMemberPaymentMetadata,
    encodeRegistrationMetadata,
} from './stripeMetadata'

describe('encodeRegistrationMetadata / decode round-trip', () => {
    it('encodes and decodes a registration session', () => {
        const encoded = encodeRegistrationMetadata('reg-123', 'plaintext-token')
        const decoded = decodeSessionMetadata(encoded)
        expect(decoded).toEqual({
            type: 'registration',
            registrationId: 'reg-123',
            viewToken: 'plaintext-token',
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
                viewToken: 'tok',
                donationId: '',
            }),
        ).toMatchObject({ donationId: undefined })
    })

    /* A checkout opened before the rename completes after it. Refusing it would leave a paid
       registration pending with no confirmation email. */
    it('reads the token from the old managementToken key', () => {
        expect(
            decodeSessionMetadata({
                type: 'registration',
                registrationId: 'reg-123',
                managementToken: 'tok',
            }),
        ).toMatchObject({ viewToken: 'tok' })
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

    it('serializes memberPriceCents as a string', () => {
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

    it('returns null for unrecognized type with no registrationId', () => {
        expect(decodeSessionMetadata({ type: 'unknown' })).toBeNull()
    })
})

describe('encodeMemberPaymentMetadata / decode round-trip', () => {
    const CHARGES = [
        { memberId: '11111111-1111-1111-1111-111111111111', grossCents: 10330 },
        { memberId: '22222222-2222-2222-2222-222222222222', grossCents: 16509 },
    ]

    it('encodes and decodes the owed places and what each was charged', () => {
        const encoded = encodeMemberPaymentMetadata({
            registrationId: 'reg-123',
            viewToken: 'tok',
            charges: CHARGES,
        })

        expect(decodeSessionMetadata(encoded)).toEqual({
            type: 'member_payment',
            registrationId: 'reg-123',
            viewToken: 'tok',
            charges: CHARGES,
        })
    })

    /* Stripe metadata is flat strings with a 500-character value limit. */
    it('packs every charge into one value under the limit', () => {
        const encoded = encodeMemberPaymentMetadata({
            registrationId: 'reg-123',
            viewToken: 'tok',
            charges: CHARGES,
        })

        expect(Object.values(encoded).every((value) => typeof value === 'string')).toBe(true)
        expect(encoded.memberCharges.length).toBeLessThanOrEqual(500)
    })

    /* Fail closed: settling some members and silently dropping others would be worse than settling
       none and letting Sentry hear about the payment. */
    it.each([
        ['no charges', ''],
        ['a missing price', '11111111-1111-1111-1111-111111111111:'],
        ['a non-integer price', '11111111-1111-1111-1111-111111111111:12.5'],
        ['a zero price', '11111111-1111-1111-1111-111111111111:0'],
        ['an extra field', '11111111-1111-1111-1111-111111111111:100:7'],
        ['one bad charge among good ones', '11111111-1111-1111-1111-111111111111:100,:200'],
    ])('decodes %s as invalid', (_, memberCharges) => {
        expect(
            decodeSessionMetadata({
                type: 'member_payment',
                registrationId: 'reg-123',
                viewToken: 'tok',
                memberCharges,
            }),
        ).toBeNull()
    })

    it('decodes a session with no view token as invalid', () => {
        expect(
            decodeSessionMetadata({
                type: 'member_payment',
                registrationId: 'reg-123',
                memberCharges: '11111111-1111-1111-1111-111111111111:100',
            }),
        ).toBeNull()
    })
})
