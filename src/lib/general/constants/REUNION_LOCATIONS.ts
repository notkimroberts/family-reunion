import type { ReunionLocation } from './ReunionLocation'

/* Host hotel and venue shown on the homepage.

   mapQuery is the business name as Google Maps resolves it, not a street address: the keyless
   `maps?q=…&output=embed` endpoint geocodes a business name directly, so the map and the
   directions link both work without hard-coding an address that could go stale.

   details are left empty where the fact is not confirmed. Do not guess a phone number,
   check-in time or group rate here — an attendee will act on it. */
export const REUNION_LOCATIONS: ReunionLocation[] = [
    {
        kind: 'venue',
        badge: 'Reunion Venue',
        name: 'Oakstop',
        tagline: 'Where the reunion is held — event space in the heart of Uptown Oakland.',
        websiteUrl: 'https://oakstop.com',
        imageUrl: '/oakstop.jpg',
        mapQuery: 'Oakstop, Oakland, CA',
        details: [],
    },
    {
        kind: 'hotel',
        badge: 'Host Hotel',
        name: 'Kissel Uptown Oakland',
        tagline: 'Our recommended stay, a short walk from the venue in Uptown Oakland.',
        websiteUrl: 'https://www.kisseloakland.com',
        mapQuery: 'Kissel Uptown Oakland, Oakland, CA',
        details: [],
    },
]
