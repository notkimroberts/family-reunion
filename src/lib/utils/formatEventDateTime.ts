/* Imported from the module rather than the constants barrel on purpose. This function is re-exported
   from $lib/utils, so a barrel import here would pull all of $lib/general/constants into the graph of
   every consumer — which immediately broke three unrelated suites that mock that barrel partially. */
import { EVENT_TIME_ZONE } from '$lib/general/constants/EVENT_TIME_ZONE'

/* Formats an instant in the reunion's timezone, labelled with the zone.

   Two things this exists to prevent, both of which already happened:

   - A timestamp rendered with no zone. `timestamp` columns without a time zone hold a UTC instant but
     carry no offset, so postgres.js parses them as server-local and the offset is lost — the admin
     history showed 4:06 AM for a change made at 9:06 PM Pacific.
   - dateStyle/timeStyle combined with timeZoneName. Intl throws a TypeError outright on that
     combination, which types cannot catch and only running the page reveals.

   A fixed zone rather than the viewer's locale, because these strings are produced during SSR too: see
   EVENT_TIME_ZONE. */
const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: EVENT_TIME_ZONE,
    timeZoneName: 'short',
})

export function formatEventDateTime(value: Date | string): string {
    return formatter.format(new Date(value))
}
