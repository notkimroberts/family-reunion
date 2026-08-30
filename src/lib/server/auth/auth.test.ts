import { describe, it, expect, vi } from 'vitest'

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
})
