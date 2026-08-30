import { stringify } from 'devalue'
import { eq } from 'drizzle-orm'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { partyMembers, registrations, reunionEvents } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedTier } from '$lib/server/testing/seedTier'

/* The public registration POST, which had no test at all — while its admin twin, paper entry, had
   197 lines of them. The pure step lifted out of it (toRegistrationIntake, and toMemberInputs
   before that) was tested; the action wiring them to the database was not.

   Stripe is mocked. Everything else is real, so what this asserts is what a registrant's booking
   actually looks like in the database a second after they press the button. */

const mockCreateCheckout = vi.fn()

vi.mock('$lib/server/payments', () => ({ createRegistrationCheckout: mockCreateCheckout }))

const { actions } = await import('./+page.server')

let db: Awaited<ReturnType<typeof resetTestDb>>
let eventId: string
let adultTierId: string
let childTierId: string

const SELF = {
    tierId: '',
    birthDate: '1980-04-02',
    shirtSize: 'M',
    addressLine1: '1 Main St',
    addressLine2: '',
    addressCity: 'Oakland',
    addressState: 'CA',
    addressZip: '94612',
    vegetarianMeal: 'yes',
    attendedReunion2025: 'no',
}

/* Posts the way the real form does. superForm runs with dataType: 'json', so the browser sends
   FormData carrying one `__superform_json` field of devalue-encoded data — not a JSON body. Building
   it any other way makes superValidate ignore the payload entirely and validate a blank form, which
   fails as a 400 that looks like a schema problem. */
function submit(overrides: Record<string, unknown> = {}) {
    const body = {
        eventId,
        contactFirstName: 'Alice',
        contactLastName: 'Patterson',
        contactEmail: 'Alice@Example.COM',
        contactPhone: '5105550123',
        self: { ...SELF, tierId: adultTierId },
        members: [],
        ...overrides,
    }
    const formData = new FormData()
    formData.append('__superform_json', stringify(body))
    const request = new Request('http://localhost/register', { method: 'POST', body: formData })
    return actions.register({
        request,
        url: new URL('http://localhost/register'),
    } as unknown as Parameters<typeof actions.register>[0])
}

async function onlyRegistration() {
    const [row] = await db.select().from(registrations)
    return row
}

describe('POST /register?/register', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        mockCreateCheckout.mockResolvedValue({
            url: 'https://checkout.stripe.test/session',
            sessionId: 'cs_test_new',
        })
        db = await resetTestDb()
        const [event] = await db
            .insert(reunionEvents)
            .values({ year: 2027, title: 'Reunion 2027', status: 'open' })
            .returning({ id: reunionEvents.id })
        eventId = event.id
        adultTierId = await seedTier(db, eventId, { label: 'Adult', priceCents: 16000 })
        childTierId = await seedTier(db, eventId, { label: 'Child', priceCents: 9000 })
    })

    it('redirects to Stripe Checkout', async () => {
        await expect(submit()).rejects.toMatchObject({
            status: 303,
            location: 'https://checkout.stripe.test/session',
        })
    })

    it('creates the party with the contact flagged first', async () => {
        await expect(
            submit({ members: [{ ...SELF, name: 'Bo', tierId: childTierId }] }),
        ).rejects.toBeDefined()

        const registration = await onlyRegistration()
        const members = await db
            .select()
            .from(partyMembers)
            .where(eq(partyMembers.registrationId, registration.id))
        expect(members).toHaveLength(2)
        expect(members.filter((row) => row.isContact).map((row) => row.name)).toEqual([
            'Alice Patterson',
        ])
    })

    /* /register/recover matches on exact contact email. Stored as typed, a capitalised address is a
       registrant who cannot recover their own management link. */
    it('stores the contact email lowercased', async () => {
        await expect(submit()).rejects.toBeDefined()

        expect((await onlyRegistration()).contactEmail).toBe('alice@example.com')
    })

    it('joins the two name fields onto the registration and the contact row', async () => {
        await expect(submit()).rejects.toBeDefined()

        const registration = await onlyRegistration()
        expect(registration.contactName).toBe('Alice Patterson')
        const [contact] = await db
            .select()
            .from(partyMembers)
            .where(eq(partyMembers.registrationId, registration.id))
        expect(contact.name).toBe('Alice Patterson')
    })

    it('leaves the registration pending and records the checkout session', async () => {
        await expect(submit()).rejects.toBeDefined()

        const registration = await onlyRegistration()
        expect(registration.status).toBe('pending')
        expect(registration.stripeSessionId).toBe('cs_test_new')
    })

    /* A rejected form must not create half a booking. */
    it('writes nothing when the form fails validation', async () => {
        const result = await submit({ contactEmail: 'not-an-email' })

        expect(result).toMatchObject({ status: 400 })
        expect(await db.select().from(registrations)).toHaveLength(0)
        expect(mockCreateCheckout).not.toHaveBeenCalled()
    })

    it('refuses once the registration lock date has passed', async () => {
        await db
            .update(reunionEvents)
            .set({ registrationLockDate: new Date('2020-01-01') })
            .where(eq(reunionEvents.id, eventId))

        await expect(submit()).rejects.toBeDefined()

        expect(await db.select().from(registrations)).toHaveLength(0)
        expect(mockCreateCheckout).not.toHaveBeenCalled()
    })
})
