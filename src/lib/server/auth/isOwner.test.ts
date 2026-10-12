import { describe, expect, it } from 'vitest'
import { ORGANIZER_ROLE, OWNER_ROLE } from '$lib/general/constants'
import { isOwner } from './isOwner'

describe('isOwner', () => {
    it('accepts the owner role', () => {
        expect(isOwner({ role: OWNER_ROLE })).toBe(true)
    })

    it.each([[{ role: ORGANIZER_ROLE }], [{ role: null }], [{}], [null], [undefined]])(
        'rejects %o',
        (user) => {
            expect(isOwner(user)).toBe(false)
        },
    )
})
