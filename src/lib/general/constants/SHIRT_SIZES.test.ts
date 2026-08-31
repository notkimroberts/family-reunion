import { describe, expect, it } from 'vitest'
import { ADULT_SHIRT_SIZES } from './ADULT_SHIRT_SIZES'
import { SHIRT_SIZES } from './SHIRT_SIZES'
import { YOUTH_SHIRT_SIZES } from './YOUTH_SHIRT_SIZES'

describe('SHIRT_SIZES', () => {
    /* The admin order sheet sorts sizes by their index in this array, so the grouping is what makes
       the sheet read youth-then-adult rather than interleaved. */
    it('lists every youth size before every adult size', () => {
        const lastYouth = Math.max(...YOUTH_SHIRT_SIZES.map((size) => SHIRT_SIZES.indexOf(size)))
        const firstAdult = Math.min(...ADULT_SHIRT_SIZES.map((size) => SHIRT_SIZES.indexOf(size)))

        expect(lastYouth).toBeLessThan(firstAdult)
    })

    /* A duplicate would render twice in the picker and split one size across two rows of the order
       sheet — the sizes are stored as free text, so nothing downstream would merge them back. */
    it('has no duplicates', () => {
        expect(new Set(SHIRT_SIZES).size).toBe(SHIRT_SIZES.length)
    })
})
