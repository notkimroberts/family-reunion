import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL || 'postgresql://localhost:5432/family_reunion')
const db = drizzle(client, { schema })

const FIRST_NAMES = [
    'James',
    'Mary',
    'Robert',
    'Patricia',
    'John',
    'Jennifer',
    'Michael',
    'Linda',
    'David',
    'Elizabeth',
    'William',
    'Barbara',
    'Richard',
    'Susan',
    'Joseph',
    'Jessica',
    'Thomas',
    'Sarah',
    'Charles',
    'Karen',
    'Christopher',
    'Lisa',
    'Daniel',
    'Nancy',
    'Matthew',
    'Betty',
    'Anthony',
    'Margaret',
    'Mark',
    'Sandra',
    'Donald',
    'Ashley',
    'Steven',
    'Dorothy',
    'Paul',
    'Kimberly',
    'Andrew',
    'Emily',
    'Joshua',
    'Donna',
    'Kenneth',
    'Michelle',
    'Kevin',
    'Carol',
    'Brian',
    'Amanda',
    'George',
    'Melissa',
    'Timothy',
    'Deborah',
    'Ronald',
    'Stephanie',
    'Edward',
    'Rebecca',
    'Jason',
    'Sharon',
]

const LAST_NAMES = [
    'Patterson',
    'Johnson',
    'Williams',
    'Davis',
    'Thompson',
    'Martinez',
    'Anderson',
    'Clark',
]

const MALE_NAMES = FIRST_NAMES.filter((_, i) => i % 2 === 0)
const FEMALE_NAMES = FIRST_NAMES.filter((_, i) => i % 2 === 1)

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPhone(): string {
    return `(${randInt(200, 999)}) ${randInt(200, 999)}-${randInt(1000, 9999)}`
}

function randomAddress() {
    const streets = ['Oak St', 'Maple Ave', 'Cedar Ln', 'Pine Dr', 'Elm Blvd', 'Birch Way']
    const cities = ['Atlanta', 'Chicago', 'Houston', 'Phoenix', 'Denver', 'Seattle', 'Miami']
    const states = ['GA', 'IL', 'TX', 'AZ', 'CO', 'WA', 'FL']
    const idx = randInt(0, cities.length - 1)
    return {
        street: `${randInt(100, 9999)} ${pick(streets)}`,
        city: cities[idx],
        state: states[idx],
        zip: `${randInt(10000, 99999)}`,
    }
}

interface FamilyMember {
    name: string
    birthYear: number
    generation: number
    spouseIndex?: number
    parentIndices?: number[]
}

function buildFamilyTree(): FamilyMember[] {
    const members: FamilyMember[] = []
    const familyLastName = 'Patterson'

    const gen1Couples = [
        { husband: 'James', wife: 'Mary', birthYear: 1940 },
        { husband: 'Robert', wife: 'Patricia', birthYear: 1942 },
        { husband: 'William', wife: 'Barbara', birthYear: 1938 },
    ]

    for (const couple of gen1Couples) {
        const hIdx = members.length
        members.push({
            name: `${couple.husband} ${familyLastName}`,
            birthYear: couple.birthYear,
            generation: 1,
        })
        members.push({
            name: `${couple.wife} ${pick(LAST_NAMES)}`,
            birthYear: couple.birthYear + randInt(-2, 2),
            generation: 1,
            spouseIndex: hIdx,
        })
        members[hIdx].spouseIndex = hIdx + 1
    }

    const gen2ParentPairs = [
        [0, 1],
        [2, 3],
        [4, 5],
    ]
    const gen2Starts: number[] = []

    for (const [p1, p2] of gen2ParentPairs) {
        const numChildren = randInt(3, 4)
        for (let i = 0; i < numChildren; i++) {
            const isMale = Math.random() > 0.5
            const firstName = pick(isMale ? MALE_NAMES : FEMALE_NAMES)
            const childIdx = members.length
            gen2Starts.push(childIdx)
            members.push({
                name: `${firstName} ${familyLastName}`,
                birthYear: members[p1].birthYear + randInt(20, 30),
                generation: 2,
                parentIndices: [p1, p2],
            })
            if (Math.random() > 0.2) {
                const spouseIdx = members.length
                const spouseFirst = pick(isMale ? FEMALE_NAMES : MALE_NAMES)
                members.push({
                    name: `${spouseFirst} ${pick(LAST_NAMES)}`,
                    birthYear: members[childIdx].birthYear + randInt(-3, 3),
                    generation: 2,
                })
                members[childIdx].spouseIndex = spouseIdx
                members[spouseIdx].spouseIndex = childIdx
            }
        }
    }

    const gen3Starts: number[] = []
    for (const idx of gen2Starts) {
        if (members[idx].spouseIndex === undefined) continue
        const numChildren = randInt(1, 3)
        for (let i = 0; i < numChildren; i++) {
            const isMale = Math.random() > 0.5
            const firstName = pick(isMale ? MALE_NAMES : FEMALE_NAMES)
            const childIdx = members.length
            gen3Starts.push(childIdx)
            members.push({
                name: `${firstName} ${familyLastName}`,
                birthYear: members[idx].birthYear + randInt(22, 32),
                generation: 3,
                parentIndices: [idx, members[idx].spouseIndex!],
            })
        }
    }

    let gen3Idx = 0
    while (members.length < 50 && gen3Idx < gen3Starts.length) {
        const parentIdx = gen3Starts[gen3Idx]
        const numChildren = randInt(1, 2)
        for (let i = 0; i < numChildren && members.length < 50; i++) {
            const isMale = Math.random() > 0.5
            const firstName = pick(isMale ? MALE_NAMES : FEMALE_NAMES)
            members.push({
                name: `${firstName} ${familyLastName}`,
                birthYear: members[parentIdx].birthYear + randInt(22, 30),
                generation: 4,
                parentIndices: [parentIdx],
            })
        }
        gen3Idx++
    }

    while (members.length < 50) {
        const parentIdx = pick(gen3Starts)
        members.push({
            name: `${pick(MALE_NAMES)} ${familyLastName}`,
            birthYear: members[parentIdx].birthYear + randInt(22, 30),
            generation: 4,
            parentIndices: [parentIdx],
        })
    }

    return members
}

async function seed() {
    console.log('Truncating all tables...')
    await db.execute(sql`
		TRUNCATE TABLE
			contact_submissions,
			photos,
			storefront_config,
			party_members,
			registrations,
			relationships,
			family_members,
			pricing_tiers,
			reunion_events,
			user_profiles
		CASCADE
	`)

    console.log('Seeding reunion events...')
    const events = await db
        .insert(schema.reunionEvents)
        .values([
            {
                year: 2024,
                title: 'Patterson Family Reunion 2024',
                status: 'archived' as const,
                venue: {
                    name: 'Lakewood Lodge',
                    address: '123 Lake Rd, Lakewood, GA 30045',
                    description: 'Beautiful lakeside venue with cabins and picnic areas',
                },
                menu: [
                    'BBQ ribs',
                    'Fried chicken',
                    'Mac and cheese',
                    'Collard greens',
                    'Cornbread',
                    'Peach cobbler',
                ],
                drinks: ['Sweet tea', 'Lemonade', 'Water', 'Juice boxes'],
                schedule: [
                    { day: 'Saturday', time: '10:00 AM', activity: 'Registration & Welcome' },
                    { day: 'Saturday', time: '12:00 PM', activity: 'Lunch' },
                    { day: 'Saturday', time: '2:00 PM', activity: 'Family games' },
                    { day: 'Saturday', time: '6:00 PM', activity: 'Dinner & Awards' },
                ],
            },
            {
                year: 2025,
                title: 'Patterson Family Reunion 2025',
                status: 'closed' as const,
                venue: {
                    name: 'Riverside Park Pavilion',
                    address: '456 River Dr, Marietta, GA 30060',
                    description: 'Spacious covered pavilion with playground and river access',
                },
                menu: [
                    'Grilled burgers',
                    'Hot dogs',
                    'Potato salad',
                    'Baked beans',
                    'Watermelon',
                    'Banana pudding',
                ],
                drinks: ['Sweet tea', 'Lemonade', 'Soda', 'Water'],
                schedule: [
                    { day: 'Saturday', time: '9:00 AM', activity: 'Setup & Early Birds' },
                    { day: 'Saturday', time: '11:00 AM', activity: 'Family Photo' },
                    { day: 'Saturday', time: '12:00 PM', activity: 'Lunch' },
                    { day: 'Saturday', time: '3:00 PM', activity: 'Talent Show' },
                    { day: 'Saturday', time: '5:00 PM', activity: 'Dinner' },
                ],
            },
            {
                year: 2027,
                title: 'Patterson Family Reunion 2027',
                status: 'open' as const,
                startDate: new Date('2027-07-23T16:00:00'),
                endDate: new Date('2027-07-25T12:00:00'),
                venue: {
                    name: 'Mountain View Resort',
                    address: '789 Summit Way, Blue Ridge, GA 30513',
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

    console.log('Seeding pricing tiers...')
    const allTiers = []
    for (const event of events) {
        const tiers = await db
            .insert(schema.pricingTiers)
            .values([
                { eventId: event.id, label: 'Child (0-12)', minAge: 0, maxAge: 12, priceCents: 0 },
                {
                    eventId: event.id,
                    label: 'Teen (13-17)',
                    minAge: 13,
                    maxAge: 17,
                    priceCents: 2500,
                },
                {
                    eventId: event.id,
                    label: 'Adult (18+)',
                    minAge: 18,
                    maxAge: null,
                    priceCents: 5000,
                },
            ])
            .returning()
        allTiers.push(...tiers)
    }

    console.log('Seeding user profiles...')
    const userIds: string[] = []
    const userValues = []
    for (let i = 0; i < 15; i++) {
        const userId = `user_${String(i + 1).padStart(3, '0')}`
        userIds.push(userId)
        userValues.push({
            userId,
            phone: randomPhone(),
            mailingAddress: randomAddress(),
            profilePhotoUrl: `https://picsum.photos/seed/user${i + 1}/200/200`,
        })
    }
    await db.insert(schema.userProfiles).values(userValues)

    console.log('Seeding family members...')
    const tree = buildFamilyTree()
    const familyValues = tree.map((member, i) => ({
        userId: i < 15 ? userIds[i] : null,
        name: member.name,
        birthYear: member.birthYear,
        birthMonth: randInt(1, 12),
        birthDay: randInt(1, 28),
    }))
    const insertedMembers = await db.insert(schema.familyMembers).values(familyValues).returning()

    console.log('Seeding relationships...')
    const relationshipValues: {
        fromMemberId: string
        toMemberId: string
        type: (typeof schema.relationshipTypeEnum.enumValues)[number]
        createdByUserId: string
    }[] = []

    for (let i = 0; i < tree.length; i++) {
        const member = tree[i]
        const memberId = insertedMembers[i].id

        if (member.spouseIndex !== undefined && member.spouseIndex > i) {
            const spouseId = insertedMembers[member.spouseIndex].id
            relationshipValues.push({
                fromMemberId: memberId,
                toMemberId: spouseId,
                type: 'spouse',
                createdByUserId: userIds[0],
            })
            relationshipValues.push({
                fromMemberId: spouseId,
                toMemberId: memberId,
                type: 'spouse',
                createdByUserId: userIds[0],
            })
        }

        if (member.parentIndices) {
            for (const parentIdx of member.parentIndices) {
                const parentId = insertedMembers[parentIdx].id
                relationshipValues.push({
                    fromMemberId: parentId,
                    toMemberId: memberId,
                    type: 'parent',
                    createdByUserId: userIds[0],
                })
                relationshipValues.push({
                    fromMemberId: memberId,
                    toMemberId: parentId,
                    type: 'child',
                    createdByUserId: userIds[0],
                })

                const parentMember = tree[parentIdx]
                if (parentMember.parentIndices) {
                    for (const gpIdx of parentMember.parentIndices) {
                        const gpId = insertedMembers[gpIdx].id
                        relationshipValues.push({
                            fromMemberId: gpId,
                            toMemberId: memberId,
                            type: 'grandparent',
                            createdByUserId: userIds[0],
                        })
                        relationshipValues.push({
                            fromMemberId: memberId,
                            toMemberId: gpId,
                            type: 'grandchild',
                            createdByUserId: userIds[0],
                        })
                    }
                }
            }
        }
    }

    for (let i = 0; i < tree.length; i++) {
        if (!tree[i].parentIndices) continue
        for (let j = i + 1; j < tree.length; j++) {
            if (!tree[j].parentIndices) continue
            if (tree[i].parentIndices![0] === tree[j].parentIndices![0]) {
                relationshipValues.push({
                    fromMemberId: insertedMembers[i].id,
                    toMemberId: insertedMembers[j].id,
                    type: 'sibling',
                    createdByUserId: userIds[0],
                })
                relationshipValues.push({
                    fromMemberId: insertedMembers[j].id,
                    toMemberId: insertedMembers[i].id,
                    type: 'sibling',
                    createdByUserId: userIds[0],
                })
            }
        }
    }

    if (relationshipValues.length > 0) {
        const batchSize = 100
        for (let i = 0; i < relationshipValues.length; i += batchSize) {
            await db.insert(schema.relationships).values(relationshipValues.slice(i, i + batchSize))
        }
    }

    console.log('Seeding registrations...')
    for (const event of events) {
        const eventTiers = allTiers.filter((t) => t.eventId === event.id)
        const numRegistrations = event.status === 'open' ? randInt(5, 7) : randInt(8, 10)

        for (let r = 0; r < numRegistrations; r++) {
            const userId = userIds[r % userIds.length]
            const numParty = randInt(1, 4)
            const status =
                event.status === 'open' && Math.random() > 0.5
                    ? ('pending' as const)
                    : ('paid' as const)

            let totalCents = 0
            const partyData: {
                name: string
                birthDate: string
                tierId: string
            }[] = []
            for (let p = 0; p < numParty; p++) {
                const birthYear = new Date().getFullYear() - randInt(2, 70)
                const birthMonth = randInt(1, 12)
                const birthDay = randInt(1, 28)
                const birthDate = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
                const age = new Date().getFullYear() - birthYear
                const tier = eventTiers.find(
                    (t) => age >= t.minAge && (t.maxAge === null || age <= t.maxAge),
                )!
                totalCents += tier.priceCents
                partyData.push({
                    name: `${pick(FIRST_NAMES)} ${familyValues[r % familyValues.length].name.split(' ').pop()}`,
                    birthDate,
                    tierId: tier.id,
                })
            }

            const [reg] = await db
                .insert(schema.registrations)
                .values({
                    userId,
                    eventId: event.id,
                    stripeSessionId:
                        status === 'paid' ? `cs_test_${crypto.randomUUID().slice(0, 24)}` : null,
                    totalAmountCents: totalCents,
                    status,
                })
                .returning()

            await db.insert(schema.partyMembers).values(
                partyData.map((p) => ({
                    registrationId: reg.id,
                    name: p.name,
                    birthDate: p.birthDate,
                    pricingTierId: p.tierId,
                })),
            )
        }
    }

    console.log('Seeding photos...')
    const photoValues = []
    for (let eventIdx = 0; eventIdx < 2; eventIdx++) {
        const event = events[eventIdx]
        const numPhotos = randInt(6, 10)
        for (let p = 0; p < numPhotos; p++) {
            const photoId = `${event.year}-${String(p + 1).padStart(3, '0')}`
            photoValues.push({
                eventId: event.id,
                uploadedByUserId: userIds[p % userIds.length],
                r2Key: `photos/event-${event.year}/${photoId}.jpg`,
                url: `https://picsum.photos/seed/${photoId}/800/600`,
                caption: p === 0 ? 'Group photo' : null,
            })
        }
    }
    await db.insert(schema.photos).values(photoValues)

    console.log('Seeding storefront config...')
    await db.insert(schema.storefrontConfig).values({
        externalShopUrl: 'https://roberts-family-store.example.com',
        products: [
            {
                name: 'Family Reunion T-Shirt 2026',
                imageUrl: 'https://picsum.photos/seed/shirt/400/400',
                description: 'Official reunion tee in navy blue',
            },
            {
                name: 'Reunion Tote Bag',
                imageUrl: 'https://picsum.photos/seed/tote/400/400',
                description: 'Canvas tote with family crest',
            },
            {
                name: 'Photo Book 2025',
                imageUrl: 'https://picsum.photos/seed/book/400/400',
                description: "Hardcover book of last year's reunion photos",
            },
        ],
        isActive: true,
    })

    console.log('Seeding contact submissions...')
    await db.insert(schema.contactSubmissions).values([
        {
            name: 'Cousin Marcus',
            email: 'marcus@example.com',
            message: 'Hey! What time does the reunion start this year?',
        },
        {
            name: 'Aunt Dorothy',
            email: 'dorothy@example.com',
            message: 'Can we get a vegetarian option on the menu?',
        },
        {
            name: 'Uncle Steve',
            email: 'steve@example.com',
            message: "I'd like to volunteer to help set up Friday evening.",
        },
    ])

    console.log('Seed complete!')
    await client.end()
}

seed().catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
})
