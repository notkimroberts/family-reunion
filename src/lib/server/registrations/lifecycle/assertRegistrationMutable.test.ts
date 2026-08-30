import { describe, it, expect } from 'vitest'
import { assertRegistrationMutable } from './assertRegistrationMutable'

/* One rule, seven former call sites: a cancelled registration cannot be changed. */
describe('assertRegistrationMutable', () => {
    it.each(['pending', 'paid', 'waived'] as const)('allows a %s registration', (status) => {
        expect(() => assertRegistrationMutable(status, 'nope')).not.toThrow()
    })

    it('refuses a refunded registration', () => {
        expect(() => assertRegistrationMutable('refunded', 'nope')).toThrow()
    })

    /* The message belongs to the caller: what an organiser should do next differs between adding
       someone and renaming the contact, and a single generic 409 would lose that. */
    it('raises a 409 carrying the caller’s own message', () => {
        expect(() =>
            assertRegistrationMutable('refunded', 'Cannot add members to a cancelled registration'),
        ).toThrowError(
            expect.objectContaining({
                status: 409,
                body: { message: 'Cannot add members to a cancelled registration' },
            }),
        )
    })
})
