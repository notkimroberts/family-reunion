import { describe, expect, it } from 'vitest'
import type { EventPerson } from '$lib/server/registrations'
import { groupPeopleByBooking } from './groupPeopleByBooking'

/* A person as getEventPeople returns them. Only the four fields the grouping reads are meaningful;
   the rest exist because EventPerson is the real type and an ad-hoc one would drift from it. */
function person(overrides: Partial<EventPerson> & Pick<EventPerson, 'id'>): EventPerson {
    return {
        name: 'Attendee',
        birthYear: null,
        birthMonth: null,
        birthDay: null,
        tierLabel: 'Adult',
        priceCents: 16000,
        shirtSize: null,
        vegetarianMeal: null,
        attendedReunion2025: null,
        isContact: false,
        registrationId: 'reg-1',
        contactName: 'Alice Patterson',
        contactEmail: 'alice@example.com',
        status: 'paid',
        checkedInAt: null,
        checkedInBy: null,
        shirtGivenAt: null,
        ...overrides,
    }
}

describe('groupPeopleByBooking', () => {
    it('counts a party that is only half here', () => {
        const groups = groupPeopleByBooking([
            person({ id: '1', name: 'Alice', checkedInAt: new Date() }),
            person({ id: '2', name: 'Marcus', checkedInAt: new Date() }),
            person({ id: '3', name: 'Junior' }),
        ])

        expect(groups).toHaveLength(1)
        expect(groups[0]).toMatchObject({ arrivedCount: 2, contactName: 'Alice Patterson' })
        expect(groups[0].members).toHaveLength(3)
    })

    it('counts a party with nobody arrived as zero', () => {
        const groups = groupPeopleByBooking([person({ id: '1' }), person({ id: '2' })])

        expect(groups[0].arrivedCount).toBe(0)
    })

    it('handles a party of one', () => {
        const groups = groupPeopleByBooking([person({ id: '1', checkedInAt: new Date() })])

        expect(groups).toEqual([
            expect.objectContaining({ arrivedCount: 1, registrationId: 'reg-1' }),
        ])
    })

    /* getEventPeople orders by contact then person, and the groups must come out in that same order —
       a list that reshuffles as people are ticked in is unusable at a door. */
    it('keeps the query’s order and splits by booking', () => {
        const groups = groupPeopleByBooking([
            person({ id: '1', registrationId: 'reg-a', contactName: 'Alice' }),
            person({ id: '2', registrationId: 'reg-a', contactName: 'Alice' }),
            person({ id: '3', registrationId: 'reg-b', contactName: 'Bob' }),
        ])

        expect(groups.map((group) => group.contactName)).toEqual(['Alice', 'Bob'])
        expect(groups.map((group) => group.members.length)).toEqual([2, 1])
    })

    it('returns nothing for an empty list', () => {
        expect(groupPeopleByBooking([])).toEqual([])
    })
})
