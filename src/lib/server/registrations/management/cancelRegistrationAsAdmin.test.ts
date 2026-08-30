import { describe, it, expect, vi, beforeEach } from 'vitest'

/* The organiser's cancel, which exists because a paper registration could not be cancelled at all:
   setRegistrationStatus refuses 'refunded' in both directions, and cancelRegistration needs the
   management token, which is only ever stored as a hash.

   These tests cover what is specific to the ADMIN path — the event pairing, the already-cancelled
   no-op, and that a cheque registration cancels without touching Stripe. The refund contract itself
   (loud failure, one fee per intent, the email) lives in _performCancellation and is covered by
   cancelRegistration.test.ts, which exercises the same function through the registrant's route. */

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

const mockRefund = vi.fn()
const mockRetrieveIntent = vi.fn()
const mockSendCancellation = vi.fn()

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
vi.mock('$lib/server/reportError', () => ({ reportError: vi.fn() }))

const { cancelRegistrationAsAdmin } = await import('./cancelRegistrationAsAdmin')

const EVENT_ID = 'evt-2027'
const REGISTRATION_ID = 'reg-1'
const REGISTER_URL = 'https://example.com/register'

/* A cheque registration: paid, but never through Checkout. The case the feature was added for. */
const PAPER_PAID = {
    id: REGISTRATION_ID,
    eventId: EVENT_ID,
    status: 'paid',
    stripeSessionId: null,
    contactName: 'Wanda Trantow',
    contactEmail: 'wanda@example.com',
}

function cancel() {
    return cancelRegistrationAsAdmin({
        registrationId: REGISTRATION_ID,
        eventId: EVENT_ID,
        registerUrl: REGISTER_URL,
    })
}

describe('cancelRegistrationAsAdmin', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockTerminal.mockReset()
        mockUpdate.mockReturnValue(mockDb)
        mockSet.mockReturnValue(mockDb)
        mockRefund.mockResolvedValue(undefined)
        mockRetrieveIntent.mockResolvedValue(null)
        mockSendCancellation.mockResolvedValue(undefined)
    })

    /* THE case this exists for: money arrived as a cheque, so there is nothing for Stripe to refund and
       the cancellation must still go through. */
    it('cancels a paper registration without touching Stripe', async () => {
        mockTerminal
            .mockResolvedValueOnce([PAPER_PAID])
            .mockResolvedValueOnce([
                { name: 'Wanda', priceCents: 16000, stripePaymentIntentId: null },
            ])
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce([{ title: 'Patterson Family Reunion' }])

        await cancel()

        expect(mockRefund).not.toHaveBeenCalled()
        expect(mockRetrieveIntent).not.toHaveBeenCalled()
        expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'refunded' }))
    })

    /* And it tells them the truth about the money: 'by_hand', not a promised card refund. */
    it('emails a paper registrant that their refund is arranged, not automatic', async () => {
        mockTerminal
            .mockResolvedValueOnce([PAPER_PAID])
            .mockResolvedValueOnce([
                { name: 'Wanda', priceCents: 16000, stripePaymentIntentId: null },
            ])
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce([{ title: 'Patterson Family Reunion' }])

        await cancel()

        expect(mockSendCancellation.mock.calls[0][1].refundRoute).toBe('by_hand')
    })

    /* A card payment must still be refunded when an organiser cancels on someone's behalf. Restricting
       this to paper registrations would leave the harder half of the job undone. */
    it('refunds a card payment when the organiser cancels', async () => {
        mockTerminal
            .mockResolvedValueOnce([{ ...PAPER_PAID, stripeSessionId: 'cs_1' }])
            .mockResolvedValueOnce([
                { name: 'Wanda', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
            ])
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce([{ title: 'Patterson Family Reunion' }])

        await cancel()

        expect(mockRefund).toHaveBeenCalledWith(
            'pi_1',
            undefined,
            expect.stringContaining(REGISTRATION_ID),
        )
    })

    /* The pairing invariant, enforced at the write rather than trusted from the route: a URL naming one
       year must not cancel another year's registration. */
    it('404s when the registration belongs to a different event', async () => {
        mockTerminal.mockResolvedValueOnce([{ ...PAPER_PAID, eventId: 'evt-2024' }])

        await expect(cancel()).rejects.toThrow()

        expect(mockRefund).not.toHaveBeenCalled()
        expect(mockSet).not.toHaveBeenCalled()
        expect(mockSendCancellation).not.toHaveBeenCalled()
    })

    it('404s on a registration that does not exist', async () => {
        mockTerminal.mockResolvedValueOnce([])

        await expect(cancel()).rejects.toThrow()

        expect(mockSet).not.toHaveBeenCalled()
    })

    /* A double-submitted dialog must not email a second cancellation. Quietly doing nothing is right
       here — the end state the organiser asked for already holds. */
    it('does nothing when the registration is already cancelled', async () => {
        mockTerminal.mockResolvedValueOnce([{ ...PAPER_PAID, status: 'refunded' }])

        await expect(cancel()).resolves.toBeUndefined()

        expect(mockRefund).not.toHaveBeenCalled()
        expect(mockSet).not.toHaveBeenCalled()
        expect(mockSendCancellation).not.toHaveBeenCalled()
    })

    /* An unpaid paper entry — someone who never sent the cheque. Nothing to refund, and the email must
       not imply otherwise. */
    it('closes an unpaid registration with nothing to refund', async () => {
        mockTerminal
            .mockResolvedValueOnce([{ ...PAPER_PAID, status: 'pending' }])
            .mockResolvedValueOnce([
                { name: 'Wanda', priceCents: 16000, stripePaymentIntentId: null },
            ])
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce([{ title: 'Patterson Family Reunion' }])

        await cancel()

        expect(mockRefund).not.toHaveBeenCalled()
        expect(mockSendCancellation.mock.calls[0][1].refundRoute).toBe('nothing_paid')
        expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'refunded' }))
    })

    /* No lock-date check, unlike the registrant's own cancel: assertRegistrationEditable stops a
       REGISTRANT editing after numbers have gone to the caterer, which is not a rule organisers need
       protecting from. Someone dropping out late is exactly what this has to record. */
    it('does not consult the registration lock date', async () => {
        const source = await import('node:fs').then((fs) =>
            fs.readFileSync(
                'src/lib/server/registrations/management/cancelRegistrationAsAdmin.ts',
                'utf8',
            ),
        )
        expect(source.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/assertRegistrationEditable/)
    })
})
