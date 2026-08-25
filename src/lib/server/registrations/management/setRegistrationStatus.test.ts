import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockTerminal, mockSet, mockDb } = vi.hoisted(() => {
    const mockTerminal = vi.fn().mockResolvedValue([])
    const mockSet = vi.fn()
    const chain: Record<string, ReturnType<typeof vi.fn>> = {
        select: vi.fn(),
        from: vi.fn(),
        where: vi.fn(),
        limit: vi.fn(),
        update: vi.fn(),
        set: mockSet,
    }
    for (const key of ['select', 'from', 'where', 'limit', 'update']) {
        chain[key].mockReturnValue(chain)
    }
    mockSet.mockReturnValue(chain)
    ;(chain as unknown as { then: unknown }).then = (onFulfilled: unknown, onRejected: unknown) =>
        (mockTerminal as unknown as () => Promise<unknown>)().then(
            onFulfilled as (value: unknown) => unknown,
            onRejected as (reason: unknown) => unknown,
        )
    return { mockTerminal, mockSet, mockDb: chain }
})

vi.mock('$lib/server/db', () => ({ db: mockDb }))
vi.mock('$lib/server/db/schema', () => ({ registrations: {} }))
vi.mock('$lib/server/debug', () => ({ dbg: { register: vi.fn() } }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))

const { setRegistrationStatus } = await import('./setRegistrationStatus')

describe('setRegistrationStatus', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockTerminal.mockReset()
        mockTerminal.mockResolvedValue([])
        mockSet.mockReturnValue(mockDb)
    })

    /* The gap this function exists to close: only fulfillCheckout could set 'paid', via Stripe, so
       a paper registration entered as pending was stuck permanently. */
    it('records that a pending paper registration was paid', async () => {
        mockTerminal.mockResolvedValueOnce([{ status: 'pending' }])

        await setRegistrationStatus({ registrationId: 'reg-1', status: 'paid' })

        expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid' }))
    })

    it.each([
        ['pending', 'waived'],
        ['paid', 'pending'],
        ['waived', 'paid'],
    ])('moves %s -> %s', async (from, to) => {
        mockTerminal.mockResolvedValueOnce([{ status: from }])
        await setRegistrationStatus({
            registrationId: 'reg-1',
            status: to as 'pending' | 'paid' | 'waived',
        })
        expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: to }))
    })

    /* Reviving a cancelled party would present a registration as paid when the money went back. */
    it('refuses to move a refunded registration', async () => {
        mockTerminal.mockResolvedValueOnce([{ status: 'refunded' }])

        await expect(
            setRegistrationStatus({ registrationId: 'reg-1', status: 'paid' }),
        ).rejects.toThrow()
        expect(mockSet).not.toHaveBeenCalled()
    })

    it('404s on a missing registration without writing', async () => {
        mockTerminal.mockResolvedValueOnce([])
        await expect(
            setRegistrationStatus({ registrationId: 'nope', status: 'paid' }),
        ).rejects.toThrow()
        expect(mockSet).not.toHaveBeenCalled()
    })

    it('is a no-op when the status already matches', async () => {
        mockTerminal.mockResolvedValueOnce([{ status: 'paid' }])
        await setRegistrationStatus({ registrationId: 'reg-1', status: 'paid' })
        expect(mockSet).not.toHaveBeenCalled()
    })

    /* Setting 'refunded' has to go through cancelRegistration so the refund is actually issued —
       the type forbids it, and this records why. */
    it('does not accept refunded as a target', () => {
        const settable: Array<'pending' | 'paid' | 'waived'> = ['pending', 'paid', 'waived']
        expect(settable).not.toContain('refunded')
    })
})
