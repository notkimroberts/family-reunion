import { describe, expect, it } from 'vitest'
import { isValidPhone } from './isValidPhone'

describe('isValidPhone', () => {
    it('accepts plain digits', () => {
        expect(isValidPhone('5555555555')).toBe(true)
    })

    it('accepts common US formatting', () => {
        expect(isValidPhone('(555) 555-5555')).toBe(true)
    })

    it('accepts international format with leading +', () => {
        expect(isValidPhone('+1 555-555-5555')).toBe(true)
    })

    it('rejects letters', () => {
        expect(isValidPhone('555-CALL-NOW')).toBe(false)
    })

    it('rejects a bare 7-digit local number without an area code', () => {
        expect(isValidPhone('555-1234')).toBe(false)
    })

    it('rejects too short input', () => {
        expect(isValidPhone('12345')).toBe(false)
    })

    it('rejects too long input', () => {
        expect(isValidPhone('1'.repeat(21))).toBe(false)
    })

    it('rejects empty string', () => {
        expect(isValidPhone('')).toBe(false)
    })
})
