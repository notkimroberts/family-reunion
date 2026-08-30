import { eq } from 'drizzle-orm'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reunionEvents } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedEvent } from '$lib/server/testing/seedEvent'

/* The settings page writes the event in four separate actions, and this file exists to keep them
   separate.

   THE FAILURE THIS GUARDS. Dates and program content were one ?/update_event doing a single db.update
   with startDate, endDate AND metadata in the same .set(). That was safe only because they shared one
   card and one Save. The moment they became two cards, the same action would have blanked whatever
   the POST omitted: saving the dates would have wiped the whole program page, because an absent
   metadata field parses to {}. Splitting the CARD therefore required splitting the ACTION.

   The version this replaced asserted on the recorded `.set()` payloads, which is one step removed
   from the harm. Against a real database the harm itself is the assertion: save the dates, then read
   the program back and find it intact. A regression here is silent data loss, not a broken page. */

const mockRequireOwner = vi.fn()
vi.mock('$lib/server/auth/guards', () => ({
    requireOwner: mockRequireOwner,
    requireAdmin: vi.fn(),
    requireAuth: vi.fn(),
    isPublicPath: vi.fn(),
}))

const { actions } = await import('./+page.server')

const PROGRAM = { menu: ['Ribs', 'Slaw'], venue: { name: 'Oak Park Lodge' } }

let db: Awaited<ReturnType<typeof resetTestDb>>
let eventId: string

function requestWith(fields: Record<string, string>) {
    const body = new FormData()
    for (const [key, value] of Object.entries(fields)) {
        body.set(key, value)
    }
    return {
        request: new Request('http://localhost/admin/event/x/settings', { method: 'POST', body }),
        url: new URL('http://localhost/admin/event/x/settings'),
        params: { eventId },
        locals: { user: { id: 'u1', email: 'kim@example.com', role: 'admin' } },
    } as unknown as Parameters<typeof actions.update_dates>[0]
}

function isFailure(result: unknown): result is { status: number; data: { error: string } } {
    return typeof result === 'object' && result !== null && 'status' in result
}

function rejectedMetadata(result: unknown): unknown {
    return isFailure(result) ? (result.data as { metadata?: unknown }).metadata : undefined
}

async function eventRow() {
    const [row] = await db.select().from(reunionEvents).where(eq(reunionEvents.id, eventId))
    return row
}

beforeEach(async () => {
    vi.clearAllMocks()
    mockRequireOwner.mockReturnValue(undefined)
    db = await resetTestDb()
    eventId = await seedEvent(db)
    /* Every test starts from a year that already has dates, a program and a lock — so any action
       that writes a column it does not own destroys something visible. */
    await db
        .update(reunionEvents)
        .set({
            startDate: new Date('2027-07-23T16:00'),
            endDate: new Date('2027-07-25T12:00'),
            registrationLockDate: new Date('2027-07-01T09:00'),
            metadata: PROGRAM,
        })
        .where(eq(reunionEvents.id, eventId))
})

describe('settings ?/update_dates', () => {
    it('requires the owner', async () => {
        mockRequireOwner.mockImplementation(() => {
            throw new Error('denied')
        })

        await expect(
            actions.update_dates(requestWith({ startDate: '2027-08-01T16:00' })),
        ).rejects.toThrow('denied')

        expect((await eventRow()).startDate).toEqual(new Date('2027-07-23T16:00'))
    })

    /* The point of the split. If metadata ever rejoins this write, saving a date silently replaces
       the program page with {}. */
    it('leaves the program untouched', async () => {
        await actions.update_dates(
            requestWith({ startDate: '2027-08-01T16:00', endDate: '2027-08-03T12:00' }),
        )

        const row = await eventRow()
        expect(row.metadata).toEqual(PROGRAM)
        expect(row.startDate).toEqual(new Date('2027-08-01T16:00'))
        expect(row.endDate).toEqual(new Date('2027-08-03T12:00'))
    })

    it('leaves the lock date untouched', async () => {
        await actions.update_dates(requestWith({ startDate: '2027-08-01T16:00' }))

        expect((await eventRow()).registrationLockDate).toEqual(new Date('2027-07-01T09:00'))
    })

    /* "A field left blank is cleared" is the documented contract, and both dates are nullable. */
    it('clears a date left blank', async () => {
        await actions.update_dates(requestWith({ startDate: '', endDate: '' }))

        expect(await eventRow()).toMatchObject({ startDate: null, endDate: null })
    })

    /* The version this replaced treated an unparseable value as null and wrote it, so a typo in Start
       deleted the start date and reported success — and the home page countdown reads that column. */
    it('refuses an unreadable date instead of clearing it', async () => {
        const result = await actions.update_dates(requestWith({ startDate: 'next tuesday' }))

        expect(isFailure(result)).toBe(true)
        expect((await eventRow()).startDate).toEqual(new Date('2027-07-23T16:00'))
    })

    /* formatDateRange calls Intl's formatRange, which throws a RangeError when the end precedes the
       start — that would take out the whole /admin year list, not just this event. */
    it('refuses an end before the start', async () => {
        const result = await actions.update_dates(
            requestWith({ startDate: '2027-07-25T12:00', endDate: '2027-07-23T16:00' }),
        )

        expect(isFailure(result)).toBe(true)
        expect((await eventRow()).endDate).toEqual(new Date('2027-07-25T12:00'))
    })

    it('allows a start and end on the same instant', async () => {
        await actions.update_dates(
            requestWith({ startDate: '2027-07-23T16:00', endDate: '2027-07-23T16:00' }),
        )

        expect(await eventRow()).toMatchObject({
            startDate: new Date('2027-07-23T16:00'),
            endDate: new Date('2027-07-23T16:00'),
        })
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

        expect((await eventRow()).metadata).toEqual(PROGRAM)
    })

    /* The other half of the split: a program save must not null the dates it does not carry. */
    it('leaves the dates and the lock untouched', async () => {
        await actions.update_program(requestWith({ metadata: '{"menu":["Ribs"]}' }))

        expect(await eventRow()).toMatchObject({
            metadata: { menu: ['Ribs'] },
            startDate: new Date('2027-07-23T16:00'),
            endDate: new Date('2027-07-25T12:00'),
            registrationLockDate: new Date('2027-07-01T09:00'),
        })
    })

    /* Fails loudly, writes nothing, and hands the rejected text back — the parser it replaced caught
       JSON.parse and stored null, so a bad paste blanked /program on a save that reported success. */
    it('writes nothing and returns the rejected text on bad JSON', async () => {
        const result = await actions.update_program(requestWith({ metadata: '{ menu: [' }))

        expect(isFailure(result)).toBe(true)
        expect(rejectedMetadata(result)).toBe('{ menu: [')
        expect((await eventRow()).metadata).toEqual(PROGRAM)
    })

    /* .strict(), so a typo'd key is named rather than silently dropped. */
    it('refuses a key that is not in the schema', async () => {
        const result = await actions.update_program(requestWith({ metadata: '{"menus":[]}' }))

        expect(isFailure(result)).toBe(true)
        expect((await eventRow()).metadata).toEqual(PROGRAM)
    })

    /* Blank is an event with no program content yet, which is every event in draft. */
    it('stores an empty object for blank input', async () => {
        await actions.update_program(requestWith({ metadata: '   ' }))

        expect((await eventRow()).metadata).toEqual({})
    })
})

describe('settings ?/update_lock_date', () => {
    it('requires the owner', async () => {
        mockRequireOwner.mockImplementation(() => {
            throw new Error('denied')
        })

        await expect(
            actions.update_lock_date(requestWith({ registrationLockDate: '2027-09-01T00:00' })),
        ).rejects.toThrow('denied')

        expect((await eventRow()).registrationLockDate).toEqual(new Date('2027-07-01T09:00'))
    })

    it('clears the lock when left blank', async () => {
        await actions.update_lock_date(requestWith({ registrationLockDate: '' }))

        expect((await eventRow()).registrationLockDate).toBeNull()
    })

    it('leaves the program and the dates untouched', async () => {
        await actions.update_lock_date(requestWith({ registrationLockDate: '2027-09-01T09:00' }))

        expect(await eventRow()).toMatchObject({
            registrationLockDate: new Date('2027-09-01T09:00'),
            metadata: PROGRAM,
            startDate: new Date('2027-07-23T16:00'),
        })
    })
})
