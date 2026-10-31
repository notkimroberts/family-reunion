import { describe, expect, it } from 'vitest'
import { isBeforeCheckinOpens } from './isBeforeCheckinOpens'

/* 11:00 AM Pacific on Saturday 2027-06-26, daylight time. */
const STARTS_AT = new Date('2027-06-26T11:00:00-07:00')

describe('isBeforeCheckinOpens', () => {
    it('is true until midnight of the first day, in the reunion zone', () => {
        expect(isBeforeCheckinOpens(STARTS_AT, new Date('2027-06-25T23:59:59-07:00'))).toBe(true)
    })

    /* 5:00 PM Pacific the day before is already the 26th in UTC. */
    it('does not open on the UTC date', () => {
        expect(isBeforeCheckinOpens(STARTS_AT, new Date('2027-06-26T00:00:00Z'))).toBe(true)
    })

    it('is false from midnight of the first day on, before the start time', () => {
        expect(isBeforeCheckinOpens(STARTS_AT, new Date('2027-06-26T00:00:00-07:00'))).toBe(false)
        expect(isBeforeCheckinOpens(STARTS_AT, new Date('2027-06-26T08:00:00-07:00'))).toBe(false)
    })

    it('stays open after the reunion', () => {
        expect(isBeforeCheckinOpens(STARTS_AT, new Date('2027-07-02T12:00:00-07:00'))).toBe(false)
    })

    it('treats no start date as open', () => {
        expect(isBeforeCheckinOpens(null)).toBe(false)
    })

    it('accepts the ISO string a page load serializes the date to', () => {
        expect(
            isBeforeCheckinOpens(STARTS_AT.toISOString(), new Date('2027-06-20T12:00:00Z')),
        ).toBe(true)
    })
})
