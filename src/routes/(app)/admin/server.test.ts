import { describe, it, expect, vi, beforeEach } from 'vitest'

/* The create-a-year action, which moved here from /admin/setup/events when the Setup area was deleted
   (ADR 0006).

   Two things worth pinning. The guard, because this action creates rows and lives on a page that any
   admin can load — a layout load runs AFTER a form action, so nothing but the in-action requireOwner
   protects it. And the year parsing, because Number('') is 0 and Number('20x7') is NaN, so a form that
   only checks truthiness will happily insert a reunion in year zero. */

const { mockDb, insertedValues, returningQueue } = vi.hoisted(() => {
    const insertedValues: unknown[] = []
    const returningQueue: unknown[][] = []
    const insertChain = {
        values: (values: unknown) => {
            insertedValues.push(values)
            return insertChain
        },
        returning: () => Promise.resolve(returningQueue.shift() ?? [{ id: 'evt-new' }]),
        /* The tiers insert is awaited without .returning(). */
        then: (onFulfilled: (value: unknown) => unknown) =>
            Promise.resolve(undefined).then(onFulfilled),
    }
    return { mockDb: { insert: () => insertChain }, insertedValues, returningQueue }
})

const { mockRequireAdmin, mockRequireOwner, mockIsOwner, mockSummaries } = vi.hoisted(() => ({
    mockRequireAdmin: vi.fn(),
    mockRequireOwner: vi.fn(),
    mockIsOwner: vi.fn(),
    mockSummaries: vi.fn(),
}))

vi.mock('$lib/server/db', () => ({ db: mockDb }))
vi.mock('$env/dynamic/private', () => ({ env: { OWNER_EMAIL: 'kim@example.com' } }))
vi.mock('$lib/server/db/schema', () => ({ reunionEvents: {}, tiers: {} }))
vi.mock('$lib/server/auth/guards', () => ({
    requireAdmin: mockRequireAdmin,
    requireOwner: mockRequireOwner,
}))
vi.mock('$lib/server/auth/isOwner', () => ({ isOwner: mockIsOwner }))
vi.mock('$lib/server/registrations', () => ({ getEventSummaries: mockSummaries }))

const { actions, load } = await import('./+page.server')

/* Cast for the same reason the registrations action test casts: a RequestEvent has fourteen properties
   and the action reads two of them. Matching the shape of what is actually used is the honest fixture;
   constructing a whole RequestEvent would be inventing thirteen values the code never touches. */
function requestWith(fields: Record<string, string>) {
    const body = new FormData()
    for (const [key, value] of Object.entries(fields)) {
        body.set(key, value)
    }
    return {
        request: new Request('http://localhost/admin', { method: 'POST', body }),
        url: new URL('http://localhost/admin'),
        locals: { user: { id: 'u1', name: 'Kim', email: 'kim@example.com', role: 'admin' } },
    } as unknown as Parameters<typeof actions.create_event>[0]
}

/* SvelteKit's fail() throws nothing — it returns a shape with a status. */
function isFailure(result: unknown): result is { status: number; data: { createError: string } } {
    return typeof result === 'object' && result !== null && 'status' in result
}

describe('/admin create_event', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        insertedValues.length = 0
        returningQueue.length = 0
        mockRequireOwner.mockReturnValue({ id: 'u1', name: 'Kim' })
        mockRequireAdmin.mockReturnValue({ id: 'u1', name: 'Kim', email: 'kim@example.com' })
        mockSummaries.mockResolvedValue([])
    })

    /* The whole protection. A layout load cannot cover an action, and /admin is loadable by any admin. */
    it('requires the owner, not merely an admin', async () => {
        mockRequireOwner.mockImplementation(() => {
            throw new Error('denied')
        })

        await expect(
            actions.create_event(requestWith({ title: 'Reunion', year: '2028' })),
        ).rejects.toThrow()

        expect(insertedValues).toHaveLength(0)
    })

    it('creates the year as a draft', async () => {
        returningQueue.push([{ id: 'evt-new' }])

        await actions.create_event(requestWith({ title: 'Patterson Family Reunion', year: '2028' }))

        expect(insertedValues[0]).toMatchObject({
            title: 'Patterson Family Reunion',
            year: 2028,
            status: 'draft',
        })
    })

    /* A year with no tiers cannot accept a registration at all, and nothing would say that was why. */
    it('creates starter Adult and Child tiers', async () => {
        returningQueue.push([{ id: 'evt-new' }])

        await actions.create_event(requestWith({ title: 'Reunion', year: '2028' }))

        expect(insertedValues[1]).toEqual([
            { eventId: 'evt-new', label: 'Adult', priceCents: 0 },
            { eventId: 'evt-new', label: 'Child', priceCents: 0 },
        ])
    })

    it('returns the new id so the page can go to its settings', async () => {
        returningQueue.push([{ id: 'evt-new' }])

        const result = await actions.create_event(requestWith({ title: 'Reunion', year: '2028' }))

        expect(result).toMatchObject({ createdEventId: 'evt-new' })
    })

    it('trims the title', async () => {
        returningQueue.push([{ id: 'evt-new' }])

        await actions.create_event(requestWith({ title: '  Reunion  ', year: '2028' }))

        expect(insertedValues[0]).toMatchObject({ title: 'Reunion' })
    })

    it.each([
        ['a missing title', { title: '', year: '2028' }],
        ['a whitespace title', { title: '   ', year: '2028' }],
        /* Number('') is 0, which a truthiness check passes straight into the insert. */
        ['a missing year', { title: 'Reunion', year: '' }],
        ['a non-numeric year', { title: 'Reunion', year: '20x8' }],
        ['a year before 1900', { title: 'Reunion', year: '207' }],
        ['a year far in the future', { title: 'Reunion', year: '20228' }],
        ['a fractional year', { title: 'Reunion', year: '2028.5' }],
    ])('rejects %s without inserting', async (_label, fields) => {
        const result = await actions.create_event(requestWith(fields))

        expect(isFailure(result)).toBe(true)
        expect(insertedValues).toHaveLength(0)
    })

    /* A reunion recorded retrospectively is legitimate, so the lower bound has to be generous. */
    it('accepts a past year', async () => {
        returningQueue.push([{ id: 'evt-old' }])

        const result = await actions.create_event(requestWith({ title: 'Reunion', year: '1998' }))

        expect(isFailure(result)).toBe(false)
        expect(insertedValues[0]).toMatchObject({ year: 1998 })
    })
})

describe('/admin load', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockRequireAdmin.mockReturnValue({ id: 'u1', name: 'Kim', email: 'kim@example.com' })
        mockSummaries.mockResolvedValue([])
    })

    /* Any admin may see the list; only the owner is offered the create form. Hiding is not the
       protection — the action guards itself — but the flag has to be right or the control is missing
       for the one person who can use it. */
    /* SvelteKit types a load's return as possibly void, so the assertions read through a narrowed
       local rather than casting the result. */
    async function loadResult() {
        const result = await load(requestWith({}) as unknown as Parameters<typeof load>[0])
        if (!result) {
            throw new Error('load returned nothing')
        }
        return result
    }

    it('reports whether the viewer is the owner', async () => {
        mockIsOwner.mockReturnValue(true)

        const result = await loadResult()

        expect(mockRequireAdmin).toHaveBeenCalled()
        expect(result.isOwner).toBe(true)
    })

    it('loads the list for a non-owner admin too', async () => {
        mockIsOwner.mockReturnValue(false)

        const result = await loadResult()

        expect(result.isOwner).toBe(false)
        expect(result.events).toEqual([])
    })
})
