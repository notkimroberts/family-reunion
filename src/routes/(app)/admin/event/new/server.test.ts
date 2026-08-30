import { eq } from 'drizzle-orm'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reunionEvents, tiers } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedEvent } from '$lib/server/testing/seedEvent'

/* The create-a-year action. It lived on /admin as ?/create_event, inside a panel that expanded above
   the year cards; it is now the default action of a page of its own.

   Three things worth pinning. The guard, because this action creates rows and /admin/event/new is
   under an area any admin can reach — a layout load runs AFTER a form action, so nothing but the
   in-action requireOwner protects it. The year parsing, because Number('') is 0 and Number('20x7') is
   NaN, so a form that only checks truthiness will happily insert a reunion in year zero. And the
   redirect, which replaced a { createdEventId } flag plus an $effect calling goto() — if it silently
   became a plain return again, creating a year would leave the owner on an empty form with no sign
   anything happened.

   Against a real database, "did not insert" is the table still being empty rather than a fake going
   uncalled — and the new year's starter tiers can be read back the way the settings page will read
   them. */

const mockRequireOwner = vi.fn()
vi.mock('$lib/server/auth/guards', () => ({
    requireOwner: mockRequireOwner,
    requireAdmin: vi.fn(),
    requireAuth: vi.fn(),
    isPublicPath: vi.fn(),
}))

const { actions, load } = await import('./+page.server')

let db: Awaited<ReturnType<typeof resetTestDb>>

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

async function events() {
    return db.select().from(reunionEvents)
}

beforeEach(async () => {
    vi.clearAllMocks()
    mockRequireOwner.mockReturnValue({ id: 'u1', name: 'Kim' })
    db = await resetTestDb()
})

describe('/admin/event/new create', () => {
    /* The whole protection. A layout load cannot cover an action, and the admin area is loadable by
       any admin. */
    it('requires the owner, not merely an admin', async () => {
        mockRequireOwner.mockImplementation(() => {
            throw new Error('denied')
        })

        await expect(
            actions.default(requestWith({ title: 'Reunion', year: '2028' })),
        ).rejects.toThrow('denied')

        expect(await events()).toHaveLength(0)
    })

    /* Draft, not open — the year has $0 tiers and cannot take a registration yet. It is also what
       keeps `one_open_event` satisfiable while a second year is being prepared. */
    it('creates the year as a draft', async () => {
        await createAndCatch({ title: 'Patterson Family Reunion', year: '2028' })

        expect(await events()).toMatchObject([
            { title: 'Patterson Family Reunion', year: 2028, status: 'draft' },
        ])
    })

    /* A year with no tiers cannot accept a registration at all, and nothing would say that was why. */
    it('creates starter Adult and Child tiers', async () => {
        await createAndCatch({ title: 'Reunion', year: '2028' })

        const [created] = await events()
        const starter = await db.select().from(tiers).where(eq(tiers.eventId, created.id))
        expect(starter).toMatchObject([
            { label: 'Adult', priceCents: 0 },
            { label: 'Child', priceCents: 0 },
        ])
    })

    /* A draft with $0 tiers cannot take a registration, so landing back on the year list would leave
       the next step unstated. */
    it('redirects to the new event settings page', async () => {
        const { thrown } = await createAndCatch({ title: 'Reunion', year: '2028' })

        const [created] = await events()
        expect(thrown).toMatchObject({
            status: 303,
            location: `/admin/event/${created.id}/settings`,
        })
    })

    it('trims the title', async () => {
        await createAndCatch({ title: '  Reunion  ', year: '2028' })

        expect((await events())[0].title).toBe('Reunion')
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
        expect(await events()).toHaveLength(0)
        expect(await db.select().from(tiers)).toHaveLength(0)
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
        const { thrown } = await createAndCatch({ title: 'Reunion', year: '1998' })

        expect(thrown).toMatchObject({ status: 303 })
        expect((await events())[0].year).toBe(1998)
    })

    /* Creating a second year while one is already open must work — that is the normal case every
       year — which it does because the new one is a draft. */
    it('creates a year alongside an already-open one', async () => {
        await seedEvent(db, { year: 2027 })

        const { thrown } = await createAndCatch({ title: 'Reunion', year: '2028' })

        expect(thrown).toMatchObject({ status: 303 })
        expect(await events()).toHaveLength(2)
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
        await seedEvent(db, { year: 2025, title: 'Old Reunion', status: 'archived' })
        await seedEvent(db, { year: 2027, title: 'Patterson Family Reunion' })

        expect(await loadResult()).toEqual({
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
