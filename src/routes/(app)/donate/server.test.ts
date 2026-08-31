import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { donations, reunionEvents } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedEvent } from '$lib/server/testing/seedEvent'

/* The standalone gift POST.

   Stripe is mocked; everything else is real, so what this asserts is the row a donor leaves behind
   the moment they press the button — before any webhook has fired. */

const mockCreateCheckout = vi.fn()

vi.mock('$lib/server/payments', () => ({ createDonationCheckout: mockCreateCheckout }))

const { actions, load } = await import('./+page.server')

let db: Awaited<ReturnType<typeof resetTestDb>>
let eventId: string

function donate(overrides: Record<string, string> = {}) {
    const fields: Record<string, string> = {
        donorName: 'Ruth Patterson',
        donorEmail: 'Ruth@Example.COM',
        amountCents: '5000',
        message: '',
        ...overrides,
    }
    const formData = new FormData()
    for (const [key, value] of Object.entries(fields)) {
        formData.append(key, value)
    }
    return actions.donate({
        request: new Request('http://localhost/donate', { method: 'POST', body: formData }),
        url: new URL('http://localhost/donate'),
    } as unknown as Parameters<typeof actions.donate>[0])
}

async function onlyDonation() {
    const [row] = await db.select().from(donations)
    return row
}

describe('POST /donate?/donate', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        mockCreateCheckout.mockResolvedValue({
            url: 'https://checkout.stripe.test/gift',
            sessionId: 'cs_test_gift',
        })
        db = await resetTestDb()
        eventId = await seedEvent(db, { title: 'Reunion 2027' })
    })

    it('redirects to Stripe Checkout', async () => {
        await expect(donate()).rejects.toMatchObject({
            status: 303,
            location: 'https://checkout.stripe.test/gift',
        })
    })

    it('records a pending gift against the open reunion', async () => {
        await expect(donate({ message: '  In memory of Roxie  ' })).rejects.toBeDefined()

        expect(await onlyDonation()).toMatchObject({
            eventId,
            registrationId: null,
            donorName: 'Ruth Patterson',
            /* Lowercased, like the registration contact email: it is the key anything later matches
               this donor on. */
            donorEmail: 'ruth@example.com',
            message: 'In memory of Roxie',
            amountCents: 5000,
            status: 'pending',
            stripeSessionId: 'cs_test_gift',
        })
    })

    /* A gift is charged at face value. A tier price is grossed up because it is what the reunion
       must net; a gift is whatever the giver chose to give. */
    it('charges exactly the amount chosen, with no gross-up', async () => {
        await expect(donate({ amountCents: '5000' })).rejects.toBeDefined()

        const [params] = mockCreateCheckout.mock.calls[0]
        expect(params.amountCents).toBe(5000)
        expect(params.name).toBe('Gift to Reunion 2027')
    })

    it('stores an empty message as null rather than an empty string', async () => {
        await expect(donate()).rejects.toBeDefined()

        expect((await onlyDonation()).message).toBeNull()
    })

    /* THE distinguishing case. The lock date closes registration so catering counts can be
       finalised; a gift needs no chair, so /donate has to keep working after it. */
    it('still accepts a gift after the registration lock date has passed', async () => {
        await db
            .update(reunionEvents)
            .set({ registrationLockDate: new Date('2020-01-01') })
            .where(eq(reunionEvents.id, eventId))

        await expect(donate()).rejects.toMatchObject({ status: 303 })
        expect((await onlyDonation()).status).toBe('pending')
    })

    /* eventId is nullable for exactly this: a gift arriving between reunions is recorded, not
       refused. */
    it('accepts a gift when no reunion is open', async () => {
        await db
            .update(reunionEvents)
            .set({ status: 'archived' })
            .where(eq(reunionEvents.id, eventId))

        await expect(donate()).rejects.toMatchObject({ status: 303 })
        expect((await onlyDonation()).eventId).toBeNull()
    })

    it.each([
        ['under the minimum', { amountCents: '100' }],
        ['over the maximum', { amountCents: '100000000' }],
        ['zero', { amountCents: '0' }],
        ['a malformed email', { donorEmail: 'not-an-email' }],
        ['no name', { donorName: '' }],
    ])('rejects %s and writes nothing', async (_label, overrides) => {
        const result = await donate(overrides)

        expect(result).toMatchObject({ status: 400 })
        expect(await db.select().from(donations)).toHaveLength(0)
        expect(mockCreateCheckout).not.toHaveBeenCalled()
    })

    describe('load', () => {
        /* SvelteKit types a load's return as possibly void, so the assertions read through a
           narrowed local rather than casting the result. */
        async function visit(search = '') {
            const result = await load({
                locals: {},
                url: new URL(`http://localhost/donate${search}`),
            } as unknown as Parameters<typeof load>[0])
            if (!result) {
                throw new Error('load returned nothing')
            }
            return result
        }

        /* The home page's preset buttons carry the chosen figure across in ?amount=. */
        it('seeds the amount from ?amount=', async () => {
            const result = await visit('?amount=10000')

            expect(result.form.data.amountCents).toBe(10000)
        })

        it('ignores an unparseable ?amount= rather than failing', async () => {
            const result = await visit('?amount=lots')

            expect(result.form.data.amountCents).toBe(0)
        })

        /* Paid gifts only. A pending row is an abandoned checkout, and counting it would let anyone
           inflate the public figure by opening a checkout and walking away. */
        it('counts only paid gifts in the public total', async () => {
            await db.insert(donations).values([
                {
                    eventId,
                    donorName: 'A',
                    donorEmail: 'a@example.com',
                    amountCents: 5000,
                    status: 'paid',
                },
                {
                    eventId,
                    donorName: 'B',
                    donorEmail: 'b@example.com',
                    amountCents: 9900,
                    status: 'pending',
                },
                {
                    eventId,
                    donorName: 'C',
                    donorEmail: 'c@example.com',
                    amountCents: 2500,
                    status: 'paid',
                },
            ])

            const result = await visit()

            expect(result.raised).toEqual({ totalCents: 7500, giftCount: 2 })
        })

        it('reports zero raised when nobody has given yet', async () => {
            expect((await visit()).raised).toEqual({ totalCents: 0, giftCount: 0 })
        })
    })
})
