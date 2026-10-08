import { describe, expect, it } from 'vitest'
import { isBeforeRegistrationOpens } from './isBeforeRegistrationOpens'

/* 9:00 AM Pacific on 2026-10-31, still daylight time. */
const OPENS_AT = new Date('2026-10-31T09:00:00-07:00')

describe('isBeforeRegistrationOpens', () => {
    it('is true until the opening instant', () => {
        expect(isBeforeRegistrationOpens(OPENS_AT, new Date('2026-10-31T08:59:59-07:00'))).toBe(
            true,
        )
    })

    it('is false from the opening instant on', () => {
        expect(isBeforeRegistrationOpens(OPENS_AT, OPENS_AT)).toBe(false)
        expect(isBeforeRegistrationOpens(OPENS_AT, new Date('2026-11-01T12:00:00-08:00'))).toBe(
            false,
        )
    })

    /* An event with no opening date behaves as every event did before the column existed. */
    it('treats no opening date as open now', () => {
        expect(isBeforeRegistrationOpens(null)).toBe(false)
    })

    it('accepts the ISO string a page load serializes the date to', () => {
        expect(
            isBeforeRegistrationOpens(OPENS_AT.toISOString(), new Date('2026-10-30T12:00:00Z')),
        ).toBe(true)
    })
})
