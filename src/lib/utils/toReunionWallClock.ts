import { fromDate } from '@internationalized/date'
import { REUNION_TIME_ZONE } from '$lib/general/constants'

/* The inverse of parseReunionWallClock: a stored instant back to the "YYYY-MM-DDTHH:mm" digits an
   <input type="datetime-local"> expects, expressed in the reunion's zone.

   Needed because the box has to show the organiser the same time the public pages do. Reading the
   instant back with toISOString() would put UTC digits in the field, so re-saving an untouched form
   would shift the date seven or eight hours every time it was opened.

   `fromDate(...).toString()` yields '2027-06-23T09:00:00-07:00[America/Los_Angeles]'; the first 16
   characters are exactly the wall clock the input wants. */
export function toReunionWallClock(value: Date | string | null): string {
    if (!value) {
        return ''
    }
    return fromDate(new Date(value), REUNION_TIME_ZONE).toString().slice(0, 16)
}
