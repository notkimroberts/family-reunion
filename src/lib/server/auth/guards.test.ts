import { isRedirect } from '@sveltejs/kit'
import { describe, expect, it } from 'vitest'
import { requireAdmin, requireAuth } from './guards'

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
