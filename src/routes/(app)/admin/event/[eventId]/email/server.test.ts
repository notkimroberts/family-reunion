import { isRedirect } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { announcements, reunionEvents } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'

/* The owner's email to every family. The guard is the real requireOwner against the stub's
   OWNER_EMAIL; the database is PGLite; only the send itself is mocked. */

const mockSendAnnouncement = vi.fn()
const mockReportError = vi.fn()

vi.mock('$lib/server/email', async (importOriginal) => ({
    ...(await importOriginal<typeof import('$lib/server/email')>()),
    sendAnnouncement: mockSendAnnouncement,
}))
vi.mock('$lib/server/reportError', () => ({ reportError: mockReportError }))

const { actions, load } = await import('./+page.server')

const OWNER = { id: 'owner-1', name: 'Kim Roberts', email: 'owner@example.com', role: 'admin' }
const OTHER_ADMIN = { id: 'admin-2', name: 'Pat', email: 'pat@example.com', role: 'admin' }

let db: Awaited<ReturnType<typeof resetTestDb>>
let eventId: string

type ActionName = keyof typeof actions

function post(action: ActionName, fields: Record<string, string>, user: unknown = OWNER) {
    const body = new FormData()
    for (const [key, value] of Object.entries(fields)) {
        body.set(key, value)
    }
    const url = new URL(`http://localhost/admin/event/${eventId}/email`)
    return actions[action]({
        request: new Request(url, { method: 'POST', body }),
        url,
        params: { eventId },
        locals: { user },
    } as unknown as Parameters<(typeof actions)[ActionName]>[0])
}

const MESSAGE = { subject: 'Hotel rooms', body: 'Book by June 1.', audience: 'confirmed' }

async function stored() {
    return db.select().from(announcements).where(eq(announcements.eventId, eventId))
}

async function failure(promise: unknown) {
    try {
        await promise
    } catch (thrown) {
        return thrown
    }
    throw new Error('expected the request to be refused')
}

beforeEach(async () => {
    vi.clearAllMocks()
    mockSendAnnouncement.mockImplementation(async ({ recipients, onProgress }) => {
        await onProgress(recipients.length)
    })
    db = await resetTestDb()
    ;({ eventId } = await seedRegistration(db, { contactEmail: 'Alice@Example.com' }))
    await seedRegistration(db, { eventId, contactEmail: 'alice@example.com' })
    await seedRegistration(db, { eventId, status: 'waived', contactEmail: 'bob@example.com' })
    await seedRegistration(db, { eventId, status: 'pending', contactEmail: 'carol@example.com' })
    await seedRegistration(db, { eventId, status: 'refunded', contactEmail: 'gone@example.com' })
})

describe('the email page', () => {
    it('is refused to an admin who is not the owner, in the load and in send', async () => {
        const loadEvent = { params: { eventId }, locals: { user: OTHER_ADMIN } }
        expect(
            isRedirect(await failure(load(loadEvent as unknown as Parameters<typeof load>[0]))),
        ).toBe(true)
        expect(
            isRedirect(await failure(post('send', { ...MESSAGE, confirmCount: '2' }, OTHER_ADMIN))),
        ).toBe(true)
        expect(mockSendAnnouncement).not.toHaveBeenCalled()
    })

    it('counts each address once, and never a refunded booking', async () => {
        const data = await load({
            params: { eventId },
            locals: { user: OWNER },
        } as unknown as Parameters<typeof load>[0])
        expect(data).toMatchObject({ recipientCounts: { confirmed: 2, everyone_active: 3 } })
    })

    it('sends to the deduplicated list and records it as sent', async () => {
        const result = await post('send', { ...MESSAGE, confirmCount: '2' })

        expect(result).toEqual({ sent: { sentCount: 2, total: 2, finished: true } })
        expect(mockSendAnnouncement.mock.calls[0][0].recipients).toEqual([
            'alice@example.com',
            'bob@example.com',
        ])
        const [row] = await stored()
        expect(row).toMatchObject({ status: 'sent', sentCount: 2, sentByName: OWNER.name })
    })

    it('refuses a send whose confirmed count no longer matches, and sends nothing', async () => {
        const result = await post('send', { ...MESSAGE, confirmCount: '1' })
        expect(result).toMatchObject({ status: 400 })
        expect(mockSendAnnouncement).not.toHaveBeenCalled()
        expect(await stored()).toHaveLength(0)
    })

    it('records a failure partway, and Retry resumes it to the same list', async () => {
        mockSendAnnouncement.mockImplementationOnce(async ({ onProgress }) => {
            await onProgress(1)
            throw new Error('rate limited')
        })
        const first = await post('send', {
            ...MESSAGE,
            audience: 'everyone_active',
            confirmCount: '3',
        })
        expect(first).toEqual({ sent: { sentCount: 1, total: 3, finished: false } })
        const [failed] = await stored()
        expect(failed).toMatchObject({ status: 'failed', sentCount: 1 })
        expect(mockReportError).toHaveBeenCalled()

        /* A booking that arrives in between must not join the retried send. */
        await seedRegistration(db, { eventId, contactEmail: 'late@example.com' })
        const retried = await post('retry', { announcementId: failed.id })

        expect(retried).toEqual({ sent: { sentCount: 3, total: 3, finished: true } })
        expect(mockSendAnnouncement.mock.calls[1][0]).toMatchObject({
            announcementId: failed.id,
            alreadySent: 1,
            recipients: ['alice@example.com', 'bob@example.com', 'carol@example.com'],
        })
        expect(await post('retry', { announcementId: failed.id })).toMatchObject({ status: 400 })
    })

    it('refuses to send from an archived reunion', async () => {
        await db
            .update(reunionEvents)
            .set({ status: 'archived' })
            .where(eq(reunionEvents.id, eventId))
        expect(await post('send', { ...MESSAGE, confirmCount: '2' })).toMatchObject({ status: 400 })
        expect(mockSendAnnouncement).not.toHaveBeenCalled()
    })

    it('sends a test only to the owner, marked, and records nothing', async () => {
        expect(await post('send_test', MESSAGE)).toEqual({ testSentTo: OWNER.email })
        expect(mockSendAnnouncement.mock.calls[0][0]).toMatchObject({
            recipients: [OWNER.email],
            data: { subject: '[Test] Hotel rooms' },
        })
        expect(await stored()).toHaveLength(0)
    })

    it('previews the rendered email without sending', async () => {
        const result = await post('preview', MESSAGE)
        expect(result).toMatchObject({ previewHtml: expect.stringContaining('Book by June 1.') })
        expect(mockSendAnnouncement).not.toHaveBeenCalled()
    })
})
