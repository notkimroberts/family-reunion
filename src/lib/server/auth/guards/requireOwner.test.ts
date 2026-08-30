import { isRedirect } from '@sveltejs/kit'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockEnv, mockReportError } = vi.hoisted(() => ({
    mockEnv: {} as { OWNER_EMAIL?: string },
    mockReportError: vi.fn(),
}))

vi.mock('$env/dynamic/private', () => ({ env: mockEnv }))
vi.mock('$lib/server/debug', () => ({ dbg: { auth: vi.fn() } }))
vi.mock('$lib/server/reportError', () => ({ reportError: mockReportError }))

/* Re-imported per test, not once at the top. "Reported once" is held in a module-level flag, so a
   shared import would let the first test that trips it make every later assertion about reporting
   vacuous — the flag survives vi.clearAllMocks(). A fresh module per test IS the per-process semantic
   being tested. */
async function loadRequireOwner() {
    vi.resetModules()
    return (await import('./requireOwner')).requireOwner
}

type Guard = Awaited<ReturnType<typeof loadRequireOwner>>

function makeEvent(user?: { id: string; role: string; email: string }) {
    return { locals: { user } } as unknown as Parameters<Guard>[0]
}

const OWNER = { id: 'u1', role: 'admin', email: 'kim@example.com' }
const OTHER_ADMIN = { id: 'u2', role: 'admin', email: 'aunt@example.com' }

function catchRedirect(fn: () => unknown): unknown {
    try {
        fn()
    } catch (e) {
        return e
    }
    return undefined
}

beforeEach(() => {
    vi.clearAllMocks()
    delete mockEnv.OWNER_EMAIL
})

describe('requireOwner', () => {
    it('lets the configured owner through', async () => {
        mockEnv.OWNER_EMAIL = 'kim@example.com'
        const requireOwner = await loadRequireOwner()

        expect(requireOwner(makeEvent(OWNER))).toBe(OWNER)
    })

    /* /admin, not /login. The caller IS signed in and IS an admin, so a login form would be a lie about
       what went wrong. */
    it('sends another admin back to /admin rather than to /login', async () => {
        mockEnv.OWNER_EMAIL = 'kim@example.com'
        const requireOwner = await loadRequireOwner()

        const caught = catchRedirect(() => requireOwner(makeEvent(OTHER_ADMIN)))

        expect(isRedirect(caught)).toBe(true)
        expect((caught as { location: string }).location).toBe('/admin')
    })

    /* requireAdmin runs FIRST, so a signed-out request gets the sign-in redirect — being told "wrong
       person" when you are nobody yet is useless. */
    it('redirects a signed-out request to /login, not /admin', async () => {
        mockEnv.OWNER_EMAIL = 'kim@example.com'
        const requireOwner = await loadRequireOwner()

        const caught = catchRedirect(() => requireOwner(makeEvent(undefined)))

        expect((caught as { location: string }).location).toBe('/login')
    })

    /* A non-admin never reaches the identity check: requireAdmin bounces them to '/'. */
    it('redirects a non-admin to / even when their email matches', async () => {
        mockEnv.OWNER_EMAIL = 'kim@example.com'
        const requireOwner = await loadRequireOwner()

        const caught = catchRedirect(() =>
            requireOwner(makeEvent({ id: 'u3', role: 'user', email: 'kim@example.com' })),
        )

        expect((caught as { location: string }).location).toBe('/')
    })

    /* The deliberate fail-open, and the reason it is safe: role 'admin' is still required, so the
       degraded state is the old behaviour rather than an open door. */
    it('lets any admin through when OWNER_EMAIL is unset', async () => {
        const requireOwner = await loadRequireOwner()

        expect(requireOwner(makeEvent(OTHER_ADMIN))).toBe(OTHER_ADMIN)
    })

    it('reports the missing configuration so an open Setup is never silent', async () => {
        const requireOwner = await loadRequireOwner()

        requireOwner(makeEvent(OTHER_ADMIN))

        expect(mockReportError).toHaveBeenCalledOnce()
    })

    /* Every Setup load and action calls this, so reporting per request would bury Sentry. */
    it('reports the missing configuration only once per process', async () => {
        const requireOwner = await loadRequireOwner()

        requireOwner(makeEvent(OTHER_ADMIN))
        requireOwner(makeEvent(OTHER_ADMIN))
        requireOwner(makeEvent(OWNER))

        expect(mockReportError).toHaveBeenCalledOnce()
    })
})
