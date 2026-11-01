import { isHttpError, isRedirect } from '@sveltejs/kit'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedEvent } from '$lib/server/testing/seedEvent'
import { seedRegistration } from '$lib/server/testing/seedRegistration'
import { GET } from './+server'

/* The CSV export is a +server.ts, so no layout guards it: the in-handler requireAdmin is the whole
   protection, and these tests are what pin it. */

const ADMIN = { id: 'admin-1', name: 'Kim Roberts', role: 'admin' }
const MISSING_EVENT_ID = '00000000-0000-4000-8000-000000000000'

let db: Awaited<ReturnType<typeof resetTestDb>>
let eventId: string

function get(kind: string, user: unknown = ADMIN, routeEventId = eventId) {
    return GET({
        params: { eventId: routeEventId, kind },
        locals: { user },
    } as unknown as Parameters<typeof GET>[0])
}

async function failure(promise: unknown) {
    try {
        await promise
    } catch (thrown) {
        return thrown
    }
    throw new Error('expected the request to be refused')
}

function lines(csv: string) {
    return csv
        .replace(/^\uFEFF/, '')
        .trimEnd()
        .split('\r\n')
}

describe('GET /admin/event/[eventId]/registrations/export/[kind]', () => {
    beforeEach(async () => {
        db = await resetTestDb()
        eventId = await seedEvent(db, { year: 2027 })
    })

    it('redirects a visitor with no session', async () => {
        expect(isRedirect(await failure(get('people', null)))).toBe(true)
    })

    it('redirects a signed-in account that is not an admin', async () => {
        const thrown = await failure(get('people', { id: 'u', name: 'U', role: 'user' }))
        expect(isRedirect(thrown)).toBe(true)
    })

    it('404s an unknown kind, a malformed id and a missing event', async () => {
        for (const request of [
            get('donations'),
            get('people', ADMIN, 'banana'),
            get('people', ADMIN, MISSING_EVENT_ID),
        ]) {
            const thrown = await failure(request)
            expect(isHttpError(thrown) && thrown.status).toBe(404)
        }
    })

    it('downloads the people sheet as an attachment, uncached', async () => {
        await seedRegistration(db, { eventId, contactName: 'Roxie Patterson' })
        const response = await get('people')

        expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8')
        expect(response.headers.get('content-disposition')).toBe(
            'attachment; filename="reunion-2027-people.csv"',
        )
        expect(response.headers.get('cache-control')).toBe('private, no-store')
        const [header, row] = lines(await response.text())
        expect(header.startsWith('Name,Booked by,Contact email,Tier')).toBe(true)
        expect(row.startsWith('Alice Patterson,Roxie Patterson,alice@example.com,Adult')).toBe(true)
    })

    it('leaves pending and refunded people out of the people sheet but lists every booking', async () => {
        await seedRegistration(db, { eventId, contactEmail: 'paid@example.com' })
        await seedRegistration(db, {
            eventId,
            status: 'pending',
            contactEmail: 'pending@example.com',
            members: [{ name: 'Not Yet', priceCents: 16509 }],
        })
        await seedRegistration(db, {
            eventId,
            status: 'refunded',
            contactEmail: 'gone@example.com',
            members: [{ name: 'Gone Away', priceCents: 16509 }],
        })

        const people = await (await get('people')).text()
        expect(people).not.toContain('Not Yet')
        expect(people).not.toContain('Gone Away')
        expect(lines(await (await get('bookings')).text())).toHaveLength(4)
    })

    it('defuses a formula typed as a name', async () => {
        await seedRegistration(db, {
            eventId,
            contactName: '=HYPERLINK("http://x")',
            members: [{ name: '=1+1', priceCents: 16509 }],
        })
        const csv = await (await get('people')).text()
        expect(lines(csv)[1].startsWith(`'=1+1,"'=HYPERLINK(""http://x"")"`)).toBe(true)
    })

    it('reports the shown status and the amount still owed on a booking', async () => {
        await seedRegistration(db, {
            eventId,
            members: [
                { name: 'Alice Patterson', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
                { name: 'Added Later', priceCents: 16500, paymentDue: true },
            ],
        })
        const [, row] = lines(await (await get('bookings')).text())
        expect(row).toContain(',Partly paid,2,330.09,165.00,')
    })
})
