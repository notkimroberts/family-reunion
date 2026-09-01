<script lang="ts">
import { ChevronDown, ChevronRight } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import type { EventPerson } from '$lib/server/registrations'
import { cn } from '$lib/utils'
import CheckinRow from './CheckinRow.svelte'
import type { CheckinGroup } from './groupPeopleByBooking'

type Props = {
    group: CheckinGroup
    /* Forced open while a search is narrowing the list: a greeter searching a child's first name must not
       land on a collapsed party and think the name is missing. */
    expanded: boolean
    pendingIds: ReadonlySet<string>
    shirtPendingIds: ReadonlySet<string>
    onToggleExpanded: (registrationId: string) => void
    onToggle: (person: EventPerson) => void
    onToggleParty: (group: CheckinGroup) => void
    onToggleShirt: (person: EventPerson) => void
}

let {
    group,
    expanded,
    pendingIds,
    shirtPendingIds,
    onToggleExpanded,
    onToggle,
    onToggleParty,
    onToggleShirt,
}: Props = $props()

const allArrived = $derived(group.arrivedCount === group.members.length)
</script>

<!-- One row per BOOKING, collapsed, because that is how people arrive: the Pattersons turn up in two cars,
     not as five names scattered through an alphabetical list. Check-in itself stays per person — the count
     here is a summary, never a state of its own. -->
<div class="rounded-lg border">
    <div class="flex items-center gap-2 p-2">
        <button
            type="button"
            onclick={() => onToggleExpanded(group.registrationId)}
            aria-expanded={expanded}
            class="hover:bg-muted flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left">
            {#if expanded}
                <ChevronDown class="text-muted-foreground size-4 shrink-0" />
            {:else}
                <ChevronRight class="text-muted-foreground size-4 shrink-0" />
            {/if}
            <span class="flex min-w-0 flex-col">
                <span class="truncate text-sm font-medium">{group.contactName}</span>
                <span
                    class={cn(
                        'text-xs',
                        allArrived ? 'text-primary font-medium' : 'text-muted-foreground',
                    )}>
                    {group.arrivedCount} of {group.members.length} arrived
                    <!-- Shirts only once somebody is here: before that it is "0 shirts" on every party
                         in the list, which says nothing and crowds the name. -->
                    {#if group.arrivedCount > 0}
                        · {group.shirtsGivenCount} shirt{group.shirtsGivenCount === 1 ? '' : 's'} given
                    {/if}
                </span>
            </span>
        </button>

        <!-- The one-tap case, which is the common one. Un-checking a whole party is deliberately NOT
             offered: undoing is a per-person correction, and a stray tap here would wipe an arrival
             somebody else recorded. -->
        {#if !allArrived}
            <Button variant="outline" size="sm" onclick={() => onToggleParty(group)}>
                Check in all
            </Button>
        {/if}
    </div>

    {#if expanded}
        <div class="flex flex-col gap-1 border-t p-2">
            {#each group.members as member (member.id)}
                <CheckinRow
                    person={member}
                    arrived={member.checkedInAt !== null}
                    shirtGiven={member.shirtGivenAt !== null}
                    pending={pendingIds.has(member.id)}
                    shirtPending={shirtPendingIds.has(member.id)}
                    {onToggle}
                    {onToggleShirt} />
            {/each}
        </div>
    {/if}
</div>
