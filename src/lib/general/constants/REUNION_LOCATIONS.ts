import type { ParkingOption } from './ParkingOption'
import type { ReunionLocation } from './ReunionLocation'

/* Host hotel and venue shown on the homepage.

   mapQuery drives both the embedded map and the directions link through the keyless
   `maps?q=…&output=embed` endpoint. A business name alone is not always enough: Oakstop has two
   buildings on Broadway (1721 and 2323), and "Oakstop, Oakland, CA" can resolve to either. Where a
   name is ambiguous, the query carries the street address too.

   address, details and parking are left out where the fact is not confirmed. Do not guess an
   address, phone number, check-in time, group rate or parking price here — an attendee will act
   on it. */

const LOCAL_PARKING: ParkingOption[] = [
    {
        name: 'YMCA Garage',
        price: '$25',
        address: '2353 Webster Street',
        walk: '4 min walk to venue and hotel',
    },
    {
        name: 'The Hive',
        price: '$30',
        address: '2335 Broadway Street',
        walk: '2 min walk to venue and hotel',
    },
]
export const REUNION_LOCATIONS: ReunionLocation[] = [
    {
        kind: 'venue',
        badge: 'Reunion Venue',
        name: 'Oakstop',
        address: '2323 Broadway, Oakland, CA',
        tagline: 'Where the reunion is held — event space in the heart of Uptown Oakland.',
        websiteUrl: 'https://oakstop.com',
        instagramUrl: 'https://www.instagram.com/oakstop',
        imageUrl: '/oakstop.jpg',
        mapQuery: 'Oakstop, 2323 Broadway, Oakland, CA',
        parking: LOCAL_PARKING,
        details: [],
    },
    {
        kind: 'hotel',
        badge: 'Host Hotel',
        name: 'Kissel Uptown Oakland',
        address: '2455 Broadway, Oakland, CA',
        tagline: 'Our recommended stay, half a block from the venue in Uptown Oakland.',
        websiteUrl: 'https://www.kisseloakland.com',
        bookingUrl: 'https://www.hyatt.com/events/en-US/group-booking/OAKUB/G-PAT1',
        bookingDeadline: 'June 20, 2027',
        instagramUrl: 'https://www.instagram.com/kisseluptownoakland/',
        imageUrl: '/kissel-uptown-oakland.jpg',
        mapQuery: 'Kissel Uptown Oakland, Oakland, CA',
        details: [
            { label: 'King', value: '$189 / night' },
            { label: 'Double queen', value: '$239 / night' },
        ],
        parking: [
            {
                name: 'Valet (Overnight)',
                price: '$55',
            },
            {
                name: 'Valet (Hourly)',
                price: '$10',
            },
            ...LOCAL_PARKING,
        ],
    },
]
