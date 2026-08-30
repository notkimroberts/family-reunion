<script lang="ts">
import type { EventStatus } from '$lib/general/constants'
import { EVENT_STATUS_STYLES } from '$lib/general/constants/EVENT_STATUS_STYLES'
import { cn } from '$lib/utils'

/* Why an event's status is a banner and not a badge.

   Three of the four statuses mean the public cannot register: a `draft` event is not published at all
   (getOpenEvent returns nothing, so /register has no event), and `closed`/`archived` have stopped.
   Only `open` is working. A badge next to a heading is exactly the kind of thing an organiser scans
   past — and the cost of scanning past it is wondering for a day why nobody is signing up.

   So `open` gets NOTHING. Silence is the signal that all is well, and a banner that is always there
   is a banner nobody reads. */
/* Longer copy than EVENT_STATUS_STYLES.note, because this is a paragraph explaining a problem rather
   than a label — but the icon and palette come from there, so a `closed` year cannot be amber in one
   place and grey in another. It was: this file had its own three-entry palette. */
const bodyValue = {
    draft: 'This year is still a draft, so the public registration page has no event and nobody can sign up. Open it in the event settings when you are ready.',
    closed: 'Nobody can sign up for this year. You can still edit and record payments for the registrations already here.',
    archived:
        'A past reunion, kept for the record. Anything you change here changes history rather than plans.',
} as const

let { status, class: className }: { status: EventStatus; class?: string } = $props()

/* `open` gets no banner at all — see above. */
let style = $derived(status === 'open' ? undefined : EVENT_STATUS_STYLES[status])
let body = $derived(status === 'open' ? undefined : bodyValue[status])
/* Capitalised so it can be used as a component; {@const} cannot live at the top level of markup. */
let Icon = $derived(style?.icon)
</script>

{#if style && body && Icon}
    <!-- The caller's positioning class goes on THIS element, not a wrapper around the component. A
         wrapper would still be a grid item when the banner renders nothing, adding an empty row and a
         gap above every open event's content. -->
    <div class={cn('flex items-start gap-3 rounded-lg border px-4 py-3', style.class, className)}>
        <Icon class="mt-0.5 size-4 shrink-0" />
        <div class="flex flex-col gap-0.5">
            <p class="text-sm font-semibold">{style.headline}</p>
            <p class="text-sm">{body}</p>
        </div>
    </div>
{/if}
