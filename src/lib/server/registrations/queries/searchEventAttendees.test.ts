import { beforeEach, describe, expect, it } from 'vitest'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedEvent } from '$lib/server/testing/seedEvent'
import { seedRegistration } from '$lib/server/testing/seedRegistration'

/* The check-in page's "not on the list" search. What matters is that it finds exactly the people
   getEventPeople leaves out, and nobody from another year. */

const { searchEventAttendees } = await import('./searchEventAttendees')

let db: Awaited<ReturnType<typeof resetTestDb>>
let eventId: string

async function seedParty(
    status: 'pending' | 'paid' | 'refunded' | 'waived',
    contactName: string,
    names: readonly string[],
    options: { eventId?: string } = {},
) {
    return seedRegistration(db, {
        eventId: options.eventId ?? eventId,
        status,
        contactName,
        members: names.map((name) => ({ name, priceCents: 16000 })),
    })
}

describe('searchEventAttendees', () => {
    beforeEach(async () => {
        db = await resetTestDb()
        eventId = await seedEvent(db)
    })

    it('finds an attendee whose checkout was never completed', async () => {
        await seedParty('pending', 'Alice Patterson', ['Alice Patterson', 'Marcus Patterson'])

        const found = await searchEventAttendees(eventId, 'marcus')

        expect(found).toHaveLength(1)
        expect(found[0]).toMatchObject({ name: 'Marcus Patterson', status: 'pending' })
    })

    it('finds a refunded booking, so a cancelled name is explained rather than absent', async () => {
        await seedParty('refunded', 'Dana Reed', ['Dana Reed'])

        const found = await searchEventAttendees(eventId, 'reed')

        expect(found).toMatchObject([{ name: 'Dana Reed', status: 'refunded' }])
    })

    /* These are the rows the check-in list already has. Returning them here would show the same
       person twice, once tickable and once not. */
    it('excludes paid and waived attendees', async () => {
        await seedParty('paid', 'Paid Party', ['Paid Person'])
        await seedParty('waived', 'Comped Party', ['Comped Person'])

        expect(await searchEventAttendees(eventId, 'person')).toEqual([])
    })

    it('matches the contact name, not only the attendee', async () => {
        await seedParty('pending', 'Alice Patterson', ['Alice Patterson', 'Junior'])

        const found = await searchEventAttendees(eventId, 'patterson')

        expect(found.map((person) => person.name)).toEqual(['Alice Patterson', 'Junior'])
    })

    it('never returns another year’s attendee', async () => {
        const otherEventId = await seedEvent(db, { year: 2025, status: 'closed' })
        await seedParty('pending', 'Old Timer', ['Old Timer'], { eventId: otherEventId })

        expect(await searchEventAttendees(eventId, 'old')).toEqual([])
    })

    it('returns nothing for an empty search rather than the whole year', async () => {
        await seedParty('pending', 'Alice Patterson', ['Alice Patterson'])

        expect(await searchEventAttendees(eventId, '   ')).toEqual([])
    })
})
