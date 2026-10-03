import { REUNION_TIME_ZONE } from '$lib/general/constants'

/* Built on first use, not at module load: the email templates import the $lib/utils barrel, and
   suites that mock $lib/general/constants without REUNION_TIME_ZONE die on a load-time read — see
   formatReunionDateTime. */
let dateRangeFormatter: Intl.DateTimeFormat | undefined

/* Formats a date range, collapsing shared month/year the way native Intl range formatting does
   (e.g. "July 23 – 25, 2027", "July 23 – August 2, 2027", "July 23, 2027" for a single day).

   In the reunion's zone, always. Without it the date is whatever day the instant falls on where the
   code runs — UTC on Railway, so a 5 PM Pacific start was printed as the next day in every email —
   and the server and the browser render different strings for the same page. */
export function formatDateRange(start: Date, end: Date): string {
    dateRangeFormatter ??= new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: REUNION_TIME_ZONE,
    })
    return dateRangeFormatter.formatRange(start, end)
}
