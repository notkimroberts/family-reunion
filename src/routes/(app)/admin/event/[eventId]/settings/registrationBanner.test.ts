import { describe, expect, it } from 'vitest'
import { registrationBanner } from './registrationBanner'

const OPENS_AT = new Date('2026-10-31T09:00:00-07:00')
const CLOSES_AT = new Date('2027-06-23T09:00:00-07:00')

describe('registrationBanner', () => {
    it('names the opening moment, in the reunion zone, while scheduled', () => {
        const banner = registrationBanner('scheduled', OPENS_AT, CLOSES_AT)

        /* The joiner between date and clock is the runtime's ICU ("at" or ","), so not pinned. */
        expect(banner.headline).toMatch(/^Opens Sat, Oct 31, 2026.+9:00 AM PDT$/)
        expect(banner.note).toMatch(/Closes Wed, Jun 23, 2027.+9:00 AM PDT\.$/)
    })

    it('says when an open year has no closing date', () => {
        expect(registrationBanner('open', null, null).note).toContain('No closing date.')
    })

    it('says the status still reads Open once the closing date passes', () => {
        expect(registrationBanner('closedByDate', OPENS_AT, CLOSES_AT).note).toContain(
            'The status still says Open',
        )
    })
})
