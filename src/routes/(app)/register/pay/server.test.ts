import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { partyMembers } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'
import { grossUpForStripe } from '$lib/utils/stripeFee'

/* /register/pay: what the page shows a holder of the view link, and the one action it has. The
   database is real; Stripe is mocked at the client, so the session payload is built for real. */

const mockCreate = vi.fn()
vi.mock('$lib/server/stripe', () => ({
    getStripe: () => ({ checkout: { sessions: { create: mockCreate } } }),
}))
const { mockReportError } = vi.hoisted(() => ({ mockReportError: vi.fn() }))
vi.mock('$lib/server/reportError', () => ({ reportError: mockReportError }))

const { load, actions } = await import('./+page.server')

type PayLoadEvent = Parameters<typeof load>[0]
type PayActionEvent = Parameters<typeof actions.default>[0]

const CHILD_NET = 10000

let db: Awaited<ReturnType<typeof resetTestDb>>

function seedOwedBooking() {
    return seedRegistration(db, {
        members: [
            { name: 'Alice Patterson', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
            { name: 'Jada Patterson', priceCents: CHILD_NET, tierLabel: 'Child', paymentDue: true },
        ],
    })
}

function cookiesWith(token: string | undefined) {
    return { get: () => token, set: vi.fn(), delete: vi.fn() }
}

function loadWith(token: string | undefined, url = 'http://localhost/register/pay') {
    return load({
        url: new URL(url),
        cookies: cookiesWith(token),
        depends: vi.fn(),
    } as unknown as PayLoadEvent)
}

function submitWith(token: string | undefined) {
    return actions.default({
        url: new URL('http://localhost/register/pay'),
        cookies: cookiesWith(token),
    } as unknown as PayActionEvent)
}

describe('/register/pay', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        mockCreate.mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.com/cs_1' })
        db = await resetTestDb()
    })

    describe('load', () => {
        it('quotes the owed places at the card price', async () => {
            const seeded = await seedOwedBooking()

            const result = await loadWith(seeded.viewToken)

            expect(result).toMatchObject({
                hasRegistration: true,
                confirming: false,
                quote: {
                    lines: [
                        {
                            memberId: seeded.memberIds[1],
                            name: 'Jada Patterson',
                            tierLabel: 'Child',
                            grossCents: grossUpForStripe(CHILD_NET),
                        },
                    ],
                    netCents: CHILD_NET,
                    cardTotalCents: grossUpForStripe(CHILD_NET),
                },
            })
        })

        /* The link is forwardable, so page data carries names and prices and nothing else. */
        it('sends no address or Stripe id to the browser', async () => {
            const seeded = await seedOwedBooking()
            await db
                .update(partyMembers)
                .set({ addressLine1: '12 Elm Street' })
                .where(eq(partyMembers.registrationId, seeded.registrationId))

            const result = JSON.stringify(await loadWith(seeded.viewToken))

            expect(result).not.toContain('12 Elm Street')
            expect(result).not.toContain('pi_1')
        })

        /* The payment email links here with the token, as it links to /register/view. */
        it('moves a token from the email link into the cookie and off the address bar', async () => {
            const cookies = cookiesWith(undefined)

            await expect(
                load({
                    url: new URL('http://localhost/register/pay?token=abc'),
                    cookies,
                    depends: vi.fn(),
                } as unknown as PayLoadEvent),
            ).rejects.toMatchObject({ status: 303, location: 'http://localhost/register/pay' })
            expect(cookies.set).toHaveBeenCalledWith(
                'reg_token',
                'abc',
                expect.objectContaining({ httpOnly: true, path: '/' }),
            )
        })

        it('reports no registration without the cookie', async () => {
            await seedOwedBooking()

            expect(await loadWith(undefined)).toMatchObject({
                hasRegistration: false,
                quote: { lines: [] },
            })
        })

        it('reads the return from Stripe from the success URL', async () => {
            const seeded = await seedOwedBooking()

            const result = await loadWith(
                seeded.viewToken,
                'http://localhost/register/pay?confirming',
            )

            expect(result).toMatchObject({ confirming: true })
        })
    })

    describe('pay', () => {
        it('redirects to Stripe for the owed places', async () => {
            const seeded = await seedOwedBooking()

            await expect(submitWith(seeded.viewToken)).rejects.toMatchObject({
                status: 303,
                location: 'https://checkout.stripe.com/cs_1',
            })
            const [session] = mockCreate.mock.calls[0]
            expect(session.success_url).toBe('http://localhost/register/pay?confirming')
            expect(session.metadata.memberCharges).toBe(
                `${seeded.memberIds[1]}:${grossUpForStripe(CHILD_NET)}`,
            )
        })

        it('refuses without the cookie', async () => {
            expect(await submitWith(undefined)).toMatchObject({ status: 401 })
            expect(mockCreate).not.toHaveBeenCalled()
        })

        /* A refusal says why, and is not an incident. */
        it('says so when nothing is owed any more', async () => {
            const seeded = await seedRegistration(db)

            expect(await submitWith(seeded.viewToken)).toMatchObject({
                status: 409,
                data: { error: 'Nothing is owed on this registration.' },
            })
            expect(mockReportError).not.toHaveBeenCalled()
        })

        /* Stripe down is not something the payer can fix, and Sentry must hear about it. */
        it('reports a Stripe failure and asks the payer to retry', async () => {
            const seeded = await seedOwedBooking()
            mockCreate.mockRejectedValue(new Error('stripe is down'))

            expect(await submitWith(seeded.viewToken)).toMatchObject({ status: 502 })
            expect(mockReportError).toHaveBeenCalled()
        })
    })
})
