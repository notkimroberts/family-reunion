import { createHmac } from 'node:crypto'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'
import { eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import * as schema from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { needsTwoFactorSetup } from './needsTwoFactorSetup'
import { resetTwoFactor } from './resetTwoFactor'

/* sveltekitCookies() wants a request event; nothing here goes through a route. */
vi.mock('$app/server', () => ({ getRequestEvent: () => ({}) }))

const { auth } = await import('./index')
const { load: setupPageLoad } = await import('../../../routes/(auth)/login/setup-2fa/+page.server')

const PASSWORD = 'password-123'
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const TOTP_PERIOD_SECONDS = 30
const TOTP_DIGITS = 6

/* One database for the file, as in signIn.test.ts: the auth singleton captures getDb() at first
   access. Cases use distinct emails. */
let db: Awaited<ReturnType<typeof resetTestDb>>

beforeAll(async () => {
    db = await resetTestDb()
})

/* RFC 6238 from the otpauth:// URI, computed independently of Better Auth — what an authenticator
   app does. If the plugin's URI and its verifier ever disagree, this is where it shows. */
function totpFromUri(totpUri: string): string {
    const secret = new URL(totpUri).searchParams.get('secret') ?? ''
    const bits = [...secret.replace(/=+$/, '')]
        .map((char) => BASE32_ALPHABET.indexOf(char).toString(2).padStart(5, '0'))
        .join('')
    const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)))
    const counter = Buffer.alloc(8)
    counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS)))
    const hmac = createHmac('sha1', key).update(counter).digest()
    const offset = hmac[hmac.length - 1] & 0xf
    const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** TOTP_DIGITS
    return code.toString().padStart(TOTP_DIGITS, '0')
}

function cookieHeader(headers: Headers): Headers {
    const cookie = headers
        .getSetCookie()
        .map((setCookie) => setCookie.split(';')[0])
        .join('; ')
    return new Headers({ cookie })
}

/* The bootstrap path, mirroring scripts/createAdmin.ts. */
async function createAdminAccount(email: string) {
    const bootstrap = betterAuth({
        baseURL: 'http://localhost:5173',
        database: drizzleAdapter(db, { provider: 'pg', schema }),
        emailAndPassword: { enabled: true },
        plugins: [admin()],
    })
    await bootstrap.api.signUpEmail({ body: { email, password: PASSWORD, name: 'Admin' } })
}

async function signIn(email: string) {
    return auth.api.signInEmail({ body: { email, password: PASSWORD }, returnHeaders: true })
}

/* Signs in, enables 2FA and verifies the first code: what /login/setup-2fa does. */
async function enroll(email: string) {
    await createAdminAccount(email)
    const signedIn = await signIn(email)
    const headers = cookieHeader(signedIn.headers)
    const enabled = await auth.api.enableTwoFactor({ body: { password: PASSWORD }, headers })
    if (enabled.method !== 'totp') {
        throw new Error('expected a TOTP enrollment')
    }
    const verified = await auth.api.verifyTOTP({
        body: { code: totpFromUri(enabled.totpURI) },
        headers,
        returnHeaders: true,
    })
    return { enabled, sessionHeaders: cookieHeader(verified.headers) }
}

describe('needsTwoFactorSetup', () => {
    it.each([
        [{ twoFactorEnabled: false }, true],
        [{ twoFactorEnabled: null }, true],
        [{}, true],
        [{ twoFactorEnabled: true }, false],
    ])('%o needs setup: %s', (user, expected) => {
        expect(needsTwoFactorSetup(user)).toBe(expected)
    })
})

describe('admin 2FA', () => {
    /* The gate in hooks.server.ts depends on the session carrying the flag. */
    it('signs in an account with no 2FA to a session that still needs setup', async () => {
        const email = 'new@example.com'
        await createAdminAccount(email)
        const signedIn = await signIn(email)

        const session = await auth.api.getSession({ headers: cookieHeader(signedIn.headers) })

        expect(session).not.toBeNull()
        expect(needsTwoFactorSetup(session!.user)).toBe(true)
    })

    /* The cookie cache lasts 5 minutes; the session cookie verifyTOTP sets must already carry the
       flag, or the gate would keep a freshly enrolled admin out for that long. */
    it('turns 2FA on with the first code, in the session the response sets', async () => {
        const { sessionHeaders } = await enroll('enrolled@example.com')

        const session = await auth.api.getSession({ headers: sessionHeaders })

        expect(session?.user.twoFactorEnabled).toBe(true)
        expect(needsTwoFactorSetup(session!.user)).toBe(false)
    })

    it('asks an enrolled account for a code, with no session from the password alone', async () => {
        const email = 'challenged@example.com'
        await enroll(email)

        const result = await auth.api.signInEmail({ body: { email, password: PASSWORD } })

        expect(result).toMatchObject({ twoFactorRedirect: true })
        expect(result).not.toHaveProperty('user')
    })

    it('refuses a wrong first code and leaves 2FA off', async () => {
        const email = 'wrong-code@example.com'
        await createAdminAccount(email)
        const headers = cookieHeader((await signIn(email)).headers)
        await auth.api.enableTwoFactor({ body: { password: PASSWORD }, headers })

        await expect(auth.api.verifyTOTP({ body: { code: '000000' }, headers })).rejects.toThrow()

        const [row] = await db
            .select({ twoFactorEnabled: schema.user.twoFactorEnabled })
            .from(schema.user)
            .where(eq(schema.user.email, email))
        expect(row.twoFactorEnabled).toBe(false)
    })

    it('needs the password to start enrollment, so a stolen session cannot enroll', async () => {
        const email = 'stolen@example.com'
        await createAdminAccount(email)
        const headers = cookieHeader((await signIn(email)).headers)

        await expect(
            auth.api.enableTwoFactor({ body: { password: 'not-the-password' }, headers }),
        ).rejects.toThrow()
    })

    it('reset removes the enrollment, signs every session out, and sends the next sign-in to setup', async () => {
        const email = 'lost-phone@example.com'
        const { sessionHeaders } = await enroll(email)

        const reset = await resetTwoFactor(db, email)

        /* Sign-up's own session and the one verifyTOTP made. */
        expect(reset).toMatchObject({ ok: true, sessionsRevoked: 2 })
        /* The row is gone. A device holding the session still passes for up to 5 minutes on the
           signed cookie cache, which Better Auth trusts without reading the database. */
        expect(
            await auth.api.getSession({
                headers: sessionHeaders,
                query: { disableCookieCache: true },
            }),
        ).toBeNull()
        const rows = await db
            .select()
            .from(schema.twoFactor)
            .where(eq(schema.twoFactor.userId, reset.ok ? reset.userId : ''))
        expect(rows).toHaveLength(0)
        const next = await auth.api.getSession({
            headers: cookieHeader((await signIn(email)).headers),
        })
        expect(needsTwoFactorSetup(next!.user)).toBe(true)
    })

    it('reset reports an unknown address', async () => {
        expect(await resetTwoFactor(db, 'nobody@example.com')).toEqual({
            ok: false,
            reason: 'no-account',
        })
    })
})

describe('/login/setup-2fa load', () => {
    function loadWith(headers: Headers) {
        return setupPageLoad({
            request: new Request('http://localhost/login/setup-2fa', { headers }),
        } as Parameters<typeof setupPageLoad>[0])
    }

    it('sends a visitor with no session to /login', async () => {
        await expect(loadWith(new Headers())).rejects.toMatchObject({
            status: 302,
            location: '/login',
        })
    })

    it('opens for a session that still needs setup', async () => {
        const email = 'setup@example.com'
        await createAdminAccount(email)

        const data = await loadWith(cookieHeader((await signIn(email)).headers))

        expect(data).toEqual({ email })
    })

    it('sends an enrolled session on to /admin', async () => {
        const { sessionHeaders } = await enroll('done@example.com')

        await expect(loadWith(sessionHeaders)).rejects.toMatchObject({
            status: 302,
            location: '/admin',
        })
    })
})
