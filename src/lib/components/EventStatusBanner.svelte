<script lang="ts">
import { CircleSlash, Eye, TriangleAlert } from '@lucide/svelte'
import type { EventStatus } from '$lib/general/constants'
import { cn } from '$lib/utils'

/* Why an event's status is a banner and not a badge.

   Three of the four statuses mean the public cannot register: a `draft` event is not published at all
   (getOpenEvent returns nothing, so /register has no event), and `closed`/`archived` have stopped.
   Only `open` is working. A badge next to a heading is exactly the kind of thing an organiser scans
   past — and the cost of scanning past it is wondering for a day why nobody is signing up.

   So `open` gets NOTHING. Silence is the signal that all is well, and a banner that is always there
   is a banner nobody reads. */
const bannerValue = {
    draft: {
        icon: Eye,
        title: 'Not published yet',
        body: 'This year is still a draft, so the public registration page has no event and nobody can sign up. Open it in Setup when you are ready.',
        class: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100',
    },
    closed: {
        icon: TriangleAlert,
        title: 'Registration is closed',
        body: 'Nobody can sign up for this year. You can still edit and record payments for the registrations already here.',
        class: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
    },
    archived: {
        icon: CircleSlash,
        title: 'Archived year',
        body: 'A past reunion, kept for the record. Anything you change here changes history rather than plans.',
        class: 'border-border bg-muted text-muted-foreground',
    },
} as const

let { status, class: className }: { status: EventStatus; class?: string } = $props()

let banner = $derived(status === 'open' ? undefined : bannerValue[status])
/* Capitalised so it can be used as a component; {@const} cannot live at the top level of markup. */
let Icon = $derived(banner?.icon)
</script>

{#if banner && Icon}
    <!-- The caller's positioning class goes on THIS element, not a wrapper around the component. A
         wrapper would still be a grid item when the banner renders nothing, adding an empty row and a
         gap above every open event's content. -->
    <div class={cn('flex items-start gap-3 rounded-lg border px-4 py-3', banner.class, className)}>
        <Icon class="mt-0.5 size-4 shrink-0" />
        <div class="flex flex-col gap-0.5">
            <p class="text-sm font-semibold">{banner.title}</p>
            <p class="text-sm">{banner.body}</p>
        </div>
    </div>
{/if}
