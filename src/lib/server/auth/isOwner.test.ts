import { describe, it, expect } from 'vitest'
import { isOwner } from './isOwner'

const OWNER = { email: 'kim@example.com' }
const OTHER = { email: 'aunt@example.com' }

describe('isOwner', () => {
    it('accepts the configured owner', () => {
        expect(isOwner(OWNER, 'kim@example.com')).toBe(true)
    })

    it('rejects another admin', () => {
        expect(isOwner(OTHER, 'kim@example.com')).toBe(false)
    })

    /* Email is case- and whitespace-insensitive in practice: a Railway variable pasted with a trailing
       space, or an address typed with a capital, must not silently lock the owner out. */
    it.each([
        ['a capitalised stored address', { email: 'Kim@Example.com' }, 'kim@example.com'],
        ['a capitalised configured address', OWNER, 'KIM@EXAMPLE.COM'],
        ['a padded configured address', OWNER, '  kim@example.com  '],
        ['a padded stored address', { email: ' kim@example.com' }, 'kim@example.com'],
    ])('matches despite %s', (_label, user, configured) => {
        expect(isOwner(user, configured)).toBe(true)
    })

    /* The deliberate fail-open. The degraded state is today's behaviour — any admin — because the
       group layout still requires role 'admin' before this is ever consulted. Failing closed would let
       one forgotten Railway variable lock the owner out of pricing days before a launch. */
    it.each([
        ['undefined', undefined],
        ['empty', ''],
        ['whitespace only', '   '],
    ])('lets any admin through when OWNER_EMAIL is %s', (_label, configured) => {
        expect(isOwner(OTHER, configured)).toBe(true)
    })

    /* Never the other direction: with an owner configured, a request carrying no user is not the
       owner. requireAdmin runs first and would already have redirected, so this only pins that
       isOwner does not itself invent access. */
    it.each([
        ['a null user', null],
        ['an undefined user', undefined],
        ['a user with no email', {}],
        ['a user with a null email', { email: null }],
    ])('rejects %s when an owner is configured', (_label, user) => {
        expect(isOwner(user, 'kim@example.com')).toBe(false)
    })
})
