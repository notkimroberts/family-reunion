import { describe, expect, it } from 'vitest'
import { toRegistrationIntake } from './toRegistrationIntake'

/* The normalisation that both registration routes depend on and neither may own.

   It is deliberately NOT in the zod schema: the schemas are shared with client-side validation,
   where a transform would rewrite what someone is halfway through typing. */

const SELF = {
    tierId: 'tier-adult',
    birthDate: '1980-04-02',
    shirtSize: 'M',
    addressLine1: '1 Main St',
    addressLine2: '',
    addressCity: 'Oakland',
    addressState: 'CA',
    addressZip: '94612',
    vegetarianMeal: 'yes',
    attendedReunion2025: 'no',
} as const

const FORM = {
    contactFirstName: 'Alice',
    contactLastName: 'Patterson',
    contactEmail: 'alice@example.com',
    contactPhone: '5105550123',
    self: SELF,
    members: [],
    stayingAtHostHotel: 'yes' as const,
}

describe('toRegistrationIntake', () => {
    it('joins the two name fields into one contact name', () => {
        expect(toRegistrationIntake(FORM).contactName).toBe('Alice Patterson')
    })

    it('trims each name part and the join', () => {
        const intake = toRegistrationIntake({
            ...FORM,
            contactFirstName: '  Alice ',
            contactLastName: ' Patterson  ',
        })

        expect(intake.contactName).toBe('Alice Patterson')
    })

    /* A missing surname must not leave a trailing space on the stored name — it reaches the
       confirmation email and the name badge. */
    it('leaves no trailing space when a name part is empty', () => {
        expect(toRegistrationIntake({ ...FORM, contactLastName: '' }).contactName).toBe('Alice')
    })

    /* NOT cosmetic. /register/recover matches on exact contact email, so an address stored as typed
       is a registrant who cannot recover their own management link. */
    it('lowercases and trims the email', () => {
        const intake = toRegistrationIntake({ ...FORM, contactEmail: '  Alice@Example.COM ' })

        expect(intake.contactEmail).toBe('alice@example.com')
    })

    /* '' cannot survive validation on the public form, but if it ever reaches here it must store
       nothing rather than a guess: the column's null means NEVER ASKED. */
    it('turns an unanswered hotel question into undefined rather than an empty string', () => {
        expect(
            toRegistrationIntake({ ...FORM, stayingAtHostHotel: '' }).stayingAtHostHotel,
        ).toBeUndefined()
    })

    it('passes the hotel answer through untouched', () => {
        expect(
            toRegistrationIntake({ ...FORM, stayingAtHostHotel: 'undecided' }).stayingAtHostHotel,
        ).toBe('undecided')
    })

    it('turns an empty phone into undefined rather than an empty string', () => {
        expect(toRegistrationIntake({ ...FORM, contactPhone: '' }).contactPhone).toBeUndefined()
    })

    /* The contact is an attendee too, and both create paths flag index 0. */
    it('puts the contact first, carrying their own details', () => {
        const intake = toRegistrationIntake(FORM)

        expect(intake.members[0]).toMatchObject({
            name: 'Alice Patterson',
            tierId: 'tier-adult',
            birthDate: '1980-04-02',
            addressCity: 'Oakland',
        })
    })

    it('decodes the contact’s yes/no answers into booleans', () => {
        const intake = toRegistrationIntake(FORM)

        expect(intake.members[0]).toMatchObject({
            vegetarianMeal: true,
            attendedReunion2025: false,
        })
    })

    it('appends the guests after the contact, in order', () => {
        const intake = toRegistrationIntake({
            ...FORM,
            members: [
                { ...SELF, name: 'Bo Patterson', tierId: 'tier-child' },
                { ...SELF, name: 'Marcus Patterson', tierId: 'tier-adult' },
            ],
        })

        expect(intake.members.map((member) => member.name)).toEqual([
            'Alice Patterson',
            'Bo Patterson',
            'Marcus Patterson',
        ])
    })

    /* Absent is not the same as false: catering reads these two columns and "no answer" is not
       "no". An empty string is what the form posts before anyone picks. */
    it('leaves an unanswered question undefined rather than false', () => {
        const intake = toRegistrationIntake({
            ...FORM,
            self: { ...SELF, vegetarianMeal: '' as const, attendedReunion2025: '' as const },
        })

        expect(intake.members[0].vegetarianMeal).toBeUndefined()
        expect(intake.members[0].attendedReunion2025).toBeUndefined()
    })

    it('turns an empty optional detail into undefined', () => {
        const intake = toRegistrationIntake({
            ...FORM,
            self: { ...SELF, birthDate: '', shirtSize: '' },
        })

        expect(intake.members[0].birthDate).toBeUndefined()
        expect(intake.members[0].shirtSize).toBeUndefined()
    })
})
