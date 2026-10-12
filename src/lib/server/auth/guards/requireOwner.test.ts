import { isRedirect } from '@sveltejs/kit'
import { describe, expect, it, vi } from 'vitest'
import { ORGANIZER_ROLE, OWNER_ROLE } from '$lib/general/constants'
import { requireOwner } from './requireOwner'

vi.mock('$lib/server/debug', () => ({ dbg: { auth: vi.fn() } }))

function makeEvent(user?: { id: string; role: string; email: string }) {
    return { locals: { user } } as unknown as Parameters<typeof requireOwner>[0]
}

const OWNER = { id: 'u1', role: OWNER_ROLE, email: 'kim@example.com' }
const ORGANIZER = { id: 'u2', role: ORGANIZER_ROLE, email: 'aunt@example.com' }

function catchRedirect(fn: () => unknown): unknown {
    try {
        fn()
    } catch (e) {
        return e
    }
    return undefined
}

describe('requireOwner', () => {
    it('lets the owner through', () => {
        expect(requireOwner(makeEvent(OWNER))).toBe(OWNER)
    })

    /* /admin, not /login. The caller IS signed in and IS an organizer, so a login form would be a lie
       about what went wrong. */
    it('sends an organizer back to /admin rather than to /login', () => {
        const caught = catchRedirect(() => requireOwner(makeEvent(ORGANIZER)))

        expect(isRedirect(caught)).toBe(true)
        expect((caught as { location: string }).location).toBe('/admin')
    })

    /* requireAdmin runs FIRST, so a signed-out request gets the sign-in redirect — being told "wrong
       person" when you are nobody yet is useless. */
    it('redirects a signed-out request to /login, not /admin', () => {
        const caught = catchRedirect(() => requireOwner(makeEvent(undefined)))

        expect((caught as { location: string }).location).toBe('/login')
    })

    it('redirects a non-admin role to /', () => {
        const caught = catchRedirect(() =>
            requireOwner(makeEvent({ id: 'u3', role: 'user', email: 'kim@example.com' })),
        )

        expect((caught as { location: string }).location).toBe('/')
    })
})
