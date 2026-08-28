<script lang="ts">
import { CircleCheck, CircleX, Clock, Gift } from '@lucide/svelte'
import { Badge } from '$lib/components/ui/badge'
import type { RegistrationStatus } from '$lib/utils'

/* One vocabulary for payment status, shared by the list and the detail page.

   They had drifted: the list printed the raw database value ('waived') while the detail page printed
   invented labels — "Covered", "Checkout not completed" — so the same registration read two different
   ways depending on where you looked. These are the database's four statuses and nothing else.

   Colour carries the meaning at a glance, which is the whole job in a list of thirty: green is money
   in, amber is money still owed, blue is comped, red is cancelled. Explicit palette classes rather
   than semantic tokens because there is no green or amber token in the theme, following the paper-entry
   success banner, and both light and dark are set so auto-inversion cannot wash them out.

   Each also carries an icon, so the distinction survives for a reader who cannot separate the greens
   and ambers — roughly one man in twelve. Colour and shape say the same thing rather than colour
   alone. */
const statusStylesValue = {
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
} as const

let { status }: { status: RegistrationStatus } = $props()

/* No cast and no fallback. The prop is the database's own union, so every key is present — the old
   `?? statusStylesValue.pending` quietly rendered an unrecognised status as "Pending", which for a
   money status is the worst possible guess. */
let style = $derived(statusStylesValue[status])
/* Capitalised so it can be used as a component. {@const} cannot live at the top level of markup. */
let Icon = $derived(style.icon)
</script>

<Badge variant="outline" class="gap-1 {style.class}">
    <Icon class="size-3" />
    {style.label}
</Badge>
