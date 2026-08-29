import { describe, it, expect, vi, beforeEach } from 'vitest'

/* The money contract of a cancellation.

   The defect these tests exist for: refund failures were caught, logged to a debug namespace that
   writes nothing in production, and the registration was marked 'refunded' anyway. Every surface then
   agreed the money had gone back — the admin list, the registrant's own page, the status badge — while
   Stripe still held it. Nothing disagreed, so nothing could be noticed.

   removeMember already had the right contract, and this now matches it: on a failed refund, leave the
   state alone and raise a 502. Retrying is safe because each refund carries a stable per-intent
   idempotency key.

   The db mock is a thenable chain, so each awaited query takes the next queued terminal value. The
   order matters and is asserted where it does: members select, then the update, then the event. */

const { mockTerminal, mockSet, mockUpdate, mockDb } = vi.hoisted(() => {
    const mockTerminal = vi.fn()
    const mockSet = vi.fn()
    const mockUpdate = vi.fn()
    const chain: Record<string, ReturnType<typeof vi.fn>> = {
        select: vi.fn(),
        from: vi.fn(),
        where: vi.fn(),
        limit: vi.fn(),
        update: mockUpdate,
        set: mockSet,
    }
    for (const key of ['select', 'from', 'where', 'limit']) {
        chain[key].mockReturnValue(chain)
    }
    mockUpdate.mockReturnValue(chain)
    mockSet.mockReturnValue(chain)
    ;(chain as unknown as { then: unknown }).then = (onFulfilled: unknown, onRejected: unknown) =>
        (mockTerminal as unknown as () => Promise<unknown>)().then(
            onFulfilled as (value: unknown) => unknown,
            onRejected as (reason: unknown) => unknown,
        )
    return { mockTerminal, mockSet, mockUpdate, mockDb: chain }
})

const mockGetRegistrationByToken = vi.fn()
const mockRefund = vi.fn()
const mockRetrieveIntent = vi.fn()
const mockSendCancellation = vi.fn()
const mockReportError = vi.fn()

vi.mock('$lib/server/db', () => ({ db: mockDb }))
vi.mock('$lib/server/db/schema', () => ({
    partyMembers: {},
    registrations: {},
    reunionEvents: {},
}))
vi.mock('$lib/server/debug', () => ({ dbg: { register: vi.fn() } }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('$lib/server/payments', () => ({
    refundPaymentIntent: mockRefund,
    retrieveSessionPaymentIntent: mockRetrieveIntent,
}))
vi.mock('$lib/server/email', () => ({ sendCancellationEmail: mockSendCancellation }))
vi.mock('$lib/server/reportError', () => ({ reportError: mockReportError }))
vi.mock('../assertRegistrationEditable', () => ({ assertRegistrationEditable: vi.fn() }))
vi.mock('../getRegistrationLockDate', () => ({ getRegistrationLockDate: vi.fn() }))
vi.mock('../queries/getRegistrationByToken', () => ({
    getRegistrationByToken: mockGetRegistrationByToken,
}))

const { cancelRegistration } = await import('./cancelRegistration')

const REGISTRATION_ID = 'reg-1'
const REGISTER_URL = 'https://example.com/register'

const PAID_ONLINE = {
    id: REGISTRATION_ID,
    eventId: 'evt-1',
    status: 'paid',
    stripeSessionId: 'cs_1',
    contactName: 'Alice Patterson',
    contactEmail: 'alice@example.com',
}

/* One awaited query per call, in the order the function makes them. */
function queueDb(params: {
    members: { name: string; priceCents: number; stripePaymentIntentId: string | null }[]
    eventTitle?: string
}) {
    mockTerminal.mockResolvedValueOnce(params.members)
    mockTerminal.mockResolvedValueOnce(undefined)
    mockTerminal.mockResolvedValueOnce([{ title: params.eventTitle ?? 'Reunion 2027' }])
}

const ONE_CARD_MEMBER = [
    { name: 'Alice Patterson', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
]

function cancel() {
    return cancelRegistration(REGISTRATION_ID, 'plain-token', REGISTER_URL)
}

describe('cancelRegistration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockTerminal.mockReset()
        mockUpdate.mockReturnValue(mockDb)
        mockSet.mockReturnValue(mockDb)
        mockGetRegistrationByToken.mockResolvedValue(PAID_ONLINE)
        mockRefund.mockResolvedValue(undefined)
        mockRetrieveIntent.mockResolvedValue(null)
        mockSendCancellation.mockResolvedValue(undefined)
    })

    it('refunds the payment and marks the registration refunded', async () => {
        queueDb({ members: ONE_CARD_MEMBER })

        await cancel()

        expect(mockRefund).toHaveBeenCalledWith(
            'pi_1',
            undefined,
            `cancel-registration-${REGISTRATION_ID}-pi_1`,
        )
        expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'refunded' }))
    })

    /* THE defect. A refund that fails must not leave a registration claiming the money went back. */
    it('does not mark refunded when the refund fails', async () => {
        queueDb({ members: ONE_CARD_MEMBER })
        mockRefund.mockRejectedValueOnce(new Error('card_declined'))

        await expect(cancel()).rejects.toThrow()

        expect(mockSet).not.toHaveBeenCalled()
        expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('reports a failed refund with the intent that failed', async () => {
        queueDb({ members: ONE_CARD_MEMBER })
        mockRefund.mockRejectedValueOnce(new Error('card_declined'))

        await expect(cancel()).rejects.toThrow()

        expect(mockReportError).toHaveBeenCalledWith(
            expect.stringContaining('refund failed'),
            expect.any(Error),
            expect.objectContaining({ paymentIntentId: 'pi_1' }),
        )
    })

    it('sends no email when the refund failed', async () => {
        queueDb({ members: ONE_CARD_MEMBER })
        mockRefund.mockRejectedValueOnce(new Error('card_declined'))

        await expect(cancel()).rejects.toThrow()

        expect(mockSendCancellation).not.toHaveBeenCalled()
    })

    /* Several intents, one failing. Every refund is still attempted — allSettled rather than all — so
       a retry has less left to do, and the failure is still loud. */
    it('attempts every refund even when one fails', async () => {
        queueDb({
            members: [
                { name: 'Alice', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
                { name: 'Marcus', priceCents: 16509, stripePaymentIntentId: 'pi_2' },
            ],
        })
        mockRefund.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined)

        await expect(cancel()).rejects.toThrow()

        expect(mockRefund).toHaveBeenCalledTimes(2)
        expect(mockSet).not.toHaveBeenCalled()
    })

    /* Two members bought on one Checkout session share an intent; refunding it twice would try to
       return the money twice. */
    it('refunds a shared payment intent once', async () => {
        queueDb({
            members: [
                { name: 'Alice', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
                { name: 'Marcus', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
            ],
        })

        await cancel()

        expect(mockRefund).toHaveBeenCalledTimes(1)
    })

    /* Money arrived through Stripe and cannot be located. Cancelling would report a refund that was
       never issued anywhere. */
    it('refuses to cancel a paid online registration with no findable payment', async () => {
        queueDb({ members: [{ name: 'Alice', priceCents: 16509, stripePaymentIntentId: null }] })
        mockRetrieveIntent.mockResolvedValueOnce(null)

        await expect(cancel()).rejects.toThrow()

        expect(mockRefund).not.toHaveBeenCalled()
        expect(mockSet).not.toHaveBeenCalled()
    })

    it('falls back to the session intent when members have none', async () => {
        queueDb({ members: [{ name: 'Alice', priceCents: 16509, stripePaymentIntentId: null }] })
        mockRetrieveIntent.mockResolvedValueOnce('pi_session')

        await cancel()

        expect(mockRefund).toHaveBeenCalledWith(
            'pi_session',
            undefined,
            expect.stringContaining('pi_session'),
        )
        expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'refunded' }))
    })

    /* A cheque or cash registration has no Stripe payment at all. It must still be cancellable —
       throwing here would make paper registrations impossible to cancel. */
    it('cancels a paper-paid registration without refunding through Stripe', async () => {
        mockGetRegistrationByToken.mockResolvedValue({
            ...PAID_ONLINE,
            stripeSessionId: null,
        })
        queueDb({ members: [{ name: 'Alice', priceCents: 16509, stripePaymentIntentId: null }] })

        await cancel()

        expect(mockRefund).not.toHaveBeenCalled()
        expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'refunded' }))
        expect(mockSendCancellation.mock.calls[0][1].refundRoute).toBe('by_hand')
    })

    /* An abandoned checkout has a session and no payment. There is nothing to send back, and it must
       not be confused with the paid-but-unfindable case above. */
    it('cancels an unpaid registration with no refund and no error', async () => {
        mockGetRegistrationByToken.mockResolvedValue({ ...PAID_ONLINE, status: 'pending' })
        queueDb({ members: [{ name: 'Alice', priceCents: 16509, stripePaymentIntentId: null }] })

        await cancel()

        expect(mockRefund).not.toHaveBeenCalled()
        expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'refunded' }))
        expect(mockSendCancellation.mock.calls[0][1].refundRoute).toBe('nothing_paid')
    })

    it('describes a waived place as having nothing to refund', async () => {
        mockGetRegistrationByToken.mockResolvedValue({
            ...PAID_ONLINE,
            status: 'waived',
            stripeSessionId: null,
        })
        queueDb({ members: [{ name: 'Alice', priceCents: 0, stripePaymentIntentId: null }] })

        await cancel()

        expect(mockSendCancellation.mock.calls[0][1].refundRoute).toBe('waived')
    })

    it('emails the registrant the party and the total', async () => {
        queueDb({
            members: [
                { name: 'Alice', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
                { name: 'Marcus', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
            ],
            eventTitle: 'Patterson Family Reunion 2027',
        })

        await cancel()

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
        expect(idempotencyKey).toBe(`cancel/${REGISTRATION_ID}`)
    })

    /* The refund has settled and the status is written by this point. Throwing would report a failed
       cancellation that actually succeeded — the inverse of /register/recover, which must not commit
       until its mail is away. */
    it('does not undo a completed cancellation when the email fails', async () => {
        queueDb({ members: ONE_CARD_MEMBER })
        mockSendCancellation.mockRejectedValueOnce(new Error('resend down'))

        await expect(cancel()).resolves.toBeUndefined()

        expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'refunded' }))
        expect(mockReportError).toHaveBeenCalledWith(
            expect.stringContaining('cancellation email'),
            expect.any(Error),
            expect.objectContaining({ registrationId: REGISTRATION_ID }),
        )
    })

    it('404s on a token that does not match the registration', async () => {
        mockGetRegistrationByToken.mockResolvedValue({ ...PAID_ONLINE, id: 'someone-else' })

        await expect(cancel()).rejects.toThrow()

        expect(mockRefund).not.toHaveBeenCalled()
        expect(mockSet).not.toHaveBeenCalled()
    })

    it('404s on an unknown token', async () => {
        mockGetRegistrationByToken.mockResolvedValue(undefined)

        await expect(cancel()).rejects.toThrow()

        expect(mockRefund).not.toHaveBeenCalled()
    })
})
