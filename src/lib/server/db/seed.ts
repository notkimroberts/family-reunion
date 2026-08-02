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

const FAMILY_LAST_NAME = 'Patterson'

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

type RelationshipType = (typeof schema.relationshipTypeEnum.enumValues)[number]

interface FamilyMember {
    name: string
    birthYear: number
    birthMonth: number
    birthDay: number
    generation: number
    spouseIndex?: number
    parentIndices?: number[]
}

const ANCESTOR_TYPE_MAP: Record<
    number,
    { ancestor: RelationshipType; descendant: RelationshipType }
> = {
    1: { ancestor: 'parent', descendant: 'child' },
    2: { ancestor: 'grandparent', descendant: 'grandchild' },
    3: { ancestor: 'great_grandparent', descendant: 'great_grandchild' },
    4: { ancestor: 'great_great_grandparent', descendant: 'great_great_grandchild' },
    5: {
        ancestor: 'great_great_great_grandparent',
        descendant: 'great_great_great_grandchild',
    },
    6: {
        ancestor: 'great_great_great_great_grandparent',
        descendant: 'great_great_great_great_grandchild',
    },
    7: {
        ancestor: 'great_great_great_great_great_grandparent',
        descendant: 'great_great_great_great_great_grandchild',
    },
}

function randomBirthDate(
    minYear: number,
    maxYear: number,
): {
    birthYear: number
    birthMonth: number
    birthDay: number
} {
    const date = faker.date.birthdate({ mode: 'year', min: minYear, max: maxYear })
    return {
        birthYear: date.getFullYear(),
        birthMonth: date.getMonth() + 1,
        birthDay: date.getDate(),
    }
}

function makeMember(
    firstName: string,
    lastName: string,
    minYear: number,
    maxYear: number,
    generation: number,
    extra: Partial<FamilyMember> = {},
): FamilyMember {
    return {
        name: `${firstName} ${lastName}`,
        ...randomBirthDate(minYear, maxYear),
        generation,
        ...extra,
    }
}

function buildFamilyTree(): FamilyMember[] {
    const members: FamilyMember[] = []

    function addCouple(
        gen: number,
        minYear: number,
        maxYear: number,
        parentIndices?: number[],
    ): [number, number] {
        const husbandIdx = members.length
        members.push(
            makeMember(
                faker.person.firstName('male'),
                FAMILY_LAST_NAME,
                minYear,
                maxYear,
                gen,
                parentIndices ? { parentIndices } : {},
            ),
        )
        const wifeIdx = members.length
        members.push(
            makeMember(
                faker.person.firstName('female'),
                faker.person.lastName(),
                minYear,
                maxYear,
                gen,
                {
                    spouseIndex: husbandIdx,
                },
            ),
        )
        members[husbandIdx].spouseIndex = wifeIdx
        return [husbandIdx, wifeIdx]
    }

    function addChild(
        gen: number,
        minYear: number,
        maxYear: number,
        parentIndices: number[],
    ): number {
        const isMale = faker.datatype.boolean()
        const idx = members.length
        members.push(
            makeMember(
                faker.person.firstName(isMale ? 'male' : 'female'),
                FAMILY_LAST_NAME,
                minYear,
                maxYear,
                gen,
                { parentIndices },
            ),
        )
        return idx
    }

    // Gen 1: great×5 grandparents — 1 founding couple (~1870)
    const [g1h, g1w] = addCouple(1, 1865, 1878)

    // Gen 2: great×4 grandparents — 2 couples (~1893-1900), children of gen1
    const [g2h1, g2w1] = addCouple(2, 1890, 1902, [g1h, g1w])
    const [g2h2, g2w2] = addCouple(2, 1892, 1904, [g1h, g1w])

    // Gen 3: great×3 grandparents — 4 couples (~1915-1925)
    const gen2Parents = [
        [g2h1, g2w1],
        [g2h2, g2w2],
    ]
    const gen3Couples: [number, number][] = gen2Parents.flatMap(([p1, p2]) =>
        Array.from({ length: 2 }, () => addCouple(3, 1913, 1928, [p1, p2])),
    )

    // Gen 4: great×2 grandparents — 8 couples (~1935-1948)
    const gen4Couples: [number, number][] = gen3Couples.flatMap(([p1, p2]) =>
        Array.from({ length: 2 }, () => addCouple(4, 1933, 1950, [p1, p2])),
    )

    // Gen 5: great grandparents — children of gen4 (~1955-1970)
    const gen5Members: number[] = gen4Couples.flatMap(([p1, p2]) => {
        const count = faker.number.int({ min: 1, max: 2 })
        return Array.from({ length: count }, () => addChild(5, 1953, 1972, [p1, p2]))
    })

    // Gen 6: grandparents — children of gen5 (~1972-1987)
    const gen6Members: number[] = gen5Members.flatMap((idx) => {
        const count = faker.number.int({ min: 1, max: 2 })
        return Array.from({ length: count }, () => addChild(6, 1970, 1988, [idx]))
    })

    // Gen 7: parents — children of gen6 (~1990-2008)
    const gen7Members: number[] = gen6Members.flatMap((idx) => {
        const count = faker.number.int({ min: 1, max: 2 })
        return Array.from({ length: count }, () => addChild(7, 1988, 2010, [idx]))
    })

    // Gen 8: children — pad total to 100
    const gen8Parents = [...gen7Members, ...gen6Members]
    let gen8Idx = 0
    while (members.length < 100) {
        const parentIdx = gen8Parents[gen8Idx % gen8Parents.length]
        addChild(8, 2005, 2022, [parentIdx])
        gen8Idx++
    }

    return members
}

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
			photos,
			party_members,
			registrations,
			relationships,
			family_members,
			reunion_events
		CASCADE
	`)

    const ADULT_PRICE_CENTS = 16000
    const CHILD_PRICE_CENTS = 10000

    const shopProducts = Array.from({ length: 3 }, () => ({
        name: faker.commerce.productName(),
        imageUrl: `https://picsum.photos/seed/${faker.string.alphanumeric(8)}/400/400`,
        description: faker.commerce.productDescription(),
    }))

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
                adultPriceCents: ADULT_PRICE_CENTS,
                childPriceCents: CHILD_PRICE_CENTS,
            },
            {
                year: 2025,
                title: 'Patterson Family Reunion',
                status: 'closed' as const,
                venue: randomVenue(),
                menu: randomMenu(),
                drinks: randomDrinks(),
                schedule: randomSchedule(['Saturday', 'Sunday']),
                adultPriceCents: ADULT_PRICE_CENTS,
                childPriceCents: CHILD_PRICE_CENTS,
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
                adultPriceCents: ADULT_PRICE_CENTS,
                childPriceCents: CHILD_PRICE_CENTS,
                externalShopUrl: 'https://patterson-family-store.example.com',
                shopProducts,
                shopActive: true,
            },
        ])
        .returning()

    dbg.seed('Seeding family members...')
    const tree = buildFamilyTree()
    const familyValues = tree.map((member) => ({
        name: member.name,
        birthYear: member.birthYear,
        birthMonth: member.birthMonth,
        birthDay: member.birthDay,
    }))
    const insertedMembers = await db.insert(schema.familyMembers).values(familyValues).returning()

    dbg.seed('Seeding relationships...')

    type RelRow = {
        fromMemberId: string
        toMemberId: string
        type: RelationshipType
    }

    const relationshipValues: RelRow[] = []

    function addRel(from: string, to: string, type: RelationshipType) {
        relationshipValues.push({
            fromMemberId: from,
            toMemberId: to,
            type,
        })
    }

    // Spouses
    tree.forEach((m, i) => {
        if (m.spouseIndex !== undefined && m.spouseIndex > i) {
            const aId = insertedMembers[i].id
            const bId = insertedMembers[m.spouseIndex].id
            addRel(aId, bId, 'spouse')
            addRel(bId, aId, 'spouse')
        }
    })

    // Build ancestor index: memberId → array of { id, generation }
    // For each member, walk up the parent chain and emit typed ancestor relationships
    function getAncestors(
        idx: number,
        depth: number,
        visited: Set<number>,
    ): { idx: number; depth: number }[] {
        if (depth > 7 || visited.has(idx)) {
            return []
        }
        visited.add(idx)
        const parents = tree[idx].parentIndices ?? []
        const result: { idx: number; depth: number }[] = parents.map((p) => ({ idx: p, depth }))
        for (const p of parents) {
            result.push(...getAncestors(p, depth + 1, visited))
        }
        return result
    }

    tree.forEach((member, i) => {
        const ancestors = getAncestors(i, 1, new Set())
        const memberId = insertedMembers[i].id
        for (const { idx: ancIdx, depth } of ancestors) {
            const types = ANCESTOR_TYPE_MAP[depth]
            if (!types) {
                continue
            }
            const ancestorId = insertedMembers[ancIdx].id
            addRel(ancestorId, memberId, types.ancestor)
            addRel(memberId, ancestorId, types.descendant)
        }
    })

    // Siblings (share same first parent)
    tree.forEach((memberI, i) => {
        if (!memberI.parentIndices) {
            return
        }
        tree.slice(i + 1).forEach((memberJ, offset) => {
            const j = i + 1 + offset
            if (!memberJ.parentIndices) {
                return
            }
            if (memberI.parentIndices![0] === memberJ.parentIndices![0]) {
                addRel(insertedMembers[i].id, insertedMembers[j].id, 'sibling')
                addRel(insertedMembers[j].id, insertedMembers[i].id, 'sibling')
            }
        })
    })

    if (relationshipValues.length > 0) {
        /* Defensive dedup against the unique (from, to, type) constraint. The walk above
           should already produce unique tuples, but this keeps a tree-builder change from
           mid-seed-failing in the future. */
        const seen = new Set<string>()
        const deduped = relationshipValues.filter((r) => {
            const key = `${r.fromMemberId}:${r.toMemberId}:${r.type}`
            if (seen.has(key)) {
                return false
            }
            seen.add(key)
            return true
        })

        const batchSize = 100
        const batches = Array.from({ length: Math.ceil(deduped.length / batchSize) }, (_, i) =>
            deduped.slice(i * batchSize, (i + 1) * batchSize),
        )
        for (const batch of batches) {
            await db.insert(schema.relationships).values(batch)
        }
        dbg.seed(
            'Inserted %d relationships (%d duplicates filtered)',
            deduped.length,
            relationshipValues.length - deduped.length,
        )
    }

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
                    priceCents: isAdult ? event.adultPriceCents : event.childPriceCents,
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

    dbg.seed('Seeding photos...')
    const photoValues = events.slice(0, 2).flatMap((event) => {
        const numPhotos = faker.number.int({ min: 6, max: 10 })
        return Array.from({ length: numPhotos }, (_, p) => {
            const photoId = `${event.year}-${String(p + 1).padStart(3, '0')}`
            return {
                eventId: event.id,
                uploadedByUserId: null,
                r2Key: `photos/event-${event.year}/${photoId}.jpg`,
                url: `https://picsum.photos/seed/${photoId}/800/600`,
                caption:
                    p === 0
                        ? 'Group photo'
                        : faker.datatype.boolean()
                          ? faker.lorem.sentence()
                          : null,
            }
        })
    })
    await db.insert(schema.photos).values(photoValues)

    dbg.seed('Seed complete!')
    await client.end()
}

seed().catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
})
