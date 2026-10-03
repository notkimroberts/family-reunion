import { describe, expect, it } from 'vitest'
import { formatDateRange } from './formatDateRange'

/* ICU puts thin and narrow no-break spaces around the range dash; compare on plain spaces. */
function plain(text: string): string {
    return text.replace(/\s/g, ' ')
}

describe('formatDateRange', () => {
    /* 9 PM Pacific on the 25th is 04:00 UTC on the 26th. Formatted in the runtime's zone on a UTC
       server — Railway — that read "July 23 – 26". */
    it('reads the dates in the reunion time zone, not the runtime one', () => {
        expect(
            plain(
                formatDateRange(
                    new Date('2027-07-23T16:00:00-07:00'),
                    new Date('2027-07-25T21:00:00-07:00'),
                ),
            ),
        ).toBe('July 23 – 25, 2027')
    })

    it('collapses a single day to one date', () => {
        const day = new Date('2027-07-23T18:00:00-07:00')
        expect(plain(formatDateRange(day, day))).toBe('July 23, 2027')
    })

    it('names both months when the range crosses one', () => {
        expect(
            plain(
                formatDateRange(
                    new Date('2027-07-30T10:00:00-07:00'),
                    new Date('2027-08-01T12:00:00-07:00'),
                ),
            ),
        ).toBe('July 30 – August 1, 2027')
    })
})
