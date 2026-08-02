import { describe, expect, it } from 'vitest'
import { formatPhoneInput } from './formatPhoneInput'

describe('formatPhoneInput', () => {
    it('returns empty string for no input', () => {
        expect(formatPhoneInput('')).toBe('')
    })

    it('formats partial area code', () => {
        expect(formatPhoneInput('555')).toBe('(555')
    })

    it('formats area code plus partial exchange', () => {
        expect(formatPhoneInput('5551')).toBe('(555) 1')
    })

    it('formats a full number', () => {
        expect(formatPhoneInput('5555551234')).toBe('(555) 555-1234')
    })

    it('strips non-digit characters before formatting', () => {
        expect(formatPhoneInput('(555) 555-1234')).toBe('(555) 555-1234')
    })

    it('truncates beyond 10 digits', () => {
        expect(formatPhoneInput('15555551234999')).toBe('(155) 555-5123')
    })
})
