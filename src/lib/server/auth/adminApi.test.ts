import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { ORGANIZER_ROLE } from '$lib/general/constants'
import * as schema from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'

/* sveltekitCookies() wants a request event; nothing here goes through a route. */
vi.mock('$app/server', () => ({ getRequestEvent: () => ({}) }))

const { auth } = await import('./index')

const PASSWORD = 'password-123'
const ORIGIN = 'http://localhost:5173'

/* One database for the file: the auth singleton captures getDb() at first access. */
let db: Awaited<ReturnType<typeof resetTestDb>>

beforeAll(async () => {
    db = await resetTestDb()
})

/* An organizer, made the way admin:create makes one, and signed in. */
async function signedInOrganizer(email: string) {
    const bootstrap = betterAuth({
        baseURL: ORIGIN,
        database: drizzleAdapter(db, { provider: 'pg', schema }),
        emailAndPassword: { enabled: true },
    })
    await bootstrap.api.signUpEmail({ body: { email, password: PASSWORD, name: 'Organizer' } })
    await db.update(schema.user).set({ role: ORGANIZER_ROLE }).where(eq(schema.user.email, email))

    const signedIn = await auth.api.signInEmail({
        body: { email, password: PASSWORD },
        returnHeaders: true,
    })
    const cookie = signedIn.headers
        .getSetCookie()
        .map((setCookie) => setCookie.split(';')[0])
        .join('; ')
    return { cookie, userId: signedIn.response.user.id }
}

function post(path: string, cookie: string, body: unknown) {
    return auth.handler(
        new Request(`${ORIGIN}/api/auth${path}`, {
            method: 'POST',
            headers: { cookie, origin: ORIGIN, 'content-type': 'application/json' },
            body: JSON.stringify(body),
        }),
    )
}

async function storedRole(userId: string) {
    const [row] = await db
        .select({ role: schema.user.role })
        .from(schema.user)
        .where(eq(schema.user.id, userId))
    return row.role
}

/* The role decides who is the owner, so nothing an organizer can POST may change one.

   Better Auth's admin plugin let ANY admin set-role, set-user-password, remove-user, ban-user and
   update-user (email included) on any account, the owner's too — mounted ahead of SvelteKit
   routing, so no guard of ours ever saw the request. The app called none of them. */
describe('the auth API an organizer can reach', () => {
    it('has no admin endpoints', async () => {
        const { cookie, userId } = await signedInOrganizer('set-role@example.com')

        const response = await post('/admin/set-role', cookie, { userId, role: 'owner' })

        expect(response.status).toBe(404)
        expect(await storedRole(userId)).toBe(ORGANIZER_ROLE)
    })

    it('cannot set its own role through update-user', async () => {
        const { cookie, userId } = await signedInOrganizer('update-user@example.com')

        await post('/update-user', cookie, { role: 'owner' })

        expect(await storedRole(userId)).toBe(ORGANIZER_ROLE)
    })

    /* hooks.server.ts and every guard read the role off the session, not the row. */
    it('still carries the role on the session', async () => {
        const { cookie } = await signedInOrganizer('session@example.com')

        const session = await auth.api.getSession({ headers: new Headers({ cookie }) })

        expect(session?.user.role).toBe(ORGANIZER_ROLE)
    })
})
