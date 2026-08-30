import { describe, it, expect, vi, beforeEach } from 'vitest'

/* The create-a-year action. It lived on /admin as ?/create_event, inside a panel that expanded above the
   year cards; it is now the default action of a page of its own.

   Three things worth pinning. The guard, because this action creates rows and /admin/event/new is under
   an area any admin can reach — a layout load runs AFTER a form action, so nothing but the in-action
   requireOwner protects it. The year parsing, because Number('') is 0 and Number('20x7') is NaN, so a
   form that only checks truthiness will happily insert a reunion in year zero. And the redirect, which
   replaced a { createdEventId } flag plus an $effect calling goto() — if it silently became a plain
   return again, creating a year would leave the owner on an empty form with no sign anything happened. */

const { mockDb, insertedValues, returningQueue, selectQueue } = vi.hoisted(() => {
    const insertedValues: unknown[] = []
    const returningQueue: unknown[][] = []
    const selectQueue: unknown[][] = []
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
    const selectChain = {
        from: () => selectChain,
        orderBy: () => selectChain,
        limit: () => Promise.resolve(selectQueue.shift() ?? []),
    }
    return {
        mockDb: { insert: () => insertChain, select: () => selectChain },
        insertedValues,
        returningQueue,
        selectQueue,
    }
})

const { mockRequireOwner } = vi.hoisted(() => ({ mockRequireOwner: vi.fn() }))

vi.mock('$lib/server/db', () => ({ db: mockDb }))
vi.mock('$lib/server/db/schema', () => ({ reunionEvents: {}, tiers: {} }))
vi.mock('drizzle-orm', () => ({ desc: vi.fn() }))
vi.mock('$lib/server/auth/guards', () => ({ requireOwner: mockRequireOwner }))
vi.mock('$lib/server/debug', () => ({ dbg: { admin: vi.fn() } }))

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
        request: new Request('http://localhost/admin/event/new', { method: 'POST', body }),
        url: new URL('http://localhost/admin/event/new'),
        locals: { user: { id: 'u1', name: 'Kim', email: 'kim@example.com', role: 'admin' } },
    } as unknown as Parameters<typeof actions.default>[0]
}

/* SvelteKit's fail() throws nothing — it returns a shape with a status. */
function isFailure(result: unknown): result is { status: number; data: { createError: string } } {
    return typeof result === 'object' && result !== null && 'status' in result
}

/* redirect() throws, so success comes back as a rejection rather than a return value. */
async function createAndCatch(fields: Record<string, string>) {
    try {
        return { thrown: undefined, returned: await actions.default(requestWith(fields)) }
    } catch (thrown) {
        return { thrown, returned: undefined }
    }
}

beforeEach(() => {
    vi.clearAllMocks()
    insertedValues.length = 0
    returningQueue.length = 0
    selectQueue.length = 0
    mockRequireOwner.mockReturnValue({ id: 'u1', name: 'Kim' })
})

describe('/admin/event/new create', () => {
    /* The whole protection. A layout load cannot cover an action, and the admin area is loadable by any
       admin. */
    it('requires the owner, not merely an admin', async () => {
        mockRequireOwner.mockImplementation(() => {
            throw new Error('denied')
        })

        await expect(
            actions.default(requestWith({ title: 'Reunion', year: '2028' })),
        ).rejects.toThrow('denied')

        expect(insertedValues).toHaveLength(0)
    })

    it('creates the year as a draft', async () => {
        returningQueue.push([{ id: 'evt-new' }])

        await createAndCatch({ title: 'Patterson Family Reunion', year: '2028' })

        expect(insertedValues[0]).toMatchObject({
            title: 'Patterson Family Reunion',
            year: 2028,
            status: 'draft',
        })
    })

    /* A year with no tiers cannot accept a registration at all, and nothing would say that was why. */
    it('creates starter Adult and Child tiers', async () => {
        returningQueue.push([{ id: 'evt-new' }])

        await createAndCatch({ title: 'Reunion', year: '2028' })

        expect(insertedValues[1]).toEqual([
            { eventId: 'evt-new', label: 'Adult', priceCents: 0 },
            { eventId: 'evt-new', label: 'Child', priceCents: 0 },
        ])
    })

    /* A draft with $0 tiers cannot take a registration, so landing back on the year list would leave
       the next step unstated. */
    it('redirects to the new event settings page', async () => {
        returningQueue.push([{ id: 'evt-new' }])

        const { thrown } = await createAndCatch({ title: 'Reunion', year: '2028' })

        expect(thrown).toMatchObject({
            status: 303,
            location: '/admin/event/evt-new/settings',
        })
    })

    it('trims the title', async () => {
        returningQueue.push([{ id: 'evt-new' }])

        await createAndCatch({ title: '  Reunion  ', year: '2028' })

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
        const result = await actions.default(requestWith(fields))

        expect(isFailure(result)).toBe(true)
        expect(insertedValues).toHaveLength(0)
    })

    /* A rejected year must not also cost the owner the title they typed. */
    it('hands back what was typed when it refuses', async () => {
        const result = await actions.default(requestWith({ title: 'Reunion', year: '20x8' }))

        expect(isFailure(result) && result.data).toMatchObject({
            title: 'Reunion',
            year: '20x8',
        })
    })

    /* A reunion recorded retrospectively is legitimate, so the lower bound has to be generous. */
    it('accepts a past year', async () => {
        returningQueue.push([{ id: 'evt-old' }])

        const { thrown } = await createAndCatch({ title: 'Reunion', year: '1998' })

        expect(thrown).toMatchObject({ status: 303 })
        expect(insertedValues[0]).toMatchObject({ year: 1998 })
    })
})

describe('/admin/event/new load', () => {
    async function loadResult() {
        const result = await load(requestWith({}) as unknown as Parameters<typeof load>[0])
        if (!result) {
            throw new Error('load returned nothing')
        }
        return result
    }

    it('turns away anyone who is not the owner', async () => {
        mockRequireOwner.mockImplementation(() => {
            throw new Error('denied')
        })

        await expect(loadResult()).rejects.toThrow('denied')
    })

    /* The title is the same string every reunion and the year is almost always the next one, so the
       form arrives filled in rather than asking the owner to retype the row above. */
    it('suggests the newest title and the year after it', async () => {
        selectQueue.push([{ title: 'Patterson Family Reunion', year: 2027 }])

        const result = await loadResult()

        expect(result).toEqual({
            suggestedTitle: 'Patterson Family Reunion',
            suggestedYear: 2028,
        })
    })

    /* First reunion ever: there is no row to copy, so the year falls back to the current one rather
       than to NaN. */
    it('falls back to the current year when there are no events', async () => {
        const result = await loadResult()

        expect(result.suggestedTitle).toBe('')
        expect(result.suggestedYear).toBe(new Date().getFullYear() + 1)
    })
})
