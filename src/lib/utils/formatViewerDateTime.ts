/* Formats an instant in the READER's own timezone and locale, labelled with the zone.

   MUST be called from the browser, not during SSR. With no timeZone option Intl resolves to the
   environment's zone, and on Railway that is Node running in UTC — a server-rendered string would
   silently carry UTC and Svelte does not recompute template text on hydration, so the wrong time would
   simply stay on screen. Callers format inside an $effect, which never runs on the server. See
   RegistrationHistory.

   The formatter is built lazily rather than at module load for the same reason: constructing it while
   the module is first evaluated on the server would resolve the zone there.

   Spelled out as components rather than dateStyle/timeStyle, because Intl throws a TypeError outright
   if either of those is combined with timeZoneName — a failure types cannot catch and only running the
   page reveals. */
let formatter: Intl.DateTimeFormat | undefined

function getFormatter(): Intl.DateTimeFormat {
    formatter ??= new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
    })
    return formatter
}

export function formatViewerDateTime(value: Date | string): string {
    return getFormatter().format(new Date(value))
}
