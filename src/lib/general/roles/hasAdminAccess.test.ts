import { describe, expect, it } from 'vitest'
import { ORGANIZER_ROLE, OWNER_ROLE } from '$lib/general/constants'
import { hasAdminAccess } from './hasAdminAccess'

describe('hasAdminAccess', () => {
    it.each([
        [ORGANIZER_ROLE, true],
        [OWNER_ROLE, true],
        ['user', false],
        ['admin,owner', false],
        [null, false],
        [undefined, false],
    ])('%s → %s', (role, expected) => {
        expect(hasAdminAccess(role)).toBe(expected)
    })
})
