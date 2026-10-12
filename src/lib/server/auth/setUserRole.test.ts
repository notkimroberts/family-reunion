import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { ORGANIZER_ROLE, OWNER_ROLE } from '$lib/general/constants'
import { session, user } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedUser } from '$lib/server/testing/seedUser'
import { setUserRole } from './setUserRole'

let db: Awaited<ReturnType<typeof resetTestDb>>

beforeEach(async () => {
    db = await resetTestDb()
})

async function storedRole(userId: string) {
    const [row] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId))
    return row.role
}

describe('setUserRole', () => {
    it('makes an organizer the owner', async () => {
        const userId = await seedUser(db, { email: 'kim@example.com' })

        const result = await setUserRole(db, 'kim@example.com', 'owner')

        expect(result.ok).toBe(true)
        expect(await storedRole(userId)).toBe(OWNER_ROLE)
    })

    it('makes the owner an organizer again', async () => {
        const userId = await seedUser(db, { email: 'kim@example.com' })
        await setUserRole(db, 'kim@example.com', 'owner')

        await setUserRole(db, 'kim@example.com', 'organizer')

        expect(await storedRole(userId)).toBe(ORGANIZER_ROLE)
    })

    /* A demotion must not wait for the session to expire. */
    it('signs out every session of the account', async () => {
        const userId = await seedUser(db, { email: 'kim@example.com' })
        await db.insert(session).values({
            id: 'session-1',
            userId,
            token: 'token-1',
            expiresAt: new Date(Date.now() + 60_000),
        })

        const result = await setUserRole(db, 'kim@example.com', 'organizer')

        expect(result).toMatchObject({ ok: true, sessionsRevoked: 1 })
        expect(await db.select().from(session)).toHaveLength(0)
    })

    it('reports an unknown address and changes nothing', async () => {
        const userId = await seedUser(db, { email: 'kim@example.com' })

        const result = await setUserRole(db, 'nobody@example.com', 'owner')

        expect(result).toEqual({ ok: false, reason: 'no-account' })
        expect(await storedRole(userId)).toBe(ORGANIZER_ROLE)
    })
})
