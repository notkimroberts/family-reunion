import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAge, parseBirthDate, formatBirthDate } from './age'

// Use noon local time to avoid UTC-midnight timezone boundary issues
const FROZEN_DATE = new Date('2026-05-17T12:00:00')

describe('getAge', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(FROZEN_DATE)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('calculates age from birth year only', () => {
        expect(getAge(2000)).toBe(26)
    })

    it('calculates age when birthday has already passed this year', () => {
        expect(getAge(2000, 1, 15)).toBe(26)
    })

    it('subtracts one year when birthday has not yet occurred', () => {
        expect(getAge(2000, 12, 1)).toBe(25)
    })

    it('handles null month as year-only calculation', () => {
        expect(getAge(1990, null, null)).toBe(36)
    })

    it('counts birthday as reached on the exact day', () => {
        expect(getAge(2000, 5, 17)).toBe(26)
    })

    it('returns 0 for someone born this year', () => {
        expect(getAge(2026)).toBe(0)
    })
})

describe('parseBirthDate', () => {
    it('parses a full ISO date string', () => {
        expect(parseBirthDate('2000-01-15')).toEqual({
            birthYear: 2000,
            birthMonth: 1,
            birthDay: 15,
        })
    })

    it('returns null for empty string', () => {
        expect(parseBirthDate('')).toBeNull()
    })

    it('returns null for a non-date string', () => {
        expect(parseBirthDate('not-a-date')).toBeNull()
    })
})

describe('formatBirthDate', () => {
    it('formats split integers to ISO string', () => {
        expect(formatBirthDate(2000, 1, 15)).toBe('2000-01-15')
    })

    it('zero-pads month and day', () => {
        expect(formatBirthDate(1990, 3, 5)).toBe('1990-03-05')
    })

    it('returns undefined when year is missing', () => {
        expect(formatBirthDate(null, 1, 15)).toBeUndefined()
    })

    it('returns undefined when month is missing', () => {
        expect(formatBirthDate(2000, null, 15)).toBeUndefined()
    })

    it('returns undefined when day is missing', () => {
        expect(formatBirthDate(2000, 1, null)).toBeUndefined()
    })
})
