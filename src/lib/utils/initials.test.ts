import { describe, expect, it } from 'vitest'
import { getInitials } from './initials'

describe('getInitials', () => {
    it('extracts initials from full name', () => {
        expect(getInitials('John Doe')).toBe('JD')
    })

    it('handles single name', () => {
        expect(getInitials('John')).toBe('J')
    })

    it('handles three names', () => {
        expect(getInitials('Mary Jo Smith')).toBe('MJS')
    })

    it('uppercases result', () => {
        expect(getInitials('john doe')).toBe('JD')
    })

    it('returns empty string for empty input', () => {
        expect(getInitials('')).toBe('')
    })

    it('handles extra spaces between words', () => {
        expect(getInitials('John  Doe')).toBe('JD')
    })
})
