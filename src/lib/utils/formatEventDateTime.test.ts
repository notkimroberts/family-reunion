import { describe, it, expect } from 'vitest'
import { formatEventDateTime } from './formatEventDateTime'

/* The admin history rendered "Aug 28, 2026 at 4:06 AM" for a change an organiser made at 9:06 PM
   Pacific on the 27th — the stored UTC instant printed as though it were local time.

   The first attempt at the fix threw at runtime instead, because Intl rejects dateStyle/timeStyle
   alongside timeZoneName. Neither failure is visible to the type checker, so both are pinned here. */

const NINE_OH_SIX_PM_PACIFIC = '2026-08-28T04:06:00Z'

describe('formatEventDateTime', () => {
    it('renders a UTC instant in the reunion timezone, not as raw UTC', () => {
        const formatted = formatEventDateTime(NINE_OH_SIX_PM_PACIFIC)

        expect(formatted).toContain('9:06 PM')
        expect(formatted).toContain('Aug 27, 2026')
        /* The exact wrong output that was on screen. */
        expect(formatted).not.toContain('4:06 AM')
    })

    it('names the zone, so a reader in another one is not guessing', () => {
        expect(formatEventDateTime(NINE_OH_SIX_PM_PACIFIC)).toMatch(/P[DS]T/)
    })

    /* Constructing the formatter with an illegal option combination throws on first use. Calling it at
       all is the assertion. */
    it('does not throw on a legal option combination', () => {
        expect(() => formatEventDateTime(new Date())).not.toThrow()
    })

    /* Standard time, to be sure the zone is a real IANA zone and not a fixed offset. */
    it('follows daylight saving', () => {
        expect(formatEventDateTime('2026-01-15T05:06:00Z')).toContain('PST')
        expect(formatEventDateTime('2026-08-15T04:06:00Z')).toContain('PDT')
    })
})
