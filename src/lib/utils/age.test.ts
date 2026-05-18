import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAge, getAgeFromDate } from './age'

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

describe('getAgeFromDate', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(FROZEN_DATE)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('parses an ISO date string', () => {
        expect(getAgeFromDate('2000-01-15')).toBe(26)
    })

    it('accepts a Date object', () => {
        expect(getAgeFromDate(new Date('2000-01-15'))).toBe(26)
    })

    it('returns 0 for someone born today', () => {
        expect(getAgeFromDate('2026-05-17')).toBe(0)
    })

    it('subtracts one year when birthday has not yet occurred this year', () => {
        expect(getAgeFromDate('2000-12-01')).toBe(25)
    })

    it('counts birthday as reached on the exact day', () => {
        expect(getAgeFromDate('2000-05-17')).toBe(26)
    })
})
