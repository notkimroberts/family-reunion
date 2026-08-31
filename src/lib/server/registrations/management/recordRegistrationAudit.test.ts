import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registrationAudit, user } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'
import { seedUser } from '$lib/server/testing/seedUser'

/* This function exists to record who changed someone else's registration. It failed silently for
   every admin edit in dev, and nothing said so.

   Two independent causes, both fixed and both pinned below:

   - actor_user_id is a foreign key to user.id. In dev there is no session, so hooks.server.ts
     substitutes a user whose id ('dev-admin') has no row. The FK rejected the insert.
   - the catch reported through dbg only, which is never enabled under `node build/index.js`. So the
     rejection was invisible in dev AND would have been invisible in production.

   The first of those is a foreign key, so a real database is the only thing that can prove it is
   fixed. The version this replaced stubbed the existence check with a queued array — it asserted the
   code asked the question, not that the answer kept the insert legal. */

const mockReportError = vi.fn()
vi.mock('$lib/server/reportError', () => ({ reportError: mockReportError }))

const { recordRegistrationAudit } = await import('./recordRegistrationAudit')

const REAL_ADMIN = { id: 'user-abc', name: 'Kim Roberts' }
const DEV_ADMIN = { id: 'dev-admin', name: 'Dev Admin' }

let db: Awaited<ReturnType<typeof resetTestDb>>
let seeded: Awaited<ReturnType<typeof seedRegistration>>

async function entries() {
    return db
        .select()
        .from(registrationAudit)
        .where(eq(registrationAudit.registrationId, seeded.registrationId))
}

describe('recordRegistrationAudit', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        db = await resetTestDb()
        seeded = await seedRegistration(db)
    })

    it('stores the id when the actor is a real user row', async () => {
        await seedUser(db, REAL_ADMIN)

        await recordRegistrationAudit({
            registrationId: seeded.registrationId,
            actor: REAL_ADMIN,
            action: 'status_changed',
            detail: { from: 'pending', to: 'paid' },
        })

        expect(await entries()).toMatchObject([
            {
                actorUserId: 'user-abc',
                actorName: 'Kim Roberts',
                action: 'status_changed',
                detail: { from: 'pending', to: 'paid' },
            },
        ])
    })

    /* The dev case that lost every history row. An id with no user row must be dropped rather than
       handed to the FK, and the name must still be recorded so the entry is readable.

       Against a real database this is no longer a statement about what the code checked — the row
       either landed or the foreign key rejected it. */
    it('drops an actor id that has no user row, keeping the name', async () => {
        await recordRegistrationAudit({
            registrationId: seeded.registrationId,
            actor: DEV_ADMIN,
            action: 'member_added',
        })

        expect(await entries()).toMatchObject([{ actorUserId: null, actorName: 'Dev Admin' }])
        expect(mockReportError).not.toHaveBeenCalled()
    })

    /* Keyed on existence, not on `dev`: a production account deleted mid-session is the same case and
       has to behave the same way. */
    it('treats a deleted production account the same way', async () => {
        await recordRegistrationAudit({
            registrationId: seeded.registrationId,
            actor: REAL_ADMIN,
            action: 'status_changed',
        })

        expect(await entries()).toMatchObject([{ actorUserId: null, actorName: 'Kim Roberts' }])
    })

    it('records a null actor when there is none', async () => {
        await recordRegistrationAudit({
            registrationId: seeded.registrationId,
            actor: undefined,
            action: 'status_changed',
        })

        expect(await entries()).toMatchObject([{ actorUserId: null, actorName: null }])
    })

    /* Deleting an organiser's account must not erase the record that they acted — which is why the
       name is snapshotted beside the FK and the FK is ON DELETE SET NULL. */
    it('keeps the actor’s name after their account is deleted', async () => {
        await seedUser(db, REAL_ADMIN)
        await recordRegistrationAudit({
            registrationId: seeded.registrationId,
            actor: REAL_ADMIN,
            action: 'status_changed',
        })

        await db.delete(user)

        expect(await entries()).toMatchObject([{ actorUserId: null, actorName: 'Kim Roberts' }])
    })

    /* The half that hid the bug. An audit failure must not break the caller's save — but it must not
       be silent either, or the next one is invisible too.

       Provoked with a real constraint violation rather than a rejected mock: the registration id has
       no row, so registration_audit's own foreign key rejects the insert. */
    it('REPORTS a failed write instead of swallowing it, and does not throw', async () => {
        await expect(
            recordRegistrationAudit({
                registrationId: '00000000-0000-0000-0000-000000000000',
                actor: undefined,
                action: 'member_added',
            }),
        ).resolves.toBeUndefined()

        expect(mockReportError).toHaveBeenCalledWith(
            expect.stringContaining('audit'),
            expect.anything(),
            expect.objectContaining({
                registrationId: '00000000-0000-0000-0000-000000000000',
                action: 'member_added',
            }),
        )
    })
})
