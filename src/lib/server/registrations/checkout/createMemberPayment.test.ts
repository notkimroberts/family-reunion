import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'
import { grossUpForStripe } from '$lib/utils/stripeFee'

/* Opening a card payment for the places owed on a paid booking, for whoever holds its view token.
   The database is real, so the token gate and the amount are read from rows; Stripe is mocked. */

const mockCreateCheckout = vi.fn()

vi.mock('$lib/server/payments', () => ({ createMemberPaymentCheckout: mockCreateCheckout }))

const { createMemberPayment } = await import('./createMemberPayment')

const CHILD_NET = 10000

let db: Awaited<ReturnType<typeof resetTestDb>>

function seedBooking(options: { status?: 'paid' | 'pending'; owed?: boolean } = {}) {
    return seedRegistration(db, {
        status: options.status ?? 'paid',
        eventTitle: 'Patterson Family Reunion 2027',
        members: [
            { name: 'Alice Patterson', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
            {
                name: 'Jada Patterson',
                priceCents: CHILD_NET,
                tierLabel: 'Child',
                paymentDue: options.owed ?? true,
            },
        ],
    })
}

function pay(viewToken: string) {
    return createMemberPayment({
        viewToken,
        successUrl: 'https://example.com/register/pay?confirming',
        cancelUrl: 'https://example.com/register/pay',
    })
}

describe('createMemberPayment', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        mockCreateCheckout.mockResolvedValue({
            url: 'https://checkout.stripe.com/cs_1',
            sessionId: 'cs_1',
        })
        db = await resetTestDb()
    })

    it('opens a session charging only the owed places, at the gross', async () => {
        const seeded = await seedBooking()

        const result = await pay(seeded.viewToken)

        expect(result).toEqual({ checkoutUrl: 'https://checkout.stripe.com/cs_1' })
        expect(mockCreateCheckout).toHaveBeenCalledWith({
            registrationId: seeded.registrationId,
            viewToken: seeded.viewToken,
            lines: [
                {
                    memberId: seeded.memberIds[1],
                    name: 'Jada Patterson (Child)',
                    grossCents: grossUpForStripe(CHILD_NET),
                },
            ],
            description: 'Patterson Family Reunion 2027 registration',
            customerEmail: 'alice@example.com',
            successUrl: 'https://example.com/register/pay?confirming',
            cancelUrl: 'https://example.com/register/pay',
        })
    })

    it('refuses a token that matches no registration', async () => {
        await seedBooking()

        await expect(pay('not-a-real-token')).rejects.toMatchObject({ status: 404 })
        expect(mockCreateCheckout).not.toHaveBeenCalled()
    })

    /* Settled by hand a minute ago: charging again would take the money twice. */
    it('refuses when nobody is owed any more', async () => {
        const seeded = await seedBooking({ owed: false })

        await expect(pay(seeded.viewToken)).rejects.toMatchObject({ status: 409 })
        expect(mockCreateCheckout).not.toHaveBeenCalled()
    })

    /* A pending booking is owed whole, through its own checkout or by hand — never through here. */
    it('refuses a booking that is not paid', async () => {
        const seeded = await seedBooking({ status: 'pending', owed: false })

        await expect(pay(seeded.viewToken)).rejects.toMatchObject({ status: 409 })
        expect(mockCreateCheckout).not.toHaveBeenCalled()
    })
})
