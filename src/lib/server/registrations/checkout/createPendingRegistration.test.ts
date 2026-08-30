import { eq } from 'drizzle-orm'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { reunionEvents } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedTier } from '$lib/server/testing/seedTier'

/* The public registration write path, which had no test.

   It creates the registration, both kinds of party-member row — the contact's own and each guest's
   — and the Stripe session, in that order. What is pinned here is the shape of what lands in the
   database, because that is what every later path reads: the refund amount, the confirmation email,
   the order sheet and the admin totals all come off these rows.

   Stripe is mocked. The database is real. */

const mockCreateCheckout = vi.fn()

vi.mock('$lib/server/payments', () => ({ createRegistrationCheckout: mockCreateCheckout }))

const { createPendingRegistration } = await import('./createPendingRegistration')

let db: Awaited<ReturnType<typeof resetTestDb>>
let eventId: string
let adultTierId: string
let childTierId: string

async function seedEvent(registrationLockDate: Date | null = null) {
    const [event] = await db
        .insert(reunionEvents)
        .values({ year: 2027, title: 'Reunion 2027', status: 'open', registrationLockDate })
        .returning({ id: reunionEvents.id })
    return event.id
}

async function membersOf(registrationId: string) {
    return db
        .select()
        .from(partyMembers)
        .where(eq(partyMembers.registrationId, registrationId))
        .orderBy(partyMembers.name)
}

const CONTACT = {
    name: 'Alice Patterson',
    birthDate: '1980-04-02',
    shirtSize: 'M',
    addressLine1: '1 Main St',
    addressCity: 'Oakland',
    addressState: 'CA',
    addressZip: '94612',
    vegetarianMeal: true,
    attendedReunion2025: false,
}

function register(overrides: Record<string, unknown> = {}) {
    return createPendingRegistration({
        contactName: 'Alice Patterson',
        contactEmail: 'alice@example.com',
        contactPhone: '5105550123',
        eventId,
        members: [{ ...CONTACT, tierId: adultTierId }],
        successUrl: (token: string) => `https://example.com/ok?token=${token}`,
        cancelUrl: () => 'https://example.com/cancelled',
        ...overrides,
    })
}

describe('createPendingRegistration', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        mockCreateCheckout.mockResolvedValue({
            url: 'https://checkout.stripe.test/session',
            sessionId: 'cs_test_new',
        })
        db = await resetTestDb()
        eventId = await seedEvent()
        adultTierId = await seedTier(db, eventId, { label: 'Adult', priceCents: 16000 })
        childTierId = await seedTier(db, eventId, { label: 'Child', priceCents: 9000 })
    })

    it('creates the registration as pending and stores only the token hash', async () => {
        const result = await register()

        const [row] = await db
            .select()
            .from(registrations)
            .where(eq(registrations.id, result.registrationId))
        expect(row.status).toBe('pending')
        expect(row.contactEmail).toBe('alice@example.com')
        /* The plaintext is returned to the caller and must never be what is stored. */
        expect(row.managementToken).not.toBe(result.managementToken)
        expect(row.managementToken).toHaveLength(64)
    })

    /* The contact is an attendee too, and their row is the one flagged so their name has a single
       editable field rather than two copies that drift. */
    it('inserts the contact as a flagged party member', async () => {
        const result = await register()

        const [contact] = await membersOf(result.registrationId)
        expect(contact).toMatchObject({
            name: 'Alice Patterson',
            isContact: true,
            tierLabel: 'Adult',
            birthYear: 1980,
            birthMonth: 4,
            birthDay: 2,
            shirtSize: 'M',
            addressCity: 'Oakland',
            vegetarianMeal: true,
            attendedReunion2025: false,
        })
    })

    /* The public path snapshots the GROSS — what the card is actually charged — because the refund
       amount is read straight off this column. 16000 net becomes 16509 at 2.9% + 30c. */
    it('snapshots the grossed-up price, not the tier price', async () => {
        const result = await register()

        const [contact] = await membersOf(result.registrationId)
        expect(contact.priceCents).toBe(16509)
    })

    it('inserts guests unflagged, each on their own tier', async () => {
        const result = await register({
            members: [
                { ...CONTACT, tierId: adultTierId },
                { name: 'Bo Patterson', tierId: childTierId, shirtSize: 'S' },
                { name: 'Marcus Patterson', tierId: adultTierId },
            ],
        })

        const members = await membersOf(result.registrationId)
        expect(members).toHaveLength(3)
        const bo = members.find((row) => row.name === 'Bo Patterson')
        expect(bo).toMatchObject({ isContact: false, tierLabel: 'Child' })
        /* 9000 net grossed up. */
        expect(bo?.priceCents).toBe(9300)
    })

    /* At most one row per registration may be flagged, enforced by a partial unique index. A guest
       must never arrive flagged. */
    it('flags exactly one member as the contact', async () => {
        const result = await register({
            members: [
                { ...CONTACT, tierId: adultTierId },
                { name: 'Bo Patterson', tierId: childTierId },
            ],
        })

        const members = await membersOf(result.registrationId)
        expect(members.filter((row) => row.isContact)).toHaveLength(1)
    })

    /* Two of the four write paths did not trim, so a trailing space reached the database, the
       confirmation email and the name badge. */
    it('trims names on every row', async () => {
        const result = await register({
            contactName: '  Alice Patterson  ',
            members: [
                { ...CONTACT, name: '  Alice Patterson  ', tierId: adultTierId },
                { name: '  Bo Patterson  ', tierId: childTierId },
            ],
        })

        const members = await membersOf(result.registrationId)
        expect(members.map((row) => row.name).sort()).toEqual(['Alice Patterson', 'Bo Patterson'])
    })

    it('stores absent optional details as null rather than empty strings', async () => {
        const result = await register({
            members: [
                {
                    ...CONTACT,
                    tierId: adultTierId,
                    birthDate: undefined,
                    shirtSize: '',
                    addressLine2: '',
                    vegetarianMeal: undefined,
                },
            ],
        })

        const [contact] = await membersOf(result.registrationId)
        expect(contact).toMatchObject({
            birthYear: null,
            birthMonth: null,
            birthDay: null,
            shirtSize: null,
            addressLine2: null,
            vegetarianMeal: null,
        })
    })

    it('writes the Stripe session id back onto the registration', async () => {
        const result = await register()

        const [row] = await db
            .select({ stripeSessionId: registrations.stripeSessionId })
            .from(registrations)
            .where(eq(registrations.id, result.registrationId))
        expect(row.stripeSessionId).toBe('cs_test_new')
    })

    /* Charged per member, grossed up per member, because Stripe's 30c is per charge and the app
       deliberately quotes it that way — see stripeFee.ts. */
    it('charges Stripe the same gross it snapshotted', async () => {
        await register({
            members: [
                { ...CONTACT, tierId: adultTierId },
                { name: 'Bo', tierId: childTierId },
            ],
        })

        const [{ lineItems }] = mockCreateCheckout.mock.calls[0]
        expect(lineItems.map((item: { priceCents: number }) => item.priceCents)).toEqual([
            16509, 9300,
        ])
    })

    /* The front door closes with the rest of them. Without this the add/edit/cancel paths are
       frozen while someone can still pay for a place nobody is catering for. */
    it('refuses once the registration lock date has passed', async () => {
        /* Locking the existing event rather than seeding a second one: only one reunion may be
           `open` at a time, and the constraint enforces it. */
        await db
            .update(reunionEvents)
            .set({ registrationLockDate: new Date('2020-01-01') })
            .where(eq(reunionEvents.id, eventId))

        await expect(register()).rejects.toThrow()

        expect(mockCreateCheckout).not.toHaveBeenCalled()
        expect(await db.select().from(registrations)).toHaveLength(0)
    })
})
