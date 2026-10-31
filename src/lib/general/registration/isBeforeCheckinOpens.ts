import { fromDate, toCalendarDate } from '@internationalized/date'
import { REUNION_TIME_ZONE } from '$lib/general/constants'

/* Whether it is still before the reunion's first day, when nobody can have arrived yet.

   Opens at midnight of the start date in the REUNION's zone, not at the start time: the desk opens
   before the program does, and the runtime's zone (UTC on Railway) would open it at 5:00 PM Pacific the
   day before. No closing side — arrivals are still recorded the day after, from memory.

   Null means no start date was set, which is open: a year with no date must not lock the door on the
   day because the owner forgot a field. */
export function isBeforeCheckinOpens(
    startDate: Date | string | null,
    at: Date | number = Date.now(),
): boolean {
    if (startDate === null) {
        return false
    }
    const opensAt = toCalendarDate(fromDate(new Date(startDate), REUNION_TIME_ZONE)).toDate(
        REUNION_TIME_ZONE,
    )
    return new Date(at).getTime() < opensAt.getTime()
}
