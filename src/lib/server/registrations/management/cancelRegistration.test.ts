import { eq } from 'drizzle-orm'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'

/* The money contract of a cancellation.

   The defect these tests exist for: refund failures were caught, logged to a debug namespace that
   writes nothing in production, and the registration was marked 'refunded' anyway. Every surface then
   agreed the money had gone back — the admin list, the registrant's own page, the status badge — while
   Stripe still held it. Nothing disagreed, so nothing could be noticed.

   removeMember already had the right contract, and this now matches it: on a failed refund, leave the
   state alone and raise a 502. Retrying is safe because each refund carries a stable per-intent
   idempotency key.

   These run against a real Postgres (PGLite, restored per case), so the assertions are on ROWS. The
   version this replaced drove a hand-rolled thenable chain whose queued values had to be listed in the
   order the function happened to query them — which pinned the implementation, not the contract, and
   could not have caught a wrong WHERE clause because `eq` was itself a vi.fn(). Stripe and Resend stay
   mocked: those are the genuinely external dependencies. */

const mockRefund = vi.fn()
const mockRetrieveIntent = vi.fn()
const mockSendCancellation = vi.fn()
const mockReportError = vi.fn()

vi.mock('$lib/server/payments', () => ({
    refundPaymentIntent: mockRefund,
    retrieveSessionPaymentIntent: mockRetrieveIntent,
}))
vi.mock('$lib/server/email', () => ({ sendCancellationEmail: mockSendCancellation }))
vi.mock('$lib/server/reportError', () => ({ reportError: mockReportError }))

const { cancelRegistration } = await import('./cancelRegistration')

const REGISTER_URL = 'https://example.com/register'

let db: Awaited<ReturnType<typeof resetTestDb>>

async function statusOf(registrationId: string) {
    const [row] = await db
        .select({ status: registrations.status })
        .from(registrations)
        .where(eq(registrations.id, registrationId))
    return row.status
}

describe('cancelRegistration', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        mockRefund.mockResolvedValue(undefined)
        mockRetrieveIntent.mockResolvedValue(null)
        mockSendCancellation.mockResolvedValue(undefined)
        db = await resetTestDb()
    })

    it('refunds the payment and marks the registration refunded', async () => {
        const seeded = await seedRegistration(db)

        await cancelRegistration(seeded.registrationId, seeded.managementToken, REGISTER_URL)

        expect(mockRefund).toHaveBeenCalledWith(
            'pi_1',
            undefined,
            `cancel-registration-${seeded.registrationId}-pi_1`,
        )
        expect(await statusOf(seeded.registrationId)).toBe('refunded')
    })

    /* THE defect. A refund that fails must not leave a registration claiming the money went back. */
    it('does not mark refunded when the refund fails', async () => {
        const seeded = await seedRegistration(db)
        mockRefund.mockRejectedValueOnce(new Error('card_declined'))

        await expect(
            cancelRegistration(seeded.registrationId, seeded.managementToken, REGISTER_URL),
        ).rejects.toThrow()

        expect(await statusOf(seeded.registrationId)).toBe('paid')
    })

    it('reports a failed refund with the intent that failed', async () => {
        const seeded = await seedRegistration(db)
        mockRefund.mockRejectedValueOnce(new Error('card_declined'))

        await expect(
            cancelRegistration(seeded.registrationId, seeded.managementToken, REGISTER_URL),
        ).rejects.toThrow()

        expect(mockReportError).toHaveBeenCalledWith(
            expect.stringContaining('refund failed'),
            expect.any(Error),
            expect.objectContaining({ paymentIntentId: 'pi_1' }),
        )
    })

    it('sends no email when the refund failed', async () => {
        const seeded = await seedRegistration(db)
        mockRefund.mockRejectedValueOnce(new Error('card_declined'))

        await expect(
            cancelRegistration(seeded.registrationId, seeded.managementToken, REGISTER_URL),
        ).rejects.toThrow()

        expect(mockSendCancellation).not.toHaveBeenCalled()
    })

    /* Several intents, one failing. Every refund is still attempted — allSettled rather than all — so
       a retry has less left to do, and the failure is still loud. */
    it('attempts every refund even when one fails', async () => {
        const seeded = await seedRegistration(db, {
            members: [
                { name: 'Alice', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
                { name: 'Marcus', priceCents: 16509, stripePaymentIntentId: 'pi_2' },
            ],
        })
        mockRefund.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined)

        await expect(
            cancelRegistration(seeded.registrationId, seeded.managementToken, REGISTER_URL),
        ).rejects.toThrow()

        expect(mockRefund).toHaveBeenCalledTimes(2)
        expect(await statusOf(seeded.registrationId)).toBe('paid')
    })

    /* Two members bought on one Checkout session share an intent; refunding it twice would try to
       return the money twice. */
    it('refunds a shared payment intent once', async () => {
        const seeded = await seedRegistration(db, {
            members: [
                { name: 'Alice', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
                { name: 'Marcus', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
            ],
        })

        await cancelRegistration(seeded.registrationId, seeded.managementToken, REGISTER_URL)

        expect(mockRefund).toHaveBeenCalledTimes(1)
    })

    /* Money arrived through Stripe and cannot be located. Cancelling would report a refund that was
       never issued anywhere. */
    it('refuses to cancel a paid online registration with no findable payment', async () => {
        const seeded = await seedRegistration(db, {
            members: [{ name: 'Alice', priceCents: 16509, stripePaymentIntentId: null }],
        })
        mockRetrieveIntent.mockResolvedValueOnce(null)

        await expect(
            cancelRegistration(seeded.registrationId, seeded.managementToken, REGISTER_URL),
        ).rejects.toThrow()

        expect(mockRefund).not.toHaveBeenCalled()
        expect(await statusOf(seeded.registrationId)).toBe('paid')
    })

    it('falls back to the session intent when members have none', async () => {
        const seeded = await seedRegistration(db, {
            members: [{ name: 'Alice', priceCents: 16509, stripePaymentIntentId: null }],
        })
        mockRetrieveIntent.mockResolvedValueOnce('pi_session')

        await cancelRegistration(seeded.registrationId, seeded.managementToken, REGISTER_URL)

        expect(mockRefund).toHaveBeenCalledWith(
            'pi_session',
            undefined,
            expect.stringContaining('pi_session'),
        )
        expect(await statusOf(seeded.registrationId)).toBe('refunded')
    })

    /* A cheque or cash registration has no Stripe payment at all. It must still be cancellable —
       throwing here would make paper registrations impossible to cancel. */
    it('cancels a paper-paid registration without refunding through Stripe', async () => {
        const seeded = await seedRegistration(db, {
            stripeSessionId: null,
            members: [{ name: 'Alice', priceCents: 16509, stripePaymentIntentId: null }],
        })

        await cancelRegistration(seeded.registrationId, seeded.managementToken, REGISTER_URL)

        expect(mockRefund).not.toHaveBeenCalled()
        expect(await statusOf(seeded.registrationId)).toBe('refunded')
        expect(mockSendCancellation.mock.calls[0][1].refundRoute).toBe('by_hand')
    })

    /* An abandoned checkout has a session and no payment. There is nothing to send back, and it must
       not be confused with the paid-but-unfindable case above. */
    it('cancels an unpaid registration with no refund and no error', async () => {
        const seeded = await seedRegistration(db, {
            status: 'pending',
            members: [{ name: 'Alice', priceCents: 16509, stripePaymentIntentId: null }],
        })

        await cancelRegistration(seeded.registrationId, seeded.managementToken, REGISTER_URL)

        expect(mockRefund).not.toHaveBeenCalled()
        expect(await statusOf(seeded.registrationId)).toBe('refunded')
        expect(mockSendCancellation.mock.calls[0][1].refundRoute).toBe('nothing_paid')
    })

    it('describes a waived place as having nothing to refund', async () => {
        const seeded = await seedRegistration(db, {
            status: 'waived',
            stripeSessionId: null,
            members: [{ name: 'Alice', priceCents: 0, stripePaymentIntentId: null }],
        })

        await cancelRegistration(seeded.registrationId, seeded.managementToken, REGISTER_URL)

        expect(mockSendCancellation.mock.calls[0][1].refundRoute).toBe('waived')
    })

    it('emails the registrant the party and the total', async () => {
        const seeded = await seedRegistration(db, {
            eventTitle: 'Patterson Family Reunion 2027',
            members: [
                { name: 'Alice', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
                { name: 'Marcus', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
            ],
        })

        await cancelRegistration(seeded.registrationId, seeded.managementToken, REGISTER_URL)

        const [to, data, idempotencyKey] = mockSendCancellation.mock.calls[0]
        expect(to).toBe('alice@example.com')
        expect(data).toMatchObject({
            name: 'Alice Patterson',
            eventTitle: 'Patterson Family Reunion 2027',
            partyNames: ['Alice', 'Marcus'],
            totalCents: 33018,
            refundRoute: 'stripe',
            registerUrl: REGISTER_URL,
        })
        /* A double-submitted dialog must not deliver two of these. */
        expect(idempotencyKey).toBe(`cancel/${seeded.registrationId}`)
    })

    /* The refund has settled and the status is written by this point. Throwing would report a failed
       cancellation that actually succeeded — the inverse of /register/recover, which must not commit
       until its mail is away. */
    it('does not undo a completed cancellation when the email fails', async () => {
        const seeded = await seedRegistration(db)
        mockSendCancellation.mockRejectedValueOnce(new Error('resend down'))

        await expect(
            cancelRegistration(seeded.registrationId, seeded.managementToken, REGISTER_URL),
        ).resolves.toBeUndefined()

        expect(await statusOf(seeded.registrationId)).toBe('refunded')
        expect(mockReportError).toHaveBeenCalledWith(
            expect.stringContaining('cancellation email'),
            expect.any(Error),
            expect.objectContaining({ registrationId: seeded.registrationId }),
        )
    })

    it('404s on a token that does not match the registration', async () => {
        const seeded = await seedRegistration(db)
        const other = await seedRegistration(db, {
            eventId: seeded.eventId,
            contactEmail: 'someone@example.com',
        })

        await expect(
            cancelRegistration(seeded.registrationId, other.managementToken, REGISTER_URL),
        ).rejects.toThrow()

        expect(mockRefund).not.toHaveBeenCalled()
        expect(await statusOf(seeded.registrationId)).toBe('paid')
    })

    it('404s on an unknown token', async () => {
        const seeded = await seedRegistration(db)

        await expect(
            cancelRegistration(seeded.registrationId, 'not-a-real-token', REGISTER_URL),
        ).rejects.toThrow()

        expect(mockRefund).not.toHaveBeenCalled()
        expect(await statusOf(seeded.registrationId)).toBe('paid')
    })

    /* The lock date gate is real here for the first time: assertRegistrationEditable used to be
       mocked away, so nothing checked that a locked event actually stops a cancellation. */
    it('refuses to cancel once the registration lock date has passed', async () => {
        const seeded = await seedRegistration(db, {
            registrationLockDate: new Date('2020-01-01'),
        })

        await expect(
            cancelRegistration(seeded.registrationId, seeded.managementToken, REGISTER_URL),
        ).rejects.toThrow()

        expect(mockRefund).not.toHaveBeenCalled()
        expect(await statusOf(seeded.registrationId)).toBe('paid')
    })

    /* Cancelling does not delete anyone: the party is what the order sheet and the refund amount are
       read off afterwards. Nothing asserted this while the delete path was a vi.fn(). */
    it('leaves the party members in place', async () => {
        const seeded = await seedRegistration(db, {
            members: [
                { name: 'Alice', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
                { name: 'Marcus', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
            ],
        })

        await cancelRegistration(seeded.registrationId, seeded.managementToken, REGISTER_URL)

        const remaining = await db
            .select()
            .from(partyMembers)
            .where(eq(partyMembers.registrationId, seeded.registrationId))
        expect(remaining).toHaveLength(2)
    })
})
