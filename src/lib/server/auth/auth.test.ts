import { getIP } from '@better-auth/core/utils/ip'
import { describe, expect, it, vi } from 'vitest'

/* Better Auth is constructed lazily against a real DB adapter, so this asserts the options
   object rather than booting the instance. */
vi.mock('$lib/server/db', () => ({ getDb: () => ({}) }))
vi.mock('$lib/server/db/schema', () => ({}))
vi.mock('$lib/server/debug', () => ({ dbg: { auth: vi.fn() } }))
vi.mock('$env/dynamic/private', () => ({ env: { BETTER_AUTH_URL: 'http://localhost:5173' } }))
vi.mock('$app/server', () => ({ getRequestEvent: () => ({}) }))

const { auth } = await import('./index')

describe('better-auth configuration', () => {
    /* Regression test for a live production hole. Better Auth exposes
       POST /api/auth/sign-up/email whenever email+password is enabled, and its handler is
       mounted ahead of SvelteKit routing — so there is no route file to guard and the (app)
       layout never sees the request. With sign-up open, anyone could mint a role='user'
       account, satisfy a presence-only layout check, and read every page behind the
       login. The login page states the intent: "Admin access only." */
    it('does not allow public sign-up', () => {
        expect(auth.options.emailAndPassword?.disableSignUp).toBe(true)
    })

    it('still allows email + password sign-in', () => {
        expect(auth.options.emailAndPassword?.enabled).toBe(true)
    })

    /* Railway's edge sets X-Real-IP to the client. X-Forwarded-For can hold several hops (a
       corporate proxy appends one), and Better Auth refuses a multi-entry XFF without
       trustedProxies — every sign-in then shares one rate-limit bucket, so three attempts in
       10s by anyone lock every admin out of sign-in. */
    it('reads the client IP from X-Real-IP', () => {
        const request = new Request('http://localhost:5173/api/auth/sign-in/email', {
            headers: {
                'x-real-ip': '203.0.113.7',
                'x-forwarded-for': '198.51.100.1, 203.0.113.7',
            },
        })

        expect(getIP(request, auth.options)).toBe('203.0.113.7')
    })
})
