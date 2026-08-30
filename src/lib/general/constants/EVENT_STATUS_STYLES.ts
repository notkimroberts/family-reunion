import { CircleCheck, CircleSlash, Eye, TriangleAlert } from '@lucide/svelte'
import type { EventStatus } from './eventStatuses'

/* One vocabulary for a reunion year's status: label, icon, colour.

   Shared because three surfaces describe the same four values and had each invented their own. The
   /admin year cards carried a local STATUS_COPY plus a statusTone() that made `closed` grey;
   EventStatusBanner made `closed` amber and had no entry for `open` at all; the settings page printed
   the raw database word in an outline Badge. Same status, three appearances, and the one an organiser
   most needs to notice — a year that is not open — was the quietest of them.

   Colour AND icon, not colour alone: roughly one man in twelve cannot separate the greens from the
   ambers, so the shape has to carry the same meaning. Explicit palette classes rather than semantic
   tokens because the theme has no green, amber or sky token, and both light and dark are set so
   auto-inversion cannot wash them out. Same reasoning, same palette, as
   REGISTRATION_STATUS_STYLES — green is working, amber wants attention, sky is informational, grey is
   filed away.

   Three visual forms of the same fact, because they sit on different things: `class` is the filled
   badge/banner treatment, `tone` is text on a plain surface, and `border` is for a card that keeps its
   own background — the /admin year cards. Only `open` adds a ring: one year can be open at a time, so it
   is the one card that should catch the eye first.

   `note` is the consequence in the reader's terms. "Closed" names a state; "nobody can register" is what
   an organiser is actually deciding about, and it is what the status card shows under the buttons.

   DELIBERATELY NOT re-exported from the constants barrel, and imported by path instead. This module
   imports @lucide/svelte, which resolves to .svelte files; `$lib/general/constants` is imported by
   server modules and by tests running in the node environment, which cannot load them — adding it to the
   barrel broke four unrelated test files with "Unknown file extension .svelte". Same reason
   REGISTRATION_STATUS_STYLES sits in its route folder rather than here.

   EventStatusBanner keeps its own longer copy on purpose — it is a paragraph explaining a problem, not a
   label — but it now draws from the same palette here so the two cannot disagree about what amber
   means. */
export const EVENT_STATUS_STYLES = {
    open: {
        label: 'Open',
        headline: 'Registration open',
        note: 'The public registration form is accepting parties and payments.',
        icon: CircleCheck,
        class: 'border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200',
        tone: 'text-green-700 dark:text-green-400',
        border: 'border-green-300 ring-1 ring-green-200 dark:border-green-800 dark:ring-green-900',
    },
    draft: {
        label: 'Draft',
        headline: 'Not published',
        note: 'Nobody outside the admin can register or see this year.',
        icon: Eye,
        class: 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200',
        tone: 'text-sky-700 dark:text-sky-400',
        border: 'border-sky-300 dark:border-sky-800',
    },
    closed: {
        label: 'Closed',
        headline: 'Registration closed',
        note: 'Nobody new can register. Existing registrations stay editable until the lock date.',
        icon: TriangleAlert,
        class: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
        tone: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-300 dark:border-amber-800',
    },
    archived: {
        label: 'Archived',
        headline: 'Archived',
        note: 'A past reunion, kept for its numbers. Nobody can register.',
        icon: CircleSlash,
        class: 'border-border bg-muted text-muted-foreground',
        tone: 'text-muted-foreground',
        border: 'border-border',
    },
} as const satisfies Record<
    EventStatus,
    {
        label: string
        headline: string
        note: string
        icon: unknown
        class: string
        tone: string
        border: string
    }
>

/* The order a year moves through, which is a decision — EVENT_STATUSES is the same four values but its
   order is the enum's, and nothing should depend on that reading sensibly to a person. */
export const EVENT_STATUS_ORDER = [
    'draft',
    'open',
    'closed',
    'archived',
] as const satisfies readonly EventStatus[]
