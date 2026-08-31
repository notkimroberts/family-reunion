import { describe, expect, it } from 'vitest'
import { hasRegistrationEdits } from './hasRegistrationEdits'
import type { MemberRow } from './memberRow'

const CONTACT_ROW: MemberRow = {
    memberId: 'member-1',
    name: 'Alice Patterson',
    tierId: 'tier-adult',
    initialTierId: 'tier-adult',
    birthDate: '1980-05-05',
    shirtSize: 'L',
    vegetarianMeal: 'no',
    attendedReunion2025: 'yes',
    priceCents: 16000,
    isContact: true,
}

const OTHER_ROW: MemberRow = {
    memberId: 'member-2',
    name: 'Bo Patterson',
    tierId: 'tier-child',
    initialTierId: 'tier-child',
    birthDate: undefined,
    shirtSize: 'YM',
    vegetarianMeal: '',
    attendedReunion2025: '',
    priceCents: 10000,
    isContact: false,
}

const LOADED_FORM = {
    contactName: 'Alice Patterson',
    contactEmail: 'alice@example.com',
    contactPhone: '',
    /* '' as the loader leaves it for a booking taken before the hotel question existed. */
    stayingAtHostHotel: '' as const,
    status: 'pending' as const,
    /* Empty as the loader leaves them: `rows` is the editing surface, and onSubmit fills these in
       only at submit time. */
    members: [],
    newMembers: [],
    removedMemberIds: [],
}

const UNTOUCHED = {
    form: LOADED_FORM,
    initialForm: LOADED_FORM,
    rows: [CONTACT_ROW, OTHER_ROW],
    initialRows: [CONTACT_ROW, OTHER_ROW],
    removedCount: 0,
    newMemberCount: 0,
}

describe('hasRegistrationEdits', () => {
    it('reports no edits on a freshly opened form', () => {
        expect(hasRegistrationEdits(UNTOUCHED)).toBe(false)
    })

    it.each([
        ['contactName', { contactName: 'Alice Roberts' }],
        ['contactEmail', { contactEmail: 'alice@new.example.com' }],
        /* Booking-level like the fields above it, and Save has to notice it on its own — an organiser
           who only answers the hotel question has made a real edit. */
        ['stayingAtHostHotel', { stayingAtHostHotel: 'yes' as const }],
        ['contactPhone', { contactPhone: '5105551234' }],
        ['status', { status: 'paid' as const }],
    ])('detects a changed %s', (_label, override) => {
        expect(hasRegistrationEdits({ ...UNTOUCHED, form: { ...LOADED_FORM, ...override } })).toBe(
            true,
        )
    })

    /* Every field PartyMemberFields can write. The JSON comparison covers them without being told,
       so this pins the behaviour rather than the implementation — including the contact's name, which
       is edited through the Contact field and lands on their row. */
    it.each([
        ['name', { name: 'Bobby Patterson' }],
        ['tierId', { tierId: 'tier-adult' }],
        ['birthDate', { birthDate: '2015-01-01' }],
        ['shirtSize', { shirtSize: 'YL' }],
        ['vegetarianMeal', { vegetarianMeal: 'yes' as const }],
        ['attendedReunion2025', { attendedReunion2025: 'no' as const }],
    ])("detects a changed %s on a member's row", (_label, override) => {
        expect(
            hasRegistrationEdits({
                ...UNTOUCHED,
                rows: [CONTACT_ROW, { ...OTHER_ROW, ...override }],
            }),
        ).toBe(true)
    })

    it('detects a staged removal', () => {
        expect(hasRegistrationEdits({ ...UNTOUCHED, removedCount: 1 })).toBe(true)
    })

    it('detects a staged addition', () => {
        expect(hasRegistrationEdits({ ...UNTOUCHED, newMemberCount: 1 })).toBe(true)
    })

    /* A removal undone by "Keep", or an addition deleted again, leaves nothing to save. */
    it('reports no edits once staged changes are taken back', () => {
        expect(hasRegistrationEdits({ ...UNTOUCHED, removedCount: 0, newMemberCount: 0 })).toBe(
            false,
        )
    })

    /* The loader sends '' for a null phone while the schema makes it optional, so an untouched form
       can hold either spelling. Neither is an edit. */
    it('treats an absent phone and an empty phone as the same', () => {
        expect(
            hasRegistrationEdits({
                ...UNTOUCHED,
                form: { ...LOADED_FORM, contactPhone: undefined },
            }),
        ).toBe(false)
    })

    /* form.members is deliberately not compared: onSubmit writes the staged rows into it, and a
       refused save must leave Save available to retry rather than looking already applied. */
    it('ignores form.members, which onSubmit fills in at submit time', () => {
        expect(
            hasRegistrationEdits({
                ...UNTOUCHED,
                form: {
                    ...LOADED_FORM,
                    members: [
                        {
                            memberId: OTHER_ROW.memberId,
                            name: OTHER_ROW.name,
                            birthDate: '',
                            shirtSize: OTHER_ROW.shirtSize,
                            vegetarianMeal: OTHER_ROW.vegetarianMeal,
                            attendedReunion2025: OTHER_ROW.attendedReunion2025,
                        },
                    ],
                },
            }),
        ).toBe(false)
    })
})
