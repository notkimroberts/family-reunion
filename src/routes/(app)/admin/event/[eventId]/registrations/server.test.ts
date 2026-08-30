import { eq } from 'drizzle-orm'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { partyMembers, registrationAudit } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedEvent } from '$lib/server/testing/seedEvent'
import { seedRegistration } from '$lib/server/testing/seedRegistration'
import { seedUser } from '$lib/server/testing/seedUser'

/* Editing one attendee detail in place, from the People lens.

   The whole action is an ownership check plus a partial write, and both are database facts, so both
   are asserted against real rows. The email module stays mocked because the contract here is that
   nothing is sent at all. */

const mockSendConfirmation = vi.fn()
vi.mock('$lib/server/email', () => ({
    sendRegistrationConfirmation: mockSendConfirmation,
    sendRecoveryEmail: vi.fn(),
    sendCancellationEmail: vi.fn(),
}))

const { actions } = await import('./+page.server')

const ADMIN = { id: 'admin-1', name: 'Kim Roberts', role: 'admin' }

let db: Awaited<ReturnType<typeof resetTestDb>>
let eventId: string
let seeded: Awaited<ReturnType<typeof seedRegistration>>
let memberId: string

function submit(fields: Record<string, string>, routeEventId = eventId) {
    const body = new FormData()
    for (const [key, value] of Object.entries(fields)) {
        body.set(key, value)
    }
    return actions.update_person({
        request: new Request('http://localhost/admin/event/x/registrations', {
            method: 'POST',
            body,
        }),
        url: new URL('http://localhost/admin/event/x/registrations'),
        params: { eventId: routeEventId },
        locals: { user: ADMIN },
    } as unknown as Parameters<typeof actions.update_person>[0])
}

async function memberRow() {
    const [row] = await db.select().from(partyMembers).where(eq(partyMembers.id, memberId))
    return row
}

async function auditEntries() {
    return db
        .select()
        .from(registrationAudit)
        .where(eq(registrationAudit.registrationId, seeded.registrationId))
}

describe('POST /admin/event/[eventId]/registrations update_person', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        db = await resetTestDb()
        await seedUser(db, ADMIN)
        eventId = await seedEvent(db)
        seeded = await seedRegistration(db, {
            eventId,
            members: [
                { name: 'Alice Patterson', priceCents: 16000 },
                { name: 'Marcus Patterson', priceCents: 16000 },
            ],
        })
        memberId = seeded.memberIds[1]
    })

    it('requires an admin', async () => {
        await expect(
            actions.update_person({
                request: new Request('http://localhost/x', {
                    method: 'POST',
                    body: new FormData(),
                }),
                url: new URL('http://localhost/x'),
                params: { eventId },
                locals: { user: undefined },
            } as unknown as Parameters<typeof actions.update_person>[0]),
        ).rejects.toBeDefined()
    })

    /* THE POINT OF THIS ACTION. The registration detail page's save emails the registrant because it
       can change what they owe and who is in their party; this changes neither. An email per dietary
       toggle, while an organiser fills in eight gaps, would train them to ignore the message that
       carries their only working management link. */
    it('never emails the registrant', async () => {
        await submit({ memberId, vegetarianMeal: 'yes' })

        expect(mockSendConfirmation).not.toHaveBeenCalled()
    })

    it('records the change on the attendee', async () => {
        await submit({ memberId, vegetarianMeal: 'yes' })

        expect((await memberRow()).vegetarianMeal).toBe(true)
    })

    it('still audits the change, so it is accountable rather than invisible', async () => {
        await submit({ memberId, vegetarianMeal: 'yes' })

        expect(await auditEntries()).toMatchObject([
            { action: 'member_updated', actorName: 'Kim Roberts' },
        ])
    })

    it('does not audit when the form sent no field to change', async () => {
        await submit({ memberId })

        expect(await auditEntries()).toHaveLength(0)
    })

    /* Documented rather than desired. "Changed" means a field was submitted, not that its value
       differs from the stored one, so re-saving the same answer writes a second history entry. The
       previous version of this test asserted the opposite — but only because it stubbed
       updateAdminMemberDetails to report `changed: false`, so it was describing the mock. Real
       behaviour is one entry per save. Worth revisiting if the history gets noisy; not a money bug. */
    it('audits again when the same value is re-saved', async () => {
        await submit({ memberId, vegetarianMeal: 'yes' })
        await submit({ memberId, vegetarianMeal: 'yes' })

        expect(await auditEntries()).toHaveLength(2)
    })

    /* Each cell posts one field. Reading a missing key as '' would let a dietary toggle clear the
       birthday in the cell beside it — an empty birthDate is written as three nulls. */
    it('leaves the fields the form did not send alone', async () => {
        await submit({ memberId, birthDate: '1990-05-05' })

        await submit({ memberId, vegetarianMeal: 'yes' })

        expect(await memberRow()).toMatchObject({
            birthYear: 1990,
            birthMonth: 5,
            birthDay: 5,
            vegetarianMeal: true,
        })
    })

    it('treats an empty birthDate as a deliberate clear, not as absent', async () => {
        await submit({ memberId, birthDate: '1990-05-05' })

        await submit({ memberId, birthDate: '' })

        expect(await memberRow()).toMatchObject({
            birthYear: null,
            birthMonth: null,
            birthDay: null,
        })
    })

    /* An unanswered select posts '', which means "leave it alone" rather than a guessed No. */
    it('writes nothing for a still-unanswered yes/no', async () => {
        await submit({ memberId, vegetarianMeal: 'yes' })

        await submit({ memberId, vegetarianMeal: '' })

        expect((await memberRow()).vegetarianMeal).toBe(true)
    })

    it('rejects a request with no member', async () => {
        const result = await submit({ vegetarianMeal: 'yes' })

        expect(result).toMatchObject({ status: 400 })
    })

    /* The URL claims an event, so the action enforces it — otherwise a POST aimed at one year could
       edit an attendee of another. */
    it('404s when the attendee belongs to a different event', async () => {
        const otherYear = await seedEvent(db, { year: 2026, status: 'closed' })

        await expect(submit({ memberId, vegetarianMeal: 'yes' }, otherYear)).rejects.toMatchObject({
            status: 404,
        })

        expect((await memberRow()).vegetarianMeal).toBeNull()
    })

    it('404s when the attendee does not exist', async () => {
        await expect(
            submit({ memberId: '00000000-0000-0000-0000-000000000000', vegetarianMeal: 'yes' }),
        ).rejects.toMatchObject({ status: 404 })
    })
})
