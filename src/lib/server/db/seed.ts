import { faker } from '@faker-js/faker'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { dbg } from '../debug'
import { hashManagementToken } from '../registrations/hashManagementToken'
import * as schema from './schema'

faker.seed(42)

const client = postgres(process.env.DATABASE_URL || 'postgresql://localhost:5432/family_reunion')
const db = drizzle(client, { schema })

const isReseed = process.argv.includes('--reseed')

const SOUTHERN_MENU_ITEMS = [
    'BBQ ribs',
    'Fried chicken',
    'Mac and cheese',
    'Collard greens',
    'Cornbread',
    'Peach cobbler',
    'Candied yams',
    'Black-eyed peas',
    'Potato salad',
    'Baked beans',
    'Grilled corn',
    'Coleslaw',
    'Banana pudding',
    'Sweet potato pie',
    'Fried catfish',
    'Smoked brisket',
    'Deviled eggs',
    'Watermelon',
    'Red velvet cake',
    'Lemon pound cake',
]

const DRINKS = [
    'Sweet tea',
    'Lemonade',
    'Fruit punch',
    'Water',
    'Juice boxes',
    'Soda',
    'Sparkling water',
    'Arnold Palmer',
]

const SCHEDULE_ACTIVITIES = [
    'Registration & Welcome',
    'Family Photo',
    'Lunch',
    'Dinner',
    'Breakfast',
    'Family Games',
    'Talent Show',
    'Kids Activities',
    'Group Hike',
    'Pool Party',
    'Family Meeting',
    'Award Ceremony',
    'Farewell Brunch',
    'Setup & Early Birds',
    'Movie Night',
    'Trivia Night',
    'Bonfire',
    'Dance',
]

const VENUE_SUFFIXES = ['Lodge', 'Resort', 'Pavilion', 'Park', 'Retreat', 'Estate', 'Gardens']

function randomVenue() {
    const city = faker.location.city()
    const state = faker.location.state({ abbreviated: true })
    const suffix = faker.helpers.arrayElement(VENUE_SUFFIXES)
    const name = `${faker.word.adjective({ strategy: 'closest' })} ${faker.location.county()} ${suffix}`
    return {
        name,
        address: `${faker.location.streetAddress()}, ${city}, ${state} ${faker.location.zipCode()}`,
        description: faker.lorem.sentence(),
    }
}

function randomMenu(): string[] {
    return faker.helpers.arrayElements(SOUTHERN_MENU_ITEMS, faker.number.int({ min: 5, max: 8 }))
}

function randomDrinks(): string[] {
    return faker.helpers.arrayElements(DRINKS, faker.number.int({ min: 3, max: 5 }))
}

function randomSchedule(days: string[]): { day: string; time: string; activity: string }[] {
    const hours = [9, 11, 12, 14, 17, 19]
    return days.flatMap((day) => {
        const count = faker.number.int({ min: 3, max: 5 })
        const activities = faker.helpers.arrayElements(SCHEDULE_ACTIVITIES, count)
        return activities.map((activity, i) => {
            const h = hours[i] ?? 10 + i
            const time = h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`
            return { day, time, activity }
        })
    })
}

async function seed() {
    if (!isReseed) {
        const existing = await db.select().from(schema.reunionEvents).limit(1)
        if (existing.length > 0) {
            dbg.seed('Data already exists, skipping seed. Use db:reseed to force.')
            await client.end()
            return
        }
    }

    dbg.seed('Truncating all tables...')
    await db.execute(sql`
		TRUNCATE TABLE
			party_members,
			registrations,
			reunion_events
		CASCADE
	`)

    const ADULT_PRICE_CENTS = 16000
    const CHILD_PRICE_CENTS = 10000

    dbg.seed('Seeding reunion events...')
    const events = await db
        .insert(schema.reunionEvents)
        .values([
            {
                year: 2024,
                title: 'Patterson Family Reunion',
                status: 'archived' as const,
                venue: randomVenue(),
                menu: randomMenu(),
                drinks: randomDrinks(),
                schedule: randomSchedule(['Saturday']),
            },
            {
                year: 2025,
                title: 'Patterson Family Reunion',
                status: 'closed' as const,
                venue: randomVenue(),
                menu: randomMenu(),
                drinks: randomDrinks(),
                schedule: randomSchedule(['Saturday', 'Sunday']),
            },
            {
                year: 2027,
                title: 'Patterson Family Reunion',
                status: 'open' as const,
                startDate: new Date('2027-07-23T16:00:00'),
                endDate: new Date('2027-07-25T12:00:00'),
                venue: {
                    name: 'OakStop',
                    address: '1721 Broadway, Oakland, CA 94612',
                    description: 'Mountain resort with hiking trails, pool, and conference rooms',
                },
                menu: ['TBD — voting opens soon!'],
                drinks: ['TBD'],
                recommendedSites: [
                    {
                        name: 'Blue Ridge Scenic Railway',
                        description: 'Historic train ride through the mountains',
                    },
                    { name: 'Mercier Orchards', description: 'U-pick fruit farm and bakery' },
                ],
                recommendedActivities: [
                    {
                        name: 'Group Hike',
                        description: 'Moderate 3-mile trail to waterfall overlook',
                    },
                    { name: 'Pool Party', description: 'Resort pool reserved Saturday afternoon' },
                ],
                schedule: [
                    { day: 'Friday', time: '4:00 PM', activity: 'Check-in & Welcome' },
                    { day: 'Saturday', time: '9:00 AM', activity: 'Breakfast' },
                    { day: 'Saturday', time: '10:00 AM', activity: 'Group Hike' },
                    { day: 'Saturday', time: '1:00 PM', activity: 'Lunch & Family Meeting' },
                    { day: 'Saturday', time: '3:00 PM', activity: 'Pool Party' },
                    { day: 'Saturday', time: '6:00 PM', activity: 'Dinner & Dance' },
                    { day: 'Sunday', time: '9:00 AM', activity: 'Farewell Brunch' },
                ],
            },
        ])
        .returning()

    dbg.seed('Seeding tiers...')
    await db.insert(schema.tiers).values(
        events.flatMap((event) => [
            {
                eventId: event.id,
                label: 'Adult',
                priceCents: ADULT_PRICE_CENTS,
                shirtSizeCategory: 'adult' as const,
            },
            {
                eventId: event.id,
                label: 'Child',
                priceCents: CHILD_PRICE_CENTS,
                shirtSizeCategory: 'child' as const,
            },
        ]),
    )

    dbg.seed('Seeding registrations...')
    const ADULT_AGE_CUTOFF = 18
    for (const event of events) {
        const numRegistrations =
            event.status === 'open'
                ? faker.number.int({ min: 5, max: 7 })
                : faker.number.int({ min: 8, max: 10 })

        for (let r = 0; r < numRegistrations; r++) {
            const numParty = faker.number.int({ min: 1, max: 4 })
            const status =
                event.status === 'open' && faker.datatype.boolean()
                    ? ('pending' as const)
                    : ('paid' as const)

            const partyData = Array.from({ length: numParty }, () => {
                const birthDate = faker.date.birthdate({ mode: 'age', min: 2, max: 70 })
                const birthYear = birthDate.getFullYear()
                const birthMonth = birthDate.getMonth() + 1
                const birthDay = birthDate.getDate()
                const age = new Date().getFullYear() - birthYear
                const isAdult = age >= ADULT_AGE_CUTOFF
                return {
                    name: faker.person.fullName(),
                    birthYear,
                    birthMonth,
                    birthDay,
                    tierLabel: isAdult ? 'Adult' : 'Child',
                    priceCents: isAdult ? ADULT_PRICE_CENTS : CHILD_PRICE_CENTS,
                }
            })
            const contactName = partyData[0].name
            const contactEmail = faker.internet
                .email({ firstName: contactName.split(' ')[0] })
                .toLowerCase()
            const managementToken = crypto.randomUUID().replace(/-/g, '')
            const managementTokenHash = hashManagementToken(managementToken)

            const [reg] = await db
                .insert(schema.registrations)
                .values({
                    managementToken: managementTokenHash,
                    contactName,
                    contactEmail,
                    eventId: event.id,
                    stripeSessionId:
                        status === 'paid' ? `cs_test_${crypto.randomUUID().slice(0, 24)}` : null,
                    status,
                })
                .returning()

            await db.insert(schema.partyMembers).values(
                partyData.map((p) => ({
                    registrationId: reg.id,
                    name: p.name,
                    birthYear: p.birthYear,
                    birthMonth: p.birthMonth,
                    birthDay: p.birthDay,
                    tierLabel: p.tierLabel,
                    priceCents: p.priceCents,
                })),
            )
        }
    }

    dbg.seed('Seed complete!')
    await client.end()
}

seed().catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
})
