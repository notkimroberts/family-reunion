import { hashPassword, verifyPassword } from 'better-auth/crypto'
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { account, session, user } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedUser } from '$lib/server/testing/seedUser'
import { resetPassword } from './resetPassword'

/* The only route back into a locked-out admin account: there is no reset email and no
   account-management screen, and admin:create cannot do it because signUpEmail fails when the
   account already exists.

   Assertions are on the stored hash VERIFYING under Better Auth's own verifyPassword, not on the
   string. The format is Better Auth's to define, so a hash written any other way would look fine in
   the column and be rejected at sign-in as a wrong password. */

const EMAIL = 'organiser@example.com'
const OLD_PASSWORD = 'OldPassword123'
const NEW_PASSWORD = 'NewPassword456'

let db: Awaited<ReturnType<typeof resetTestDb>>

async function seedCredentialAccount() {
    const userId = await seedUser(db, { email: EMAIL })
    await db.insert(account).values({
        id: 'account-1',
        accountId: userId,
        providerId: 'credential',
        issuer: 'local:credential',
        userId,
        password: await hashPassword(OLD_PASSWORD),
    })
    return userId
}

async function storedHash() {
    const [row] = await db
        .select({ password: account.password })
        .from(account)
        .where(eq(account.id, 'account-1'))
    return row.password ?? ''
}

beforeEach(async () => {
    db = await resetTestDb()
})

describe('resetPassword', () => {
    it('writes a hash the new password verifies against', async () => {
        await seedCredentialAccount()

        const result = await resetPassword(EMAIL, NEW_PASSWORD)

        expect(result.ok).toBe(true)
        expect(await verifyPassword({ hash: await storedHash(), password: NEW_PASSWORD })).toBe(
            true,
        )
    })

    it('stops the old password working', async () => {
        await seedCredentialAccount()
        /* Prove the fixture really was set to the old password first. */
        expect(await verifyPassword({ hash: await storedHash(), password: OLD_PASSWORD })).toBe(
            true,
        )

        await resetPassword(EMAIL, NEW_PASSWORD)

        expect(await verifyPassword({ hash: await storedHash(), password: OLD_PASSWORD })).toBe(
            false,
        )
    })

    it('signs out every existing session, since a reset may be a lockout', async () => {
        const userId = await seedCredentialAccount()
        await db.insert(session).values([
            {
                id: 'session-1',
                token: 'token-1',
                userId,
                expiresAt: new Date(Date.now() + 86_400_000),
            },
            {
                id: 'session-2',
                token: 'token-2',
                userId,
                expiresAt: new Date(Date.now() + 86_400_000),
            },
        ])

        const result = await resetPassword(EMAIL, NEW_PASSWORD)

        expect(result).toMatchObject({ ok: true, sessionsRevoked: 2 })
        expect(await db.select().from(session)).toHaveLength(0)
    })

    it('leaves the account alone when the email is unknown', async () => {
        await seedCredentialAccount()
        const before = await storedHash()

        const result = await resetPassword('nobody@example.com', NEW_PASSWORD)

        expect(result).toEqual({ ok: false, reason: 'no-account' })
        expect(await storedHash()).toBe(before)
    })

    it('refuses a password Better Auth would reject at sign-in', async () => {
        await seedCredentialAccount()
        const before = await storedHash()

        const result = await resetPassword(EMAIL, 'short')

        expect(result).toEqual({ ok: false, reason: 'too-short' })
        expect(await storedHash()).toBe(before)
    })

    it('keeps the role, so a reset cannot quietly demote an admin', async () => {
        await seedCredentialAccount()

        const result = await resetPassword(EMAIL, NEW_PASSWORD)

        expect(result).toMatchObject({ role: 'admin' })
        const [row] = await db.select({ role: user.role }).from(user)
        expect(row.role).toBe('admin')
    })
})
