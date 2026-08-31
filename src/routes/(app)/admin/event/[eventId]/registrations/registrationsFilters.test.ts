import { describe, expect, it } from 'vitest'
import { filterBookings } from './filterBookings'
import { filterDonations } from './filterDonations'
import { filterPeople } from './filterPeople'
import { lensFromUrl } from './registrationsViewUrl'
import { urlForLens } from './urlForLens'

/* What the organiser can actually see. These rules lived inside $derived expressions in a 710-line
   component, where nothing could reach them: the project has no component test harness at all. A
   filter that silently drops rows is indistinguishable from an empty year. */

type Booking = Parameters<typeof filterBookings>[0][number]
type Person = Parameters<typeof filterPeople>[0][number]
type Donation = Parameters<typeof filterDonations>[0][number]

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

const donation = (over: Partial<Donation>) =>
    ({
        id: 'd1',
        donorName: 'Ruth Patterson',
        donorEmail: 'ruth@example.com',
        message: null,
        amountCents: 5000,
        stripeFeeCents: null,
        status: 'paid',
        registrationId: null,
        paidAt: null,
        createdAt: new Date(),
        ...over,
    }) as Donation

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

/* Gifts, narrowed by the search box only. No status chips: the chips name registration statuses,
   and a gift's states are not those. */
describe('filterDonations', () => {
    const rows = [
        donation({ id: 'd1', donorName: 'Ruth Patterson', donorEmail: 'ruth@example.com' }),
        donation({
            id: 'd2',
            donorName: 'Wanda Trantow',
            donorEmail: 'wanda@example.com',
            status: 'pending',
        }),
    ]

    it('matches the donor name, case-insensitively', () => {
        expect(filterDonations(rows, { search: 'ruth' }).map((row) => row.id)).toEqual(['d1'])
    })

    it('matches the donor email', () => {
        expect(filterDonations(rows, { search: 'wanda@' }).map((row) => row.id)).toEqual(['d2'])
    })

    /* A pending gift is an abandoned checkout, and an organiser reconciling against Stripe is
       looking for exactly those — so the lens lists every status. */
    it('keeps gifts of every status', () => {
        expect(filterDonations(rows, { search: '' })).toHaveLength(2)
    })

    /* A common word in a dedication must not pull unrelated rows into a search for a name. */
    it('does not search the message', () => {
        const withMessage = [donation({ id: 'd3', message: 'In memory of Roxie' })]

        expect(filterDonations(withMessage, { search: 'Roxie' })).toHaveLength(0)
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

    it('reads donations from the parameter', () => {
        expect(lensFromUrl(new URL('http://x/admin/event/1/registrations?view=donations'))).toBe(
            'donations',
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
        const gifts = urlForLens(start, 'donations')

        expect(lensFromUrl(people)).toBe('people')
        expect(lensFromUrl(gifts)).toBe('donations')
        expect(lensFromUrl(urlForLens(people, 'bookings'))).toBe('bookings')
        expect(urlForLens(people, 'bookings').search).toBe('')
        /* Switching between the two non-default lenses must replace the value, not append. */
        expect(lensFromUrl(urlForLens(people, 'donations'))).toBe('donations')
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
