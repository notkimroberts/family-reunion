import { describe, expect, it } from 'vitest'
import { isValidZip } from './isValidZip'

describe('isValidZip', () => {
    it('accepts a 5-digit ZIP', () => {
        expect(isValidZip('62704')).toBe(true)
    })

    it('accepts a ZIP+4', () => {
        expect(isValidZip('62704-1234')).toBe(true)
    })

    it('accepts input with surrounding whitespace', () => {
        expect(isValidZip(' 62704 ')).toBe(true)
    })

    it('rejects too few digits', () => {
        expect(isValidZip('6270')).toBe(false)
    })

    it('rejects too many digits', () => {
        expect(isValidZip('627045')).toBe(false)
    })

    it('rejects letters', () => {
        expect(isValidZip('ABCDE')).toBe(false)
    })

    it('rejects a malformed ZIP+4', () => {
        expect(isValidZip('62704-12')).toBe(false)
    })

    it('rejects empty string', () => {
        expect(isValidZip('')).toBe(false)
    })
})
