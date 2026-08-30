import { drizzle } from 'drizzle-orm/pglite'
import * as schema from '$lib/server/db/schema'
import { generateManagementToken } from '$lib/server/registrations/hashManagementToken'

type TestDb = ReturnType<typeof drizzle<typeof schema>>

/* registrations.stripe_session_id is UNIQUE, so two seeds in one test cannot share the default. */
let sessionCounter = 0

type SeedMember = {
    name: string
    priceCents: number
    stripePaymentIntentId?: string | null
    isContact?: boolean
    tierLabel?: string
}

type SeedOptions = {
    status?: (typeof schema.registrationStatusEnum.enumValues)[number]
    stripeSessionId?: string | null
    contactName?: string
    contactEmail?: string
    eventTitle?: string
    registrationLockDate?: Date | null
    members?: readonly SeedMember[]
    /* Reuse a reunion event instead of creating one. Needed whenever a test seeds a second
       registration: `one_open_event` is a partial unique index, so a second `open` event in the same
       database is rejected — as it should be, and as the hand-rolled db fakes never were. */
    eventId?: string
    /* Only one reunion event may be `open` at a time (`one_open_event`). A test that needs a SECOND
       year has to say which one it is — normally a past year, `closed`. */
    eventStatus?: (typeof schema.eventStatusEnum.enumValues)[number]
}

/* One paid card registration with one attendee, unless told otherwise.

   Returns the PLAINTEXT management token, which nothing else can: the row stores only the hash, so a
   test that wants to exercise the registrant's own path has to be handed the plaintext at the moment
   it is generated. That is what makes the token gate real in these tests rather than mocked away. */
export async function seedRegistration(db: TestDb, options: SeedOptions = {}) {
    const eventId = options.eventId ?? (await insertEvent(db, options))

    const token = generateManagementToken()

    const [registration] = await db
        .insert(schema.registrations)
        .values({
            managementToken: token.hash,
            contactName: options.contactName ?? 'Alice Patterson',
            contactEmail: options.contactEmail ?? 'alice@example.com',
            eventId,
            status: options.status ?? 'paid',
            stripeSessionId:
                options.stripeSessionId === undefined
                    ? `cs_test_${++sessionCounter}`
                    : options.stripeSessionId,
        })
        .returning()

    const members = options.members ?? [
        { name: 'Alice Patterson', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
    ]

    const inserted = await db
        .insert(schema.partyMembers)
        .values(
            members.map((member, index) => ({
                registrationId: registration.id,
                name: member.name,
                tierLabel: member.tierLabel ?? 'Adult',
                priceCents: member.priceCents,
                stripePaymentIntentId: member.stripePaymentIntentId ?? null,
                isContact: member.isContact ?? index === 0,
            })),
        )
        .returning()

    return {
        eventId,
        registrationId: registration.id,
        managementToken: token.plaintext,
        memberIds: inserted.map((row) => row.id),
    }
}

async function insertEvent(db: TestDb, options: SeedOptions) {
    const [event] = await db
        .insert(schema.reunionEvents)
        .values({
            year: 2027,
            title: options.eventTitle ?? 'Patterson Family Reunion 2027',
            status: options.eventStatus ?? 'open',
            registrationLockDate: options.registrationLockDate ?? null,
        })
        .returning({ id: schema.reunionEvents.id })
    return event.id
}
