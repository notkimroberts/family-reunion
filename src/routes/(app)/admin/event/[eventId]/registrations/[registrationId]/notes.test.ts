import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registrationNotes } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { getLatestNotesForEvent } from '$lib/server/registrations'
import { seedRegistration } from '$lib/server/testing/seedRegistration'
import { seedUser } from '$lib/server/testing/seedUser'

/* Organizer notes: appended by the add_note action, shown on the booking and in the Follow up lens,
   and never anywhere a registrant can reach. */

vi.mock('$lib/server/email', () => ({
    sendRegistrationConfirmation: vi.fn(),
    sendRecoveryEmail: vi.fn(),
    sendCancellationEmail: vi.fn(),
}))

const { actions, load } = await import('./+page.server')

const ADMIN = { id: 'admin-1', name: 'Kim Roberts', role: 'admin' }

let db: Awaited<ReturnType<typeof resetTestDb>>
let seeded: Awaited<ReturnType<typeof seedRegistration>>

function addNote(body: string, params: { eventId?: string; registrationId?: string } = {}) {
    const formData = new FormData()
    formData.set('body', body)
    const url = new URL('http://localhost/admin/event/x/registrations/y')
    return actions.add_note({
        request: new Request(url, { method: 'POST', body: formData }),
        url,
        params: {
            eventId: params.eventId ?? seeded.eventId,
            registrationId: params.registrationId ?? seeded.registrationId,
        },
        locals: { user: ADMIN },
    } as unknown as Parameters<typeof actions.add_note>[0])
}

async function storedNotes() {
    return db
        .select()
        .from(registrationNotes)
        .where(eq(registrationNotes.registrationId, seeded.registrationId))
}

async function failure(promise: unknown) {
    try {
        await promise
    } catch (thrown) {
        return thrown
    }
    throw new Error('expected the request to be refused')
}

describe('add_note', () => {
    beforeEach(async () => {
        db = await resetTestDb()
        seeded = await seedRegistration(db)
    })

    it('stores a trimmed note with its author', async () => {
        await seedUser(db, { id: ADMIN.id, name: ADMIN.name })
        expect(await addNote('  Called Nov 3, check in the mail  ')).toEqual({ noteAdded: true })

        const [note] = await storedNotes()
        expect(note.body).toBe('Called Nov 3, check in the mail')
        expect(note.authorUserId).toBe(ADMIN.id)
        expect(note.authorName).toBe(ADMIN.name)
    })

    /* The dev admin has no user row; the FK must not swallow the note. */
    it('keeps the note when the author has no user row', async () => {
        await addNote('Left a voicemail')
        const [note] = await storedNotes()
        expect(note.authorUserId).toBeNull()
        expect(note.authorName).toBe(ADMIN.name)
    })

    it('refuses a blank note and writes nothing', async () => {
        const result = await addNote('   ')
        expect(result).toMatchObject({ status: 400, data: { noteError: 'Write the note first' } })
        expect(await storedNotes()).toHaveLength(0)
    })

    it('404s a registration from another year', async () => {
        const other = await seedRegistration(db, { eventStatus: 'closed' })
        const thrown = await failure(addNote('x', { eventId: other.eventId }))
        expect(thrown).toMatchObject({ status: 404 })
        expect(await storedNotes()).toHaveLength(0)
    })

    it('appears on the booking newest first', async () => {
        await addNote('first')
        await addNote('second')
        const data = await load({
            params: { eventId: seeded.eventId, registrationId: seeded.registrationId },
            locals: { user: ADMIN },
        } as unknown as Parameters<typeof load>[0])
        expect(data).toMatchObject({ notes: [{ body: 'second' }, { body: 'first' }] })
    })
})

describe('getLatestNotesForEvent', () => {
    beforeEach(async () => {
        db = await resetTestDb()
        seeded = await seedRegistration(db)
    })

    it('returns the newest note per booking of that event only', async () => {
        const other = await seedRegistration(db, { eventStatus: 'closed' })
        await db.insert(registrationNotes).values([
            {
                registrationId: seeded.registrationId,
                body: 'old',
                createdAt: new Date('2026-11-01'),
            },
            {
                registrationId: seeded.registrationId,
                body: 'new',
                createdAt: new Date('2026-11-02'),
            },
            { registrationId: other.registrationId, body: 'other year' },
        ])

        const latest = await getLatestNotesForEvent(seeded.eventId)
        expect(Object.keys(latest)).toEqual([seeded.registrationId])
        expect(latest[seeded.registrationId].body).toBe('new')
    })
})

/* Notes are for organizers. Nothing a registrant can open, and no email, may read them. */
describe('notes stay out of public code', () => {
    function sources(dir: string): string[] {
        return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
            entry.isDirectory()
                ? sources(join(dir, entry.name))
                : /\.(ts|svelte)$/.test(entry.name) && !entry.name.endsWith('.test.ts')
                  ? [join(dir, entry.name)]
                  : [],
        )
    }

    it.each(['src/routes/(app)/register', 'src/lib/server/email'])(
        '%s never reads notes',
        (dir) => {
            for (const file of sources(dir)) {
                expect(readFileSync(file, 'utf8'), file).not.toMatch(
                    /registrationNotes|RegistrationNote/,
                )
            }
        },
    )
})
