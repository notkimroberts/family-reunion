import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { hashPassword } from 'better-auth/crypto'
import { admin } from 'better-auth/plugins'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import * as schema from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { resetPassword } from './resetPassword'

/* sveltekitCookies() wants a request event; nothing here goes through a route. */
vi.mock('$app/server', () => ({ getRequestEvent: () => ({}) }))

const { auth } = await import('./index')

const OLD_PASSWORD = 'old-password-123'
const NEW_PASSWORD = 'new-password-456'

/* One database for the file, not one per case: the auth singleton captures getDb() at first access,
   so a per-case reset would leave it holding the first case's PGLite. Cases use distinct emails. */
let db: Awaited<ReturnType<typeof resetTestDb>>

/* The bootstrap path, mirroring scripts/createAdmin.ts: sign-up is disabled on the app's own
   instance, so an account is made the way admin:create makes one. */
async function createAdminAccount(email: string) {
    const bootstrap = betterAuth({
        baseURL: 'http://localhost:5173',
        database: drizzleAdapter(db, { provider: 'pg', schema }),
        emailAndPassword: { enabled: true },
        plugins: [admin()],
    })
    return bootstrap.api.signUpEmail({
        body: { email, password: OLD_PASSWORD, name: 'Owner' },
    })
}

/* End-to-end against a real Postgres, because the failure this pins was invisible to every test
   that stopped at the options object or at the account row.

   better-auth 1.7 added `account.issuer` and made sign-in/email match the credential account on
   `issuer === 'local:credential'` AND `accountId === user.id`. The 1.6 → 1.7 bump landed without the
   column, so the match found nothing and the endpoint answered "Invalid email or password" for a
   correct password — on an account whose stored hash verified. It reached production. */
describe('email + password sign-in', () => {
    beforeAll(async () => {
        db = await resetTestDb()
    })

    it('signs in an account created by the bootstrap script', async () => {
        const email = 'bootstrap@example.com'
        await createAdminAccount(email)

        const result = await auth.api.signInEmail({ body: { email, password: OLD_PASSWORD } })

        expect(result.user.email).toBe(email)
    })

    it('signs in with the new password after a reset', async () => {
        const email = 'reset@example.com'
        await createAdminAccount(email)
        const reset = await resetPassword(email, NEW_PASSWORD)
        expect(reset.ok).toBe(true)

        const result = await auth.api.signInEmail({ body: { email, password: NEW_PASSWORD } })

        expect(result.user.email).toBe(email)
    })

    it('refuses the old password after a reset', async () => {
        const email = 'stale@example.com'
        await createAdminAccount(email)
        await resetPassword(email, NEW_PASSWORD)

        await expect(
            auth.api.signInEmail({ body: { email, password: OLD_PASSWORD } }),
        ).rejects.toThrow()
    })

    /* The production account predates the issuer column, so migration 0022 backfills it as
       `local:<providerId>`. This asserts that exact string is what sign-in matches on — a backfill of
       'credential', or of the OAuth form 'local:oauth:credential', leaves the account unreachable in
       precisely the way the missing column did. */
    it('signs in an account whose issuer came from the backfill', async () => {
        const email = 'legacy@example.com'
        const userId = 'legacy-user-id'
        await db.insert(schema.user).values({ id: userId, name: 'Legacy', email })
        await db.insert(schema.account).values({
            id: 'legacy-account-id',
            accountId: userId,
            providerId: 'credential',
            issuer: 'local:credential',
            userId,
            password: await hashPassword(OLD_PASSWORD),
        })

        const result = await auth.api.signInEmail({ body: { email, password: OLD_PASSWORD } })

        expect(result.user.email).toBe(email)
    })
})
