import { describe, it, expect, vi, beforeEach } from 'vitest'

/* Chainable db mock. select() resolves to whatever the pending queue yields; update/delete/insert
   record their calls so the tests can assert what was written. */
const { mockDb, selectQueue, mockSet, mockDelete, mockUpdate } = vi.hoisted(() => {
    const selectQueue: unknown[][] = []
    const mockSet = vi.fn()
    const mockDelete = vi.fn()
    const mockUpdate = vi.fn()

    const selectChain = {
        from: () => selectChain,
        innerJoin: () => selectChain,
        where: () => selectChain,
        limit: () => Promise.resolve(selectQueue.shift() ?? []),
        then: (resolve: (rows: unknown[]) => unknown) =>
            Promise.resolve(selectQueue.shift() ?? []).then(resolve),
    }

    const updateChain = {
        set: (values: unknown) => {
            mockSet(values)
            return { where: () => Promise.resolve(undefined) }
        },
    }

    const mockDb = {
        select: () => selectChain,
        update: (table: unknown) => {
            mockUpdate(table)
            return updateChain
        },
        delete: () => {
            mockDelete()
            return { where: () => Promise.resolve(undefined) }
        },
        insert: () => ({ values: () => Promise.resolve(undefined) }),
    }

    return { mockDb, selectQueue, mockSet, mockDelete, mockUpdate }
})

const { mockResolveTierPricing } = vi.hoisted(() => ({ mockResolveTierPricing: vi.fn() }))

vi.mock('$lib/server/db', () => ({ db: mockDb }))
vi.mock('$lib/server/db/schema', () => ({
    partyMembers: { id: 'id', registrationId: 'registration_id' },
    registrations: { id: 'id', status: 'status' },
}))
vi.mock('$lib/server/debug', () => ({ dbg: { register: vi.fn() } }))
vi.mock('$lib/server/tiers', () => ({ resolveTierPricing: mockResolveTierPricing }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), count: vi.fn() }))

const { updateAdminMemberDetails } = await import('./updateAdminMemberDetails')
const { removeAdminMember } = await import('./removeAdminMember')

const ADULT_NET = 16000
const CHILD_NET = 10000

function memberRow(overrides: Record<string, unknown> = {}) {
    return {
        id: 'member-1',
        name: 'Marcus Patterson',
        tierLabel: 'Adult',
        priceCents: ADULT_NET,
        registrationId: 'reg-1',
        registrationStatus: 'pending',
        eventId: 'evt-1',
        ...overrides,
    }
}

beforeEach(() => {
    vi.clearAllMocks()
    selectQueue.length = 0
    mockResolveTierPricing.mockResolvedValue({
        'tier-adult': { label: 'Adult', priceCents: ADULT_NET, shirtSizeCategory: 'adult' },
        'tier-child': { label: 'Child', priceCents: CHILD_NET, shirtSizeCategory: 'child' },
    })
})

describe('updateAdminMemberDetails', () => {
    it('corrects a birth date without touching the price', async () => {
        selectQueue.push([memberRow()])

        const result = await updateAdminMemberDetails({
            memberId: 'member-1',
            birthDate: '1990-05-05',
        })

        expect(result).toMatchObject({ changed: true })
        const [written] = mockSet.mock.calls[0]
        expect(written).toMatchObject({ birthYear: 1990, birthMonth: 5, birthDay: 5 })
        expect(written).not.toHaveProperty('priceCents')
    })

    /* Only fields the caller passed may be written. The edit form renders no shirt select when the
       event has shirts disabled, so a blanket write would silently null a saved size. */
    it('leaves fields the caller did not pass alone', async () => {
        selectQueue.push([memberRow({ name: 'Marcus Patterson' })])

        await updateAdminMemberDetails({ memberId: 'member-1', name: 'Marcus Patterson Jr' })

        const [written] = mockSet.mock.calls[0]
        expect(written).toEqual({ name: 'Marcus Patterson Jr' })
        expect(written).not.toHaveProperty('shirtSize')
        expect(written).not.toHaveProperty('vegetarianMeal')
    })

    it('writes nothing when no field was passed', async () => {
        selectQueue.push([memberRow()])

        const result = await updateAdminMemberDetails({ memberId: 'member-1' })

        expect(result).toMatchObject({ changed: false })
        expect(mockSet).not.toHaveBeenCalled()
    })

    /* The money guardrail. The tier sets priceCents, so moving it after payment leaves the recorded
       total disagreeing with what Stripe actually took, with no refund issued and nobody told. */
    it('REFUSES a repricing tier change on a paid registration', async () => {
        selectQueue.push([memberRow({ registrationStatus: 'paid' })])

        await expect(
            updateAdminMemberDetails({ memberId: 'member-1', tierId: 'tier-child' }),
        ).rejects.toThrow()

        expect(mockSet).not.toHaveBeenCalled()
    })

    /* The edit form resubmits every field on save, including an unchanged tier. That must not read
       as an attempt to reprice, or a paid registration could never have a typo fixed. */
    it('allows the SAME tier to be resubmitted on a paid registration', async () => {
        selectQueue.push([memberRow({ registrationStatus: 'paid' })])

        const result = await updateAdminMemberDetails({
            memberId: 'member-1',
            tierId: 'tier-adult',
            name: 'Marcus P',
        })

        expect(result).toMatchObject({ changed: true })
    })

    it('allows a tier change while payment is still outstanding', async () => {
        selectQueue.push([memberRow({ registrationStatus: 'pending' })])

        await updateAdminMemberDetails({ memberId: 'member-1', tierId: 'tier-child' })

        expect(mockSet).toHaveBeenCalledWith(
            expect.objectContaining({ tierLabel: 'Child', priceCents: CHILD_NET }),
        )
    })

    it('snapshots the NET tier price, never a Stripe gross-up', async () => {
        selectQueue.push([memberRow({ registrationStatus: 'pending' })])

        await updateAdminMemberDetails({ memberId: 'member-1', tierId: 'tier-child' })

        const [written] = mockSet.mock.calls[0]
        expect(written.priceCents).toBe(CHILD_NET)
    })

    it('refuses to touch a cancelled registration', async () => {
        selectQueue.push([memberRow({ registrationStatus: 'refunded' })])

        await expect(
            updateAdminMemberDetails({ memberId: 'member-1', name: 'Anything' }),
        ).rejects.toThrow()
        expect(mockSet).not.toHaveBeenCalled()
    })

    it('404s on an unknown member', async () => {
        selectQueue.push([])
        await expect(updateAdminMemberDetails({ memberId: 'nope', name: 'X' })).rejects.toThrow()
    })
})

describe('removeAdminMember', () => {
    it('removes an uncharged member from a party of more than one', async () => {
        selectQueue.push([memberRow()])
        selectQueue.push([{ total: 3 }])

        const result = await removeAdminMember({ memberId: 'member-1' })

        expect(result).toMatchObject({ removed: true, name: 'Marcus Patterson' })
        expect(mockDelete).toHaveBeenCalled()
    })

    /* removeMember refunds before deleting, keyed so retries cannot double-refund. Deleting here
       without that keeps the money and drops the attendee.

       The party-size row is queued deliberately: without it, removing the guard makes the count
       destructure throw and this test would pass on a crash instead of on the refusal. */
    it('REFUSES to remove from a paid registration', async () => {
        selectQueue.push([memberRow({ registrationStatus: 'paid' })])
        selectQueue.push([{ total: 3 }])

        await expect(removeAdminMember({ memberId: 'member-1' })).rejects.toThrow()

        expect(mockDelete).not.toHaveBeenCalled()
    })

    /* An empty registration is a row nothing can act on, and it vanishes from every member-joined
       report while still counting as a registration. */
    it('REFUSES to remove the last member', async () => {
        selectQueue.push([memberRow()])
        selectQueue.push([{ total: 1 }])

        await expect(removeAdminMember({ memberId: 'member-1' })).rejects.toThrow()

        expect(mockDelete).not.toHaveBeenCalled()
    })

    it('refuses to touch a cancelled registration', async () => {
        selectQueue.push([memberRow({ registrationStatus: 'refunded' })])
        selectQueue.push([{ total: 3 }])

        await expect(removeAdminMember({ memberId: 'member-1' })).rejects.toThrow()
        expect(mockDelete).not.toHaveBeenCalled()
    })

    it('404s on an unknown member', async () => {
        selectQueue.push([])
        await expect(removeAdminMember({ memberId: 'nope' })).rejects.toThrow()
        expect(mockDelete).not.toHaveBeenCalled()
    })
})
