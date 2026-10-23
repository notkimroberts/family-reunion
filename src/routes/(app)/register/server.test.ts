import { stringify } from 'devalue'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { donations, partyMembers, registrations, reunionEvents } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedEvent } from '$lib/server/testing/seedEvent'
import { seedTier } from '$lib/server/testing/seedTier'

/* The public registration POST, which had no test at all — while its admin twin, paper entry, had
   197 lines of them. The pure step lifted out of it (toRegistrationIntake, and toMemberInputs
   before that) was tested; the action wiring them to the database was not.

   Stripe is mocked. Everything else is real, so what this asserts is what a registrant's booking
   actually looks like in the database a second after they press the button. */

const mockCreateCheckout = vi.fn()

vi.mock('$lib/server/payments', () => ({ createRegistrationCheckout: mockCreateCheckout }))

const { actions, load } = await import('./+page.server')
const { env } = await import('$env/dynamic/private')

const PREVIEW_KEY = 'preview-key-for-tests-0123456789abcdef'

/* Enough of SvelteKit's Cookies for the preview: what was set, and what a later request sends. */
function fakeCookies(sent: Record<string, string> = {}) {
    const set: { name: string; value: string; options: Record<string, unknown> }[] = []
    return {
        set,
        get: (name: string) => sent[name],
        cookies: {
            get: (name: string) => sent[name],
            set: (name: string, value: string, options: Record<string, unknown>) => {
                set.push({ name, value, options })
            },
        },
    }
}

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
function submit(overrides: Record<string, unknown> = {}, sentCookies: Record<string, string> = {}) {
    const body = {
        eventId,
        contactFirstName: 'Alice',
        contactLastName: 'Patterson',
        contactEmail: 'Alice@Example.COM',
        contactPhone: '5105550123',
        self: { ...SELF, tierId: adultTierId },
        members: [],
        stayingAtHostHotel: 'yes',
        ...overrides,
    }
    const formData = new FormData()
    formData.append('__superform_json', stringify(body))
    const request = new Request('http://localhost/register', { method: 'POST', body: formData })
    return actions.register({
        request,
        url: new URL('http://localhost/register'),
        cookies: fakeCookies(sentCookies).cookies,
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
        eventId = await seedEvent(db, { title: 'Reunion 2027' })
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

    /* /register/recover matches on exact contact email. Stored as typed, a capitalized address is a
       registrant who cannot recover their own view link. */
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

    /* The room block is guesswork without an answer, so the form refuses rather than defaulting —
       and it must not default to 'yes' either, which would book a room nobody asked for. */
    describe('the host hotel question', () => {
        it('stores the answer on the booking', async () => {
            await expect(submit({ stayingAtHostHotel: 'undecided' })).rejects.toBeDefined()

            expect((await onlyRegistration()).stayingAtHostHotel).toBe('undecided')
        })

        it.each(['', undefined])('refuses a booking with no answer (%s)', async (answer) => {
            const result = await submit({ stayingAtHostHotel: answer })

            expect(result).toMatchObject({ status: 400 })
            expect(await db.select().from(registrations)).toHaveLength(0)
        })
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

        /* 403 specifically, not merely "it threw": the lock date is now advertised on the home page
           and the register form, so the refusal behind those notices has to be the lock itself. */
        await expect(submit()).rejects.toMatchObject({ status: 403 })

        expect(await db.select().from(registrations)).toHaveLength(0)
        expect(mockCreateCheckout).not.toHaveBeenCalled()
    })

    /* A gift added on the way through. It is a row of its own rather than a column on the
       registration, so all gift money is reported in one place — see the donations table. */
    describe('a gift added to the registration', () => {
        it('records a pending gift linked to the new registration', async () => {
            await expect(submit({ donationCents: 5000 })).rejects.toBeDefined()

            const registration = await onlyRegistration()
            const [gift] = await db.select().from(donations)
            expect(gift).toMatchObject({
                registrationId: registration.id,
                eventId,
                amountCents: 5000,
                status: 'pending',
                donorName: 'Alice Patterson',
                donorEmail: 'alice@example.com',
                stripeSessionId: 'cs_test_new',
            })
        })

        /* Charged at face value — NOT grossed up like a tier price, which is what the reunion must
           net. The places beside it still are. */
        it('adds a face-value line item and passes the gift id to the webhook', async () => {
            await expect(submit({ donationCents: 5000 })).rejects.toBeDefined()

            const [gift] = await db.select().from(donations)
            const [params] = mockCreateCheckout.mock.calls[0]
            expect(params.lineItems).toEqual([
                { name: 'Alice Patterson (Adult)', priceCents: 16509 },
                { name: 'Gift to the reunion', priceCents: 5000 },
            ])
            expect(params.donationId).toBe(gift.id)
        })

        it('creates no gift and no gift line item when the amount is zero', async () => {
            await expect(submit({ donationCents: 0 })).rejects.toBeDefined()

            expect(await db.select().from(donations)).toHaveLength(0)
            const [params] = mockCreateCheckout.mock.calls[0]
            expect(params.lineItems).toHaveLength(1)
            expect(params.donationId).toBeUndefined()
        })

        /* Below the minimum is a rejected form, not a silently dropped gift: the registrant chose an
           amount and has to be told it is too small. */
        it('rejects a gift under the minimum and writes nothing', async () => {
            const result = await submit({ donationCents: 100 })

            expect(result).toMatchObject({ status: 400 })
            expect(await db.select().from(registrations)).toHaveLength(0)
            expect(await db.select().from(donations)).toHaveLength(0)
        })
    })
})

/* The preview link lets a few testers register before the opening date, and nobody else. */
describe('the registration preview link', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        mockCreateCheckout.mockResolvedValue({
            url: 'https://checkout.stripe.test/session',
            sessionId: 'cs_test_preview',
        })
        env.REGISTRATION_PREVIEW_KEY = PREVIEW_KEY
        db = await resetTestDb()
        eventId = await seedEvent(db, { title: 'Reunion 2027' })
        adultTierId = await seedTier(db, eventId, { label: 'Adult', priceCents: 16000 })
        await db
            .update(reunionEvents)
            .set({ registrationOpensAt: new Date(Date.now() + 24 * 60 * 60 * 1000) })
            .where(eq(reunionEvents.id, eventId))
    })

    afterEach(() => {
        delete env.REGISTRATION_PREVIEW_KEY
    })

    function loadPage(path: string, sentCookies: Record<string, string> = {}) {
        const jar = fakeCookies(sentCookies)
        const result = load({
            url: new URL(`https://pattersonfamilyreunion.com${path}`),
            cookies: jar.cookies,
            locals: { user: null },
        } as unknown as Parameters<typeof load>[0])
        return { result, jar }
    }

    async function previewOf(result: ReturnType<typeof load>) {
        const data = await result
        if (!data) {
            throw new Error('load returned nothing')
        }
        return data.preview
    }

    it('moves a correct key into a /register-only cookie and out of the address bar', async () => {
        const { result, jar } = loadPage(`/register?preview=${PREVIEW_KEY}`)

        await expect(result).rejects.toMatchObject({
            status: 303,
            location: 'https://pattersonfamilyreunion.com/register',
        })
        expect(jar.set).toEqual([
            {
                name: 'reg_preview',
                value: PREVIEW_KEY,
                options: expect.objectContaining({
                    path: '/register',
                    httpOnly: true,
                    secure: true,
                }),
            },
        ])
    })

    it('strips a wrong key and sets nothing', async () => {
        const { result, jar } = loadPage('/register?preview=guess')

        await expect(result).rejects.toMatchObject({ status: 303 })
        expect(jar.set).toEqual([])
    })

    it('shows the preview, in test mode, to a browser holding the key', async () => {
        const { result } = loadPage('/register', { reg_preview: PREVIEW_KEY })

        expect(await previewOf(result)).toEqual({ stripeTestMode: true })
    })

    it.each([
        ['no cookie', {}],
        ['an old key', { reg_preview: 'an-old-key-that-was-rotated-away-0000' }],
    ])('shows nothing with %s', async (_case, sentCookies) => {
        const { result } = loadPage('/register', sentCookies)

        expect(await previewOf(result)).toBeNull()
    })

    it('shows nothing once registration is open for everyone', async () => {
        await db
            .update(reunionEvents)
            .set({ registrationOpensAt: new Date('2020-01-01') })
            .where(eq(reunionEvents.id, eventId))

        const { result } = loadPage('/register', { reg_preview: PREVIEW_KEY })

        expect(await previewOf(result)).toBeNull()
    })

    it('accepts a submission from a browser holding the key', async () => {
        await expect(submit({}, { reg_preview: PREVIEW_KEY })).rejects.toMatchObject({
            status: 303,
            location: 'https://checkout.stripe.test/session',
        })
        expect(await db.select().from(registrations)).toHaveLength(1)
    })

    it('refuses a submission without it, and writes nothing', async () => {
        await expect(submit()).rejects.toMatchObject({ status: 403 })
        expect(await db.select().from(registrations)).toHaveLength(0)
    })

    /* Deleting the Railway variable ends every preview at once. */
    it('refuses a held key once REGISTRATION_PREVIEW_KEY is removed', async () => {
        delete env.REGISTRATION_PREVIEW_KEY

        await expect(submit({}, { reg_preview: PREVIEW_KEY })).rejects.toMatchObject({
            status: 403,
        })
    })
})
