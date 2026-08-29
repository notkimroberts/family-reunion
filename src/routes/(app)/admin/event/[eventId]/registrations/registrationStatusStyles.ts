import { CircleCheck, CircleX, Clock, Gift } from '@lucide/svelte'
import type { RegistrationStatus } from '$lib/utils'

/* One vocabulary for payment status, and now one palette too.

   The labels had drifted once already: the list printed the raw database value ('waived') while the
   detail page printed invented ones — "Covered", "Checkout not completed" — so the same registration
   read two different ways depending on where you looked. These are the database's four statuses and
   nothing else.

   Extracted from RegistrationStatusBadge so the filter buttons can wear the same colours as the rows
   they filter. Two copies of a palette is the same drift with a longer fuse: a green nobody can find in
   the list is worse than no colour at all.

   Colour carries the meaning at a glance, which is the whole job in a list of thirty: green is money in,
   amber is money still owed, blue is comped, red is cancelled. Explicit palette classes rather than
   semantic tokens because the theme has no green or amber token, following the paper-entry success
   banner, and both light and dark are set so auto-inversion cannot wash them out.

   Each also carries an icon, so the distinction survives for a reader who cannot separate the greens and
   ambers — roughly one man in twelve. Colour and shape say the same thing rather than colour alone. */
export const REGISTRATION_STATUS_STYLES = {
    paid: {
        label: 'Paid',
        icon: CircleCheck,
        class: 'border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200',
    },
    pending: {
        label: 'Pending',
        icon: Clock,
        class: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
    },
    waived: {
        label: 'Waived',
        icon: Gift,
        class: 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200',
    },
    refunded: {
        label: 'Refunded',
        icon: CircleX,
        class: 'border-destructive/40 bg-destructive/10 text-destructive',
    },
} as const satisfies Record<RegistrationStatus, { label: string; icon: unknown; class: string }>
