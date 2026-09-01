<script lang="ts">
import { ExternalLink } from '@lucide/svelte'
import type { UnlistedAttendee } from '$lib/server/registrations'
import { formatReunionDateTime } from '$lib/utils'

type Props = {
    eventId: string
    matches: readonly UnlistedAttendee[]
}

let { eventId, matches }: Props = $props()

/* Why this person cannot be ticked, in the words an organiser would use at the door. A bare status badge
   would make the greeter guess, and "refunded" on its own does not say "they cancelled". */
function reasonFor(match: UnlistedAttendee): string {
    if (match.status === 'pending') {
        return 'Payment never completed'
    }
    return `Cancelled ${formatReunionDateTime(match.updatedAt, 'short')}`
}
</script>

<!-- The block that stops the list reading as broken. getEventPeople is paid-and-waived only, so an
     unpaid or cancelled relative is simply absent — and an absent name makes the greeter doubt every
     other row. These are shown with the reason and a way to the booking, but NOT tickable: an unpaid
     party is a money conversation, and it happens on the page where the money is visible. -->
<div class="border-muted-foreground/30 flex flex-col gap-2 rounded-lg border border-dashed p-3">
    <p class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Found, but not checked in
    </p>

    {#each matches as match (match.id)}
        <a
            href="/admin/event/{eventId}/registrations/{match.registrationId}"
            class="hover:bg-muted flex items-center justify-between gap-3 rounded-md px-2 py-2">
            <span class="flex min-w-0 flex-col">
                <span class="truncate text-sm font-medium">{match.name}</span>
                <span class="text-muted-foreground text-xs">
                    {reasonFor(match)} · booked by {match.contactName}
                </span>
            </span>
            <ExternalLink class="text-muted-foreground size-4 shrink-0" />
        </a>
    {/each}
</div>
