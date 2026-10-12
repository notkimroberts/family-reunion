import { describe, expect, it } from 'vitest'
import { sessionLocals } from './sessionLocals'

const NOW = new Date('2026-10-12T00:00:00Z')

const devAdmin = {
    id: 'dev-admin',
    name: 'Dev Admin',
    email: 'admin@localhost',
    emailVerified: true,
    role: 'admin',
    createdAt: NOW,
    updatedAt: NOW,
}

function signedIn(twoFactorEnabled: boolean | null) {
    return {
        user: { ...devAdmin, id: 'real-admin', email: 'owner@example.com', twoFactorEnabled },
        session: {
            id: 'session-id',
            userId: 'real-admin',
            expiresAt: NOW,
            token: 'token',
            createdAt: NOW,
            updatedAt: NOW,
        },
    }
}

/* The whole 2FA requirement rests on this: every guard reads locals.user, so an account that has
   not enrolled must arrive as signed out. */
describe('sessionLocals', () => {
    it('admits an enrolled session', () => {
        const session = signedIn(true)

        expect(sessionLocals(session, null)).toEqual(session)
    })

    it.each([false, null])('treats a session with twoFactorEnabled=%s as signed out', (enabled) => {
        expect(sessionLocals(signedIn(enabled), null)).toEqual({ user: null, session: null })
    })

    it('does not swap a session awaiting setup for the dev admin', () => {
        expect(sessionLocals(signedIn(false), devAdmin)).toEqual({ user: null, session: null })
    })

    it('uses the fallback only when there is no session at all', () => {
        expect(sessionLocals(null, devAdmin)).toEqual({ user: devAdmin, session: null })
        expect(sessionLocals(null, null)).toEqual({ user: null, session: null })
    })
})
