import { describe, it, expect, vi, beforeEach } from 'vitest'

/* This function exists to record who changed someone else's registration. It failed silently for
   every admin edit in dev, and nothing said so.

   Two independent causes, both fixed here and both pinned below:

   - actor_user_id is a foreign key to user.id. In dev there is no session, so hooks.server.ts
     substitutes a user whose id ('dev-admin') has no row. The FK rejected the insert.
   - the catch reported through dbg only, which is never enabled under `node build/index.js`. So the
     rejection was invisible in dev AND would have been invisible in production. */

const { mockInsert, mockValues, mockSelectResult, mockReportError } = vi.hoisted(() => ({
    mockInsert: vi.fn(),
    mockValues: vi.fn(),
    mockSelectResult: { rows: [] as unknown[] },
    mockReportError: vi.fn(),
}))

const mockDb = {
    insert: () => {
        mockInsert()
        return { values: mockValues }
    },
    select: () => ({
        from: () => ({
            where: () => ({ limit: () => Promise.resolve(mockSelectResult.rows) }),
        }),
    }),
}

vi.mock('$lib/server/db', () => ({ db: mockDb }))
vi.mock('$lib/server/db/schema', () => ({
    registrationAudit: {},
    registrationAuditActionEnum: { enumValues: ['status_changed', 'member_added'] },
    user: { id: 'id' },
}))
vi.mock('$lib/server/reportError', () => ({ reportError: mockReportError }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))

const { recordRegistrationAudit } = await import('./recordRegistrationAudit')

const REAL_ADMIN = { id: 'user-abc', name: 'Kim Roberts' }
const DEV_ADMIN = { id: 'dev-admin', name: 'Dev Admin' }

beforeEach(() => {
    vi.clearAllMocks()
    mockSelectResult.rows = []
    mockValues.mockResolvedValue(undefined)
})

describe('recordRegistrationAudit', () => {
    it('stores the id when the actor is a real user row', async () => {
        mockSelectResult.rows = [{ id: 'user-abc' }]

        await recordRegistrationAudit({
            registrationId: 'reg-1',
            actor: REAL_ADMIN,
            action: 'status_changed',
            detail: { from: 'pending', to: 'paid' },
        })

        expect(mockValues).toHaveBeenCalledWith(
            expect.objectContaining({ actorUserId: 'user-abc', actorName: 'Kim Roberts' }),
        )
    })

    /* The dev case that lost every history row. An id with no user row must be dropped rather than
       handed to the FK, and the name must still be recorded so the entry is readable. */
    it('drops an actor id that has no user row, keeping the name', async () => {
        mockSelectResult.rows = []

        await recordRegistrationAudit({
            registrationId: 'reg-1',
            actor: DEV_ADMIN,
            action: 'member_added',
        })

        expect(mockValues).toHaveBeenCalledWith(
            expect.objectContaining({ actorUserId: null, actorName: 'Dev Admin' }),
        )
        expect(mockReportError).not.toHaveBeenCalled()
    })

    /* Keyed on existence, not on `dev`: a production account deleted mid-session is the same case and
       has to behave the same way. Asserted via a real-looking id that no longer resolves. */
    it('treats a deleted production account the same way', async () => {
        mockSelectResult.rows = []

        await recordRegistrationAudit({
            registrationId: 'reg-1',
            actor: REAL_ADMIN,
            action: 'status_changed',
        })

        expect(mockValues).toHaveBeenCalledWith(
            expect.objectContaining({ actorUserId: null, actorName: 'Kim Roberts' }),
        )
    })

    it('records a null actor when there is none', async () => {
        await recordRegistrationAudit({
            registrationId: 'reg-1',
            actor: undefined,
            action: 'status_changed',
        })

        expect(mockValues).toHaveBeenCalledWith(
            expect.objectContaining({ actorUserId: null, actorName: null }),
        )
    })

    /* The half that hid the bug. An audit failure must not break the caller's save — but it must not
       be silent either, or the next one is invisible too. */
    it('REPORTS a failed write instead of swallowing it, and does not throw', async () => {
        mockSelectResult.rows = [{ id: 'user-abc' }]
        mockValues.mockRejectedValue(new Error('violates foreign key constraint'))

        await expect(
            recordRegistrationAudit({
                registrationId: 'reg-1',
                actor: REAL_ADMIN,
                action: 'member_added',
            }),
        ).resolves.toBeUndefined()

        expect(mockReportError).toHaveBeenCalledWith(
            expect.stringContaining('audit'),
            expect.any(Error),
            expect.objectContaining({ registrationId: 'reg-1', action: 'member_added' }),
        )
    })
})
