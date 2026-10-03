import { describe, expect, it } from 'vitest'
import { diffContact, type ContactValues } from './_diffContact'

const CONTACT: ContactValues = {
    contactName: 'Alice Patterson',
    contactEmail: 'alice@example.com',
    contactPhone: null,
    stayingAtHostHotel: 'undecided',
}

describe('diffContact', () => {
    it('reports nothing when no value moved', () => {
        expect(diffContact(CONTACT, { ...CONTACT })).toEqual([])
    })

    /* The email change is the one most worth showing in full: a typo fixed into another typo is
       exactly what a registrant reading old → new can catch. */
    it('reports each edited field as before → after', () => {
        expect(
            diffContact(CONTACT, {
                ...CONTACT,
                contactEmail: 'alice.p@example.com',
                contactPhone: '(510) 555-0100',
                stayingAtHostHotel: 'yes',
            }),
        ).toEqual([
            {
                summary: 'Contact email',
                before: 'alice@example.com',
                after: 'alice.p@example.com',
            },
            { summary: 'Phone', before: 'Not given', after: '(510) 555-0100' },
            { summary: 'Staying at the host hotel', before: 'Not sure yet', after: 'Yes' },
        ])
    })
})
