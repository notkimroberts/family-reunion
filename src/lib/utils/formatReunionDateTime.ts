import { REUNION_TIME_ZONE } from '$lib/general/constants'

/* Formats a reunion datetime in the reunion's own zone, named:
     long  — "Wednesday, June 23, 2027 at 9:00 AM PDT"  (the deadline, on pages a visitor reads)
     short — "Wed, Jun 23, 2027, 9:00 AM PDT"           (the echo under a datetime-local field)

   THE ZONE IS NAMED ON PURPOSE. Without the suffix the same string means a different instant to every
   reader, and the deadline is a cutoff: someone in Mississippi reading a bare "9:00 AM" would find it
   had closed two hours before they expected.

   NOT formatViewerDateTime, which resolves to the reader's own zone. That is right for an audit trail
   ("when did this payment land, my time") and wrong for a time the organisers set once.

   ONE module owns reunion-zone formatting. DateTimeField built a second Intl.DateTimeFormat with the
   same zone and the same timeZoneName, differing only in field widths — two places to keep in step
   with the zone and with the dateStyle/timeZoneName gotcha below.

   Explicit timeZone is also what makes this safe to render during SSR: without it Intl resolves to the
   environment's zone and the server and the browser produce different strings, which Svelte does not
   reconcile on hydration.

   Spelled out as components rather than dateStyle/timeStyle: Intl throws outright if either is
   combined with timeZoneName.

   BUILT LAZILY, like formatViewerDateTime. Constructing at module load reads REUNION_TIME_ZONE as a
   side effect of importing the $lib/utils barrel, which is imported by the email templates — and two
   email suites that mock $lib/general/constants without that key died on it. Deferring also keeps the
   module tree-shakeable. */
const CLOCK_OPTIONS = {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
} as const

const DATE_OPTIONS = {
    day: 'numeric',
    year: 'numeric',
    ...CLOCK_OPTIONS,
} as const

/* `time` carries no date at all, for a list of things that all happened today: an arrival ticked at the
   door reads "9:41 AM PDT", and repeating the reunion's own date on every row of that list says nothing.
   Still zone-named, for the same reason the other two are. */
const WIDTHS = {
    long: { weekday: 'long', month: 'long', ...DATE_OPTIONS },
    short: { weekday: 'short', month: 'short', ...DATE_OPTIONS },
    time: CLOCK_OPTIONS,
} as const

type ReunionDateStyle = keyof typeof WIDTHS

const formatters = new Map<ReunionDateStyle, Intl.DateTimeFormat>()

function getFormatter(style: ReunionDateStyle): Intl.DateTimeFormat {
    let formatter = formatters.get(style)
    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-US', {
            ...WIDTHS[style],
            timeZone: REUNION_TIME_ZONE,
        })
        formatters.set(style, formatter)
    }
    return formatter
}

export function formatReunionDateTime(
    value: Date | string,
    style: ReunionDateStyle = 'long',
): string {
    return getFormatter(style).format(new Date(value))
}
