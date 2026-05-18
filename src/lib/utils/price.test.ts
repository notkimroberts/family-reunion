import { describe, expect, it } from 'vitest'
import { formatPrice } from './price'

describe('formatPrice', () => {
    it('converts cents to decimal string', () => {
        expect(formatPrice(10000)).toBe('100.00')
    })

    it('handles zero', () => {
        expect(formatPrice(0)).toBe('0.00')
    })

    it('handles odd cents', () => {
        expect(formatPrice(199)).toBe('1.99')
    })

    it('handles large values', () => {
        expect(formatPrice(9999999)).toBe('99999.99')
    })

    it('handles single cent', () => {
        expect(formatPrice(1)).toBe('0.01')
    })
})
