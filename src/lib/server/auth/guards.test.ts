import { isRedirect } from '@sveltejs/kit'
import { describe, expect, it } from 'vitest'
import { isPublicPath, requireAdmin, requireAuth } from './guards'

type MockEvent = { locals: { user?: unknown } }

function makeEvent(user?: unknown): MockEvent {
    return { locals: { user } }
}

function catchRedirect(fn: () => unknown): unknown {
    try {
        fn()
    } catch (e) {
        return e
    }
    return undefined
}

describe('requireAuth', () => {
    it('returns the user when authenticated', () => {
        const user = { id: '1', role: 'user' }
        expect(requireAuth(makeEvent(user) as never)).toBe(user)
    })

    it('throws a redirect to /login when no user', () => {
        const caught = catchRedirect(() => requireAuth(makeEvent() as never))
        expect(isRedirect(caught)).toBe(true)
        expect((caught as { location: string }).location).toBe('/login')
    })

    it('redirect status is 302', () => {
        const caught = catchRedirect(() => requireAuth(makeEvent() as never))
        expect((caught as { status: number }).status).toBe(302)
    })
})

describe('requireAdmin', () => {
    it('returns the user when role is admin', () => {
        const user = { id: '1', role: 'admin' }
        expect(requireAdmin(makeEvent(user) as never)).toBe(user)
    })

    it('throws a redirect to / when user is not admin', () => {
        const user = { id: '1', role: 'user' }
        const caught = catchRedirect(() => requireAdmin(makeEvent(user) as never))
        expect(isRedirect(caught)).toBe(true)
        expect((caught as { location: string }).location).toBe('/')
    })

    it('throws a redirect to /login when unauthenticated', () => {
        const caught = catchRedirect(() => requireAdmin(makeEvent() as never))
        expect(isRedirect(caught)).toBe(true)
        expect((caught as { location: string }).location).toBe('/login')
    })
})

describe('isPublicPath', () => {
    /* Registration funnel — must stay reachable with no session. */
    it.each(['/', '/register', '/register/manage', '/register/recover'])(
        'allows %s',
        (pathname) => {
            expect(isPublicPath(pathname)).toBe(true)
        },
    )

    /* Locked for launch: admin-only. */
    it.each([
        '/family-tree',
        '/family-tree/abc-123',
        '/gallery',
        '/shop',
        '/program',
        '/changelog',
        '/admin',
        '/admin/registrations',
    ])('blocks %s', (pathname) => {
        expect(isPublicPath(pathname)).toBe(false)
    })

    /* A public prefix must not leak to a path that merely starts with the same letters. */
    it.each(['/registerfoo', '/registration', '/register-now'])(
        'does not treat %s as public',
        (pathname) => {
            expect(isPublicPath(pathname)).toBe(false)
        },
    )
})
