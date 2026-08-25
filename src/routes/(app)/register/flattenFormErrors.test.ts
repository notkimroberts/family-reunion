import { describe, it, expect } from 'vitest'
import { flattenFormErrors } from './flattenFormErrors'

describe('flattenFormErrors', () => {
    it('returns nothing for an empty error tree', () => {
        expect(flattenFormErrors({})).toEqual([])
        expect(flattenFormErrors(undefined)).toEqual([])
    })

    it('labels a scalar field error', () => {
        expect(flattenFormErrors({ contactEmail: ['Please enter a valid email'] })).toEqual([
            'contactEmail: Please enter a valid email',
        ])
    })

    /* The case that used to be invisible: an error on a nested field nobody renders. */
    it('labels a nested field error with its path', () => {
        expect(flattenFormErrors({ self: { tierId: ['Please select a tier'] } })).toEqual([
            'self.tierId: Please select a tier',
        ])
    })

    it('identifies which party member is at fault', () => {
        expect(flattenFormErrors({ members: [null, { name: ['Name is required'] }] })).toEqual([
            'members.1.name: Name is required',
        ])
    })

    it("attributes an array's own _errors to the array itself", () => {
        expect(flattenFormErrors({ members: { _errors: ['Invalid members data'] } })).toEqual([
            'members: Invalid members data',
        ])
    })

    it('collects several problems at once', () => {
        const result = flattenFormErrors({
            contactEmail: ['Please enter a valid email'],
            self: { addressZip: ['Please enter a valid ZIP code'] },
        })
        expect(result).toHaveLength(2)
        expect(result).toContain('contactEmail: Please enter a valid email')
        expect(result).toContain('self.addressZip: Please enter a valid ZIP code')
    })
})
