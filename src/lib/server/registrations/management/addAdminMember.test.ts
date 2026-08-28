import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockTerminal, mockReturning, mockSet, mockValues, mockDb } = vi.hoisted(() => {
    /* Terminal queue: each await on a builder pulls the next queued value. */
    const mockTerminal = vi.fn().mockResolvedValue([])
    const mockReturning = vi.fn().mockResolvedValue([{ id: 'member-new' }])
    const mockSet = vi.fn()
    const mockValues = vi.fn()

    const chain: Record<string, ReturnType<typeof vi.fn>> = {
        select: vi.fn(),
        from: vi.fn(),
        where: vi.fn(),
        limit: vi.fn(),
        update: vi.fn(),
        set: mockSet,
        insert: vi.fn(),
        values: mockValues,
        returning: mockReturning,
    }
    for (const key of ['select', 'from', 'where', 'limit', 'update', 'insert']) {
        chain[key].mockReturnValue(chain)
    }
    mockSet.mockReturnValue(chain)
    mockValues.mockReturnValue(chain)
    ;(chain as unknown as { then: unknown }).then = (onFulfilled: unknown, onRejected: unknown) =>
        (mockTerminal as unknown as () => Promise<unknown>)().then(
            onFulfilled as (value: unknown) => unknown,
            onRejected as (reason: unknown) => unknown,
        )
    return { mockTerminal, mockReturning, mockSet, mockValues, mockDb: chain }
})

const { mockResolveTierPricing } = vi.hoisted(() => ({ mockResolveTierPricing: vi.fn() }))

vi.mock('$lib/server/db', () => ({ db: mockDb }))
vi.mock('$lib/server/db/schema', () => ({ partyMembers: {}, registrations: {} }))
vi.mock('$lib/server/debug', () => ({ dbg: { register: vi.fn() } }))
vi.mock('$lib/server/tiers', () => ({ resolveTierPricing: mockResolveTierPricing }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('$lib/utils/age', () => ({
    parseBirthDate: () => ({ birthYear: 1990, birthMonth: 5, birthDay: 5 }),
}))

const { addAdminMember } = await import('./addAdminMember')

const MEMBER = {
    name: '  Marcus Patterson  ',
    tierId: 'tier-adult',
    birthDate: '1990-05-05',
    shirtSize: 'L',
    addressLine1: '1 Main St',
    addressCity: 'Oakland',
    addressState: 'CA',
    addressZip: '94612',
    vegetarianMeal: true,
    attendedReunion2025: false,
}

describe('addAdminMember', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockTerminal.mockReset()
        mockTerminal.mockResolvedValue([])
        mockReturning.mockResolvedValue([{ id: 'member-new' }])
        mockSet.mockReturnValue(mockDb)
        mockValues.mockReturnValue(mockDb)
        /* Net tier price — deliberately NOT grossed up for Stripe. */
        mockResolveTierPricing.mockResolvedValue({
            'tier-adult': { label: 'Adult', priceCents: 16000 },
        })
    })

    /* The whole point of this function: an offline addition must sit on the same price basis as
       the rest of an admin-entered party, not carry a Stripe gross-up. */
    it('snapshots the net tier price and leaves the payment intent null', async () => {
        mockTerminal.mockResolvedValueOnce([{ status: 'paid', eventId: 'evt-1' }])

        await addAdminMember({ registrationId: 'reg-1', member: MEMBER })

        expect(mockValues).toHaveBeenCalledWith(
            expect.objectContaining({
                registrationId: 'reg-1',
                name: 'Marcus Patterson',
                tierLabel: 'Adult',
                priceCents: 16000,
            }),
        )
        /* Never set, which is also what marks the row as never charged online. */
        const [inserted] = mockValues.mock.calls[0]
        expect(inserted.stripePaymentIntentId).toBeUndefined()
    })

    it('trims the name', async () => {
        mockTerminal.mockResolvedValueOnce([{ status: 'paid', eventId: 'evt-1' }])
        await addAdminMember({ registrationId: 'reg-1', member: MEMBER })
        expect(mockValues.mock.calls[0][0].name).toBe('Marcus Patterson')
    })

    it.each(['paid', 'waived', 'pending'])('allows adding to a %s registration', async (status) => {
        mockTerminal.mockResolvedValueOnce([{ status, eventId: 'evt-1' }])
        await expect(
            addAdminMember({ registrationId: 'reg-1', member: MEMBER }),
        ).resolves.toMatchObject({ memberId: 'member-new' })
    })

    /* A refunded registration's money went back; adding to it would create an attendee nobody
       paid for and no total accounts for. */
    it('refuses a cancelled registration', async () => {
        mockTerminal.mockResolvedValueOnce([{ status: 'refunded', eventId: 'evt-1' }])
        await expect(addAdminMember({ registrationId: 'reg-1', member: MEMBER })).rejects.toThrow()
        expect(mockValues).not.toHaveBeenCalled()
    })

    it('404s on a missing registration without inserting', async () => {
        mockTerminal.mockResolvedValueOnce([])
        await expect(addAdminMember({ registrationId: 'nope', member: MEMBER })).rejects.toThrow()
        expect(mockValues).not.toHaveBeenCalled()
    })

    it('preserves the unanswered questions as null rather than false', async () => {
        mockTerminal.mockResolvedValueOnce([{ status: 'paid', eventId: 'evt-1' }])
        await addAdminMember({
            registrationId: 'reg-1',
            member: { ...MEMBER, vegetarianMeal: undefined, attendedReunion2025: undefined },
        })
        const [inserted] = mockValues.mock.calls[0]
        expect(inserted.vegetarianMeal).toBeNull()
        expect(inserted.attendedReunion2025).toBeNull()
    })
})
