import { describe, expect, it } from 'vitest'
import { formatUsdHeadline } from './formatUsdHeadline'

describe('formatUsdHeadline', () => {
    it('drops .00 from whole dollars', () => {
        expect(formatUsdHeadline(7500)).toBe('$75')
    })

    it('groups thousands', () => {
        expect(formatUsdHeadline(100000)).toBe('$1,000')
    })

    // Rounding a gift to the dollar would misstate what was given.
    it('keeps cents when there are any', () => {
        expect(formatUsdHeadline(2750)).toBe('$27.50')
    })

    it('handles zero', () => {
        expect(formatUsdHeadline(0)).toBe('$0')
    })
})
