import { describe, it, expect, vi, beforeEach } from 'vitest'

/* The settings page writes the event in three separate actions, and this file exists to keep them
   separate.

   THE FAILURE THIS GUARDS. Dates and program content were one ?/update_event doing a single db.update
   with startDate, endDate AND metadata in the same .set(). That was safe only because they shared one
   card and one Save. The moment they became two cards, the same action would have blanked whatever the
   POST omitted: saving the dates would have wiped the whole program page, because an absent metadata
   field parses to {}. Splitting the CARD therefore required splitting the ACTION, and the assertions
   below are on the .set() payloads — a regression here is a silent data loss, not a broken page.

   drizzle builds .set() before .where(), so recording the payload is enough; the where clause only
   decides which row it lands on. */

const { mockDb, setPayloads } = vi.hoisted(() => {
    const setPayloads: Record<string, unknown>[] = []
    const updateChain = {
        set: (values: Record<string, unknown>) => {
            setPayloads.push(values)
            return updateChain
        },
        where: () => Promise.resolve(undefined),
    }
    return { mockDb: { update: () => updateChain }, setPayloads }
})

const { mockRequireOwner } = vi.hoisted(() => ({ mockRequireOwner: vi.fn() }))

vi.mock('$lib/server/db', () => ({ db: mockDb }))
vi.mock('$lib/server/db/schema', () => ({
    reunionEvents: {},
    eventStatusEnum: { enumValues: ['draft', 'open', 'closed', 'archived'] },
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('$lib/server/auth/guards', () => ({ requireOwner: mockRequireOwner }))
vi.mock('$lib/server/debug', () => ({ dbg: { admin: vi.fn() } }))
vi.mock('$lib/server/tiers', () => ({
    createTier: vi.fn(),
    deleteTier: vi.fn(),
    getTiersForEvent: vi.fn(),
    updateTier: vi.fn(),
}))

const { actions } = await import('./+page.server')

function requestWith(fields: Record<string, string>) {
    const body = new FormData()
    for (const [key, value] of Object.entries(fields)) {
        body.set(key, value)
    }
    return {
        request: new Request('http://localhost/admin/event/evt-1/settings', {
            method: 'POST',
            body,
        }),
        url: new URL('http://localhost/admin/event/evt-1/settings'),
        params: { eventId: 'evt-1' },
        locals: { user: { id: 'u1', email: 'kim@example.com', role: 'admin' } },
    } as unknown as Parameters<typeof actions.update_dates>[0]
}

function isFailure(result: unknown): result is { status: number; data: { error: string } } {
    return typeof result === 'object' && result !== null && 'status' in result
}

/* The program action's fail() carries the rejected text alongside the message; the dates action's does
   not, so the two share no data shape and the union has to be narrowed separately. */
function rejectedMetadata(result: unknown): unknown {
    return isFailure(result) ? (result.data as { metadata?: unknown }).metadata : undefined
}

beforeEach(() => {
    vi.clearAllMocks()
    setPayloads.length = 0
    mockRequireOwner.mockReturnValue({ id: 'u1' })
})

describe('settings ?/update_dates', () => {
    it('requires the owner', async () => {
        mockRequireOwner.mockImplementation(() => {
            throw new Error('denied')
        })

        await expect(
            actions.update_dates(requestWith({ startDate: '2027-07-23T16:00' })),
        ).rejects.toThrow('denied')
        expect(setPayloads).toHaveLength(0)
    })

    /* The point of the split. If `metadata` ever appears in this payload again, saving a date silently
       replaces the program page with {}. */
    it('never writes metadata', async () => {
        await actions.update_dates(
            requestWith({ startDate: '2027-07-23T16:00', endDate: '2027-07-25T12:00' }),
        )

        expect(setPayloads).toHaveLength(1)
        expect(setPayloads[0]).not.toHaveProperty('metadata')
        expect(setPayloads[0]).toMatchObject({
            startDate: new Date('2027-07-23T16:00'),
            endDate: new Date('2027-07-25T12:00'),
        })
    })

    /* "A field left blank is cleared" is the documented contract, and both dates are nullable. */
    it('clears a date left blank', async () => {
        await actions.update_dates(requestWith({ startDate: '', endDate: '' }))

        expect(setPayloads[0]).toMatchObject({ startDate: null, endDate: null })
    })

    /* The version this replaced treated an unparseable value as null and wrote it, so a typo in Start
       deleted the start date and reported success — and the home page countdown reads that column. */
    it('refuses an unreadable date instead of clearing it', async () => {
        const result = await actions.update_dates(requestWith({ startDate: 'next tuesday' }))

        expect(isFailure(result)).toBe(true)
        expect(setPayloads).toHaveLength(0)
    })

    /* formatDateRange calls Intl's formatRange, which throws a RangeError when the end precedes the
       start — that would take out the whole /admin year list, not just this event. */
    it('refuses an end before the start', async () => {
        const result = await actions.update_dates(
            requestWith({ startDate: '2027-07-25T12:00', endDate: '2027-07-23T16:00' }),
        )

        expect(isFailure(result)).toBe(true)
        expect(setPayloads).toHaveLength(0)
    })

    it('allows a start and end on the same instant', async () => {
        await actions.update_dates(
            requestWith({ startDate: '2027-07-23T16:00', endDate: '2027-07-23T16:00' }),
        )

        expect(setPayloads).toHaveLength(1)
    })
})

describe('settings ?/update_program', () => {
    it('requires the owner', async () => {
        mockRequireOwner.mockImplementation(() => {
            throw new Error('denied')
        })

        await expect(actions.update_program(requestWith({ metadata: '{}' }))).rejects.toThrow(
            'denied',
        )
        expect(setPayloads).toHaveLength(0)
    })

    /* The other half of the split: a program save must not null the dates it does not carry. */
    it('never writes the dates', async () => {
        await actions.update_program(requestWith({ metadata: '{"menu":["Ribs"]}' }))

        expect(setPayloads).toHaveLength(1)
        expect(setPayloads[0]).not.toHaveProperty('startDate')
        expect(setPayloads[0]).not.toHaveProperty('endDate')
        expect(setPayloads[0]).toMatchObject({ metadata: { menu: ['Ribs'] } })
    })

    /* Fails loudly, writes nothing, and hands the rejected text back — the parser it replaced caught
       JSON.parse and stored null, so a bad paste blanked /program on a save that reported success. */
    it('writes nothing and returns the rejected text on bad JSON', async () => {
        const result = await actions.update_program(requestWith({ metadata: '{ menu: [' }))

        expect(isFailure(result)).toBe(true)
        expect(rejectedMetadata(result)).toBe('{ menu: [')
        expect(setPayloads).toHaveLength(0)
    })

    /* .strict(), so a typo'd key is named rather than silently dropped. */
    it('refuses a key that is not in the schema', async () => {
        const result = await actions.update_program(requestWith({ metadata: '{"menus":[]}' }))

        expect(isFailure(result)).toBe(true)
        expect(setPayloads).toHaveLength(0)
    })

    /* Blank is an event with no program content yet, which is every event in draft. */
    it('stores an empty object for blank input', async () => {
        await actions.update_program(requestWith({ metadata: '   ' }))

        expect(setPayloads[0]).toMatchObject({ metadata: {} })
    })
})

describe('settings ?/update_lock_date', () => {
    it('requires the owner', async () => {
        mockRequireOwner.mockImplementation(() => {
            throw new Error('denied')
        })

        await expect(
            actions.update_lock_date(requestWith({ registrationLockDate: '2027-07-01T00:00' })),
        ).rejects.toThrow('denied')
        expect(setPayloads).toHaveLength(0)
    })

    it('clears the lock when left blank', async () => {
        await actions.update_lock_date(requestWith({ registrationLockDate: '' }))

        expect(setPayloads[0]).toMatchObject({ registrationLockDate: null })
    })

    it('writes only the lock date', async () => {
        await actions.update_lock_date(requestWith({ registrationLockDate: '2027-07-01T09:00' }))

        expect(setPayloads[0]).not.toHaveProperty('metadata')
        expect(setPayloads[0]).not.toHaveProperty('startDate')
        expect(setPayloads[0]).toMatchObject({
            registrationLockDate: new Date('2027-07-01T09:00'),
        })
    })
})
