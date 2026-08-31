import { describe, expect, it } from 'vitest'
import { formatViewerDateTime } from './formatViewerDateTime'

/* The admin history showed 4:06 AM for a change made at 9:06 PM Pacific: registration_audit.created_at
   was a `timestamp` without time zone holding a UTC instant, so the offset was lost. It is timestamptz
   now, and this renders it in whatever zone the reader is in.

   Assertions are deliberately zone-independent. Pinning "9:06 PM" would pass on a Pacific laptop and
   fail in CI, which runs UTC — a test that only holds on the author's machine is worse than none. */

const NINE_OH_SIX_PM_PACIFIC = '2026-08-28T04:06:00Z'

describe('formatViewerDateTime', () => {
    /* The regression that actually shipped: Intl rejects dateStyle/timeStyle alongside timeZoneName and
       throws on construction, which the type checker cannot see. Calling it is the assertion. */
    it('does not throw on its option combination', () => {
        expect(() => formatViewerDateTime(NINE_OH_SIX_PM_PACIFIC)).not.toThrow()
    })

    /* Naming the zone is what makes a viewer-local time unambiguous when an organiser screenshots it
       for someone in another one. */
    it('names the reader’s zone', () => {
        expect(formatViewerDateTime(NINE_OH_SIX_PM_PACIFIC)).toMatch(/[A-Z]{2,5}|GMT[+-]\d/)
    })

    it('renders the date and a time of day', () => {
        const formatted = formatViewerDateTime(NINE_OH_SIX_PM_PACIFIC)
        expect(formatted).toMatch(/2026/)
        expect(formatted).toMatch(/\d{1,2}:\d{2}/)
    })

    /* Proves it reflects the actual instant rather than a fixed string: an hour later must read as an
       hour later, in whatever zone the reader happens to be in. */
    it('tracks the instant', () => {
        const earlier = formatViewerDateTime('2026-08-28T04:06:00Z')
        const later = formatViewerDateTime('2026-08-28T05:06:00Z')
        expect(earlier).not.toBe(later)
    })

    it('accepts a Date as well as a string', () => {
        const instant = new Date(NINE_OH_SIX_PM_PACIFIC)
        expect(formatViewerDateTime(instant)).toBe(formatViewerDateTime(NINE_OH_SIX_PM_PACIFIC))
    })
})
