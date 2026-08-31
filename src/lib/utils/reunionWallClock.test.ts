import { describe, expect, it } from 'vitest'
import { formatReunionDateTime } from './formatReunionDateTime'
import { parseReunionWallClock } from './parseReunionWallClock'
import { toReunionWallClock } from './toReunionWallClock'

/* The three halves of one contract: an organiser types wall-clock digits, they are stored as the
   instant those digits name IN THE REUNION'S ZONE, and every screen reads them back as the same
   digits. The bug this replaced read them as UTC, so a 9:00 AM deadline closed registration at 2:00 AM
   Pacific and both admin screens agreed with each other while disagreeing with the family. */
describe('reunion wall-clock times', () => {
    /* Summer is PDT (-7). Asserted as an absolute instant so the test cannot pass merely because the
       machine running it happens to sit on the west coast. */
    it('reads a summer time as PDT', () => {
        expect(parseReunionWallClock('2027-06-23T09:00')?.toISOString()).toBe(
            '2027-06-23T16:00:00.000Z',
        )
    })

    /* Winter is PST (-8). The offset is not a constant, which is why this goes through the zone's
       real rules rather than a fixed number. */
    it('reads a winter time as PST', () => {
        expect(parseReunionWallClock('2027-01-15T09:00')?.toISOString()).toBe(
            '2027-01-15T17:00:00.000Z',
        )
    })

    it('accepts the seconds a datetime-local field may include', () => {
        expect(parseReunionWallClock('2027-06-23T09:00:00')?.toISOString()).toBe(
            '2027-06-23T16:00:00.000Z',
        )
    })

    /* Undefined, not a silent Invalid Date: the settings actions turn this into a fail(400), so a
       typo cannot overwrite a date that was already right. */
    it.each(['', 'next tuesday', '2027-13-45T99:99'])('refuses %s', (raw) => {
        expect(parseReunionWallClock(raw)).toBeUndefined()
    })

    /* The round trip the settings page depends on: opening the form and saving it unchanged must not
       move the date. Reading the instant back in any other zone would shift it every time. */
    it.each(['2027-06-23T09:00', '2027-01-15T09:00', '2027-07-23T16:00'])(
        'round-trips %s unchanged',
        (typed) => {
            expect(toReunionWallClock(parseReunionWallClock(typed)!)).toBe(typed)
        },
    )

    it('renders nothing for a cleared date', () => {
        expect(toReunionWallClock(null)).toBe('')
    })

    /* What the family reads. The zone is named because a bare "9:00 AM" means a different instant to
       every reader, and this one is a cutoff. */
    it('states the deadline in the reunion zone, named', () => {
        expect(formatReunionDateTime(parseReunionWallClock('2027-06-23T09:00')!)).toBe(
            'Wednesday, June 23, 2027 at 9:00 AM PDT',
        )
    })

    it('says PST for a winter date', () => {
        expect(formatReunionDateTime(parseReunionWallClock('2027-01-15T09:00')!)).toContain('PST')
    })
})
