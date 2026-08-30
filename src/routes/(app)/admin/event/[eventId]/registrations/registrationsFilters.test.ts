import { describe, it, expect } from 'vitest'
import { filterBookings } from './filterBookings'
import { filterPeople } from './filterPeople'
import { lensFromUrl } from './registrationsViewUrl'
import { urlForLens } from './urlForLens'

/* What the organiser can actually see. These rules lived inside $derived expressions in a 710-line
   component, where nothing could reach them: the project has no component test harness at all. A
   filter that silently drops rows is indistinguishable from an empty year. */

type Booking = Parameters<typeof filterBookings>[0][number]
type Person = Parameters<typeof filterPeople>[0][number]

const booking = (over: Partial<Booking>) =>
    ({
        id: 'r1',
        contactName: 'Alice Patterson',
        contactEmail: 'alice@example.com',
        status: 'paid',
        memberCount: 1,
        totalCents: 16509,
        stripeSessionId: 'cs_1',
        stripeFeeCents: 509,
        createdAt: new Date(),
        paidAt: null,
        ...over,
    }) as Booking

const person = (over: Partial<Person>) =>
    ({ id: 'p1', name: 'Bo Patterson', contactName: 'Alice Patterson', ...over }) as Person

describe('filterBookings', () => {
    const rows = [
        booking({ id: 'r1', contactName: 'Alice Patterson', status: 'paid' }),
        booking({
            id: 'r2',
            contactName: 'Wanda Trantow',
            contactEmail: 'wanda@example.com',
            status: 'pending',
        }),
    ]

    /* undefined is the unfiltered chip — "All" is not a status, so it cannot be a value. */
    it('returns everything when no status is chosen', () => {
        expect(filterBookings(rows, { search: '', status: undefined })).toHaveLength(2)
    })

    it('narrows to one status', () => {
        const result = filterBookings(rows, { search: '', status: 'pending' })

        expect(result.map((row) => row.id)).toEqual(['r2'])
    })

    it('matches the contact name case-insensitively', () => {
        expect(filterBookings(rows, { search: 'PATTERSON', status: undefined })).toHaveLength(1)
    })

    it('matches the contact email too', () => {
        const result = filterBookings(rows, { search: 'wanda@', status: undefined })

        expect(result.map((row) => row.id)).toEqual(['r2'])
    })

    /* A trailing space arrives free from a phone keyboard. Untrimmed it would empty the list. */
    it('ignores surrounding whitespace in the term', () => {
        expect(filterBookings(rows, { search: '  patterson  ', status: undefined })).toHaveLength(1)
    })

    it('combines the status chip and the search term', () => {
        expect(filterBookings(rows, { search: 'patterson', status: 'pending' })).toHaveLength(0)
    })

    it('returns nothing rather than everything for a term that matches nobody', () => {
        expect(filterBookings(rows, { search: 'nobody', status: undefined })).toHaveLength(0)
    })
})

describe('filterPeople', () => {
    const rows = [
        person({ id: 'p1', name: 'Bo Patterson', contactName: 'Alice Patterson' }),
        person({ id: 'p2', name: 'Junior Trantow', contactName: 'Wanda Trantow' }),
    ]

    /* An organiser is as likely to be handed "the Pattersons" as a first name, and a child's own
       name may not be the one on the booking. */
    it('matches whoever registered the person, not just the person', () => {
        const result = filterPeople(rows, { search: 'alice' })

        expect(result.map((row) => row.id)).toEqual(['p1'])
    })

    it('matches the person’s own name', () => {
        expect(filterPeople(rows, { search: 'junior' }).map((row) => row.id)).toEqual(['p2'])
    })

    it('returns everyone for a blank term', () => {
        expect(filterPeople(rows, { search: '   ' })).toHaveLength(2)
    })
})

describe('the lens in the URL', () => {
    it('defaults to bookings when the parameter is absent', () => {
        expect(lensFromUrl(new URL('http://x/admin/event/1/registrations'))).toBe('bookings')
    })

    it('reads people from the parameter', () => {
        expect(lensFromUrl(new URL('http://x/admin/event/1/registrations?view=people'))).toBe(
            'people',
        )
    })

    /* Anything else is not a lens. Falling back to bookings beats rendering nothing. */
    it('falls back to bookings for an unrecognised value', () => {
        expect(lensFromUrl(new URL('http://x/r?view=chairs'))).toBe('bookings')
    })

    /* Bookings DELETES the parameter rather than setting view=bookings, so the two spellings of the
       default cannot exist at once and disagree with lensFromUrl. */
    it('round-trips through urlForLens', () => {
        const start = new URL('http://x/admin/event/1/registrations')
        const people = urlForLens(start, 'people')

        expect(lensFromUrl(people)).toBe('people')
        expect(lensFromUrl(urlForLens(people, 'bookings'))).toBe('bookings')
        expect(urlForLens(people, 'bookings').search).toBe('')
    })

    it('leaves every other query parameter alone', () => {
        const url = urlForLens(new URL('http://x/r?page=3&q=smith'), 'people')

        expect(url.searchParams.get('page')).toBe('3')
        expect(url.searchParams.get('q')).toBe('smith')
    })

    it('does not mutate the URL it is given', () => {
        const start = new URL('http://x/r')

        urlForLens(start, 'people')

        expect(start.search).toBe('')
    })
})
