import { describe, expect, it, vi } from 'vitest'
import { renderRegistrationConfirmation } from './renderRegistrationConfirmation'
import type { RegistrationConfirmationData } from './types'

/* A host hotel with no room block: no bookingUrl, no bookingDeadline. Both fields are optional
   because a year without a negotiated block is a legitimate state, and this is the only place the
   fallback is exercised — email.test.ts mocks a hotel that HAS a block, and index.test.ts mocks no
   hotel at all. Its own file rather than a second describe: the constants mock is module-level. */
vi.mock('$lib/general/constants', () => ({
    APP_NAME: 'Family Reunion',
    APP_DOMAIN: 'example.com',
    CONTACT_EMAIL: 'organiser@example.com',
    CONTACT_PHONE: '+1 555 0100',
    HOST_HOTEL: {
        kind: 'hotel',
        badge: 'Host Hotel',
        name: 'Kissel Uptown Oakland',
        tagline: 'A short walk from the venue.',
        websiteUrl: 'https://example.com/hotel',
        mapQuery: 'Kissel Uptown Oakland',
        details: [],
    },
}))

const data: RegistrationConfirmationData = {
    name: 'Alice',
    eventTitle: 'Roberts Family Reunion 2026',
    eventDateRange: 'July 23 – 25, 2027',
    venueName: 'Lakeside Lodge',
    venueAddress: '1 Lake Road, Springfield',
    status: 'paid',
    partyMembers: [{ name: 'Alice', tierLabel: 'Adult', priceCents: 10000 }],
    totalCents: 10000,
    manageUrl: 'https://example.com/register/manage?token=tok',
}

describe('renderRegistrationConfirmation without a room block', () => {
    it('falls back to the hotel website when there is no booking link', () => {
        const { text, html } = renderRegistrationConfirmation(data)
        expect(text).toContain('https://example.com/hotel')
        expect(html).toContain('href="https://example.com/hotel"')
    })

    /* No deadline to state, and inventing one would send people to a rate that does not exist. */
    it('says nothing about a rate holding when there is no deadline', () => {
        const { text, html } = renderRegistrationConfirmation(data)
        expect(text).not.toContain('holds until')
        expect(html).not.toContain('holds until')
    })
})
