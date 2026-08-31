import { describe, it, expect } from 'vitest'
import { SHIRT_SIZES } from '$lib/general/constants'
import { shirtSizeOptions } from './shirtSizeOptions'

/* A select that silently drops the stored value is worse than one with an odd extra option: it shows
   the wrong size as selected, and the organiser reading the shirt order has no way to know. */
describe('shirtSizeOptions', () => {
    it('offers the canonical list when nothing is recorded', () => {
        expect(shirtSizeOptions('')).toEqual([...SHIRT_SIZES])
    })

    it.each(SHIRT_SIZES)('offers the canonical list for the recognised size %s', (size) => {
        expect(shirtSizeOptions(size)).toEqual([...SHIRT_SIZES])
    })

    /* The case the function exists for. A youth size, or anything from a list that has since changed,
       must stay visible and selectable. */
    it('keeps a value that is not on the list', () => {
        expect(shirtSizeOptions('4XL')).toContain('4XL')
    })

    it('puts the unrecognised value last, where the order sheet also sorts it', () => {
        const options = shirtSizeOptions('4XL')
        expect(options[options.length - 1]).toBe('4XL')
        expect(options.slice(0, -1)).toEqual([...SHIRT_SIZES])
    })

    it('does not duplicate a recognised size', () => {
        const options = shirtSizeOptions('M')
        expect(options.filter((size) => size === 'M')).toHaveLength(1)
    })

    /* Whitespace is not a size. A padded value would otherwise be appended as a second, invisible
       option beside the real one. */
    it('treats a whitespace-only value as nothing recorded', () => {
        expect(shirtSizeOptions('   ')).toEqual([...SHIRT_SIZES])
    })

    it('trims a padded recognised size rather than appending it', () => {
        expect(shirtSizeOptions(' L ')).toEqual([...SHIRT_SIZES])
    })

    it('never returns fewer options than the canonical list', () => {
        for (const value of ['', 'M', '4XL', 'toddler 2T', '   ']) {
            expect(shirtSizeOptions(value).length).toBeGreaterThanOrEqual(SHIRT_SIZES.length)
        }
    })
})
