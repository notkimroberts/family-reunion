/* The reunion's own timezone, used for every timestamp shown to an organiser.

   Pinned rather than left to the viewer's locale on purpose. These timestamps render during SSR as
   well as in the browser: Node on Railway runs in UTC, so a viewer-local format would emit UTC into
   the HTML and Svelte would not recompute the text on hydration — the wrong time would simply sit
   there. An explicit zone makes both sides agree.

   Pacific is also the answer an organiser wants: the reunion is in Oakland, so "when did that change
   happen" means Oakland time, whichever timezone the person asking is sitting in. Every display that
   uses this also shows the zone abbreviation, so it is never guesswork. */
export const EVENT_TIME_ZONE = 'America/Los_Angeles'
