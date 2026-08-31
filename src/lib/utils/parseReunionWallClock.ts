import { parseDateTime, toZoned } from '@internationalized/date'
import { REUNION_TIME_ZONE } from '$lib/general/constants'

/* Reads the wall-clock string a <input type="datetime-local"> posts ("2027-06-23T09:00") as a time in
   the REUNION's zone, and returns the instant it names.

   THE BUG THIS FIXES. datetime-local posts bare digits with no offset, and `new Date(digits)` reads
   them in whatever zone the runtime is in — UTC on Railway. So an organiser typing 9:00 AM stored
   09:00 UTC, and registration actually closed at 2:00 AM Pacific: seven hours before the deadline
   everyone had been shown. Nothing surfaced it, because the settings page echoed the value back in UTC
   too, so both screens agreed with each other and neither agreed with the family.

   Via @internationalized/date rather than an offset table because DST is not a constant: the same
   wall-clock hour is -7 in June and -8 in January, and `toZoned` resolves it against the zone's real
   rules at that date. It also settles the two dates a year that are ambiguous or do not exist at all —
   the hour skipped in spring, the hour repeated in autumn — rather than producing a silently wrong
   instant.

   Returns undefined for anything unparseable, so callers refuse the save instead of writing null over
   a date that was already correct. */
export function parseReunionWallClock(value: string): Date | undefined {
    try {
        return toZoned(parseDateTime(value.trim()), REUNION_TIME_ZONE).toDate()
    } catch {
        return undefined
    }
}
