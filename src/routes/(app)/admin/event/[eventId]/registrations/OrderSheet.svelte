<script lang="ts">
import { HOST_HOTEL } from '$lib/general/constants'
import type { PeopleSummary } from './peopleSummary'
import type { RoomSummary } from './roomSummary'

/* Shirt sizes per tier and the meal split — what an organiser reads down a phone to a supplier.

   Counting is in peopleSummary.ts and tested there. */

/* Matches the subheadings on the event settings page, so the two admin surfaces read as one design. */
const SUBHEAD_CLASS = 'text-muted-foreground text-xs font-semibold tracking-wide uppercase'

let {
    summary,
    attendingCount,
    rooms,
}: { summary: PeopleSummary; attendingCount: number; rooms: RoomSummary } = $props()
</script>

<!-- The order sheet, in the card rather than over the table: it is a summary of the year like the
         two groups above it, and it belongs where they are.

         Placed AFTER Not paid so the two money groups stay adjacent — they only mean anything read
         against each other — which means this needs its own note saying whose shirts these are. -->
<div class="flex flex-col gap-3">
    <p class={SUBHEAD_CLASS}>To order</p>
    <p class="text-muted-foreground text-xs">
        For the {attendingCount} paid or covered.
    </p>

    {#if summary.shirtsByTier.length > 0}
        <div class="flex flex-col gap-1.5">
            <p class="text-muted-foreground text-sm">T-shirts</p>
            {#each summary.shirtsByTier as tier (tier.tierLabel)}
                <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1 pl-2">
                    <span class="w-12 shrink-0 text-sm">{tier.tierLabel}</span>
                    {#if tier.sizes.length === 0}
                        <span class="text-muted-foreground text-sm">none yet</span>
                    {:else}
                        {#each tier.sizes as { size, count } (size)}
                            <span class="text-sm tabular-nums">
                                {size}
                                <span class="font-semibold">{count}</span>
                            </span>
                        {/each}
                    {/if}
                </div>
            {/each}
            {#if summary.shirtsMissing > 0}
                <!-- A person to go back to, not a size to guess. -->
                <p class="pl-2 text-xs text-amber-700 dark:text-amber-400">
                    {summary.shirtsMissing} with no size recorded
                </p>
            {/if}
        </div>

        <div class="flex flex-col gap-1.5">
            <p class="text-muted-foreground text-sm">Meals</p>
            <div class="flex items-baseline justify-between gap-3 pl-2">
                <span class="text-sm">Vegetarian</span>
                <span class="text-sm font-semibold tabular-nums">{summary.vegetarian}</span>
            </div>
            <div class="flex items-baseline justify-between gap-3 pl-2">
                <span class="text-sm">Standard</span>
                <span class="text-sm font-semibold tabular-nums">{summary.standard}</span>
            </div>
            {#if summary.mealUnanswered > 0}
                <!-- Kept out of Standard on purpose: three vegetarians and two unknowns is a
                         different order from three vegetarians. -->
                <div class="flex items-baseline justify-between gap-3 pl-2">
                    <span class="text-sm text-amber-700 dark:text-amber-400"> Not answered </span>
                    <span
                        class="text-sm font-semibold text-amber-700 tabular-nums dark:text-amber-400">
                        {summary.mealUnanswered}
                    </span>
                </div>
            {/if}
        </div>
    {:else}
        <p class="text-muted-foreground text-sm">Nothing to order yet.</p>
    {/if}

    <!-- Rooms belong here rather than with the head counts: a block at the hotel is a supplier
         order like shirts and meals, negotiated ahead on numbers this panel exists to read out.

         Parties AND people, because a block is counted in rooms and a party of five is not one.
         Hidden until somebody has answered — see RoomSummary.hasAnswers. -->
    {#if HOST_HOTEL && rooms.hasAnswers}
        <div class="flex flex-col gap-1.5">
            <p class="text-muted-foreground text-sm">Rooms at {HOST_HOTEL.name}</p>
            <div class="flex items-baseline justify-between gap-3 pl-2">
                <span class="text-sm">Staying</span>
                <span class="text-sm tabular-nums">
                    <span class="font-semibold">{rooms.stayingParties}</span>
                    {rooms.stayingParties === 1 ? 'party' : 'parties'} ·
                    <span class="font-semibold">{rooms.stayingPeople}</span>
                    {rooms.stayingPeople === 1 ? 'person' : 'people'}
                </span>
            </div>
            <!-- Kept out of Staying on purpose: three certain and two maybes is a different block
                 from five certain. -->
            {#if rooms.undecidedParties > 0}
                <div class="flex items-baseline justify-between gap-3 pl-2">
                    <span class="text-sm text-amber-700 dark:text-amber-400">Not sure yet</span>
                    <span class="text-sm text-amber-700 tabular-nums dark:text-amber-400">
                        <span class="font-semibold">{rooms.undecidedParties}</span>
                        {rooms.undecidedParties === 1 ? 'party' : 'parties'} ·
                        <span class="font-semibold">{rooms.undecidedPeople}</span>
                        {rooms.undecidedPeople === 1 ? 'person' : 'people'}
                    </span>
                </div>
            {/if}
            {#if rooms.elsewhereParties > 0}
                <div class="flex items-baseline justify-between gap-3 pl-2">
                    <span class="text-muted-foreground text-sm">Somewhere else</span>
                    <span class="text-muted-foreground text-sm tabular-nums">
                        {rooms.elsewhereParties}
                        {rooms.elsewhereParties === 1 ? 'party' : 'parties'}
                    </span>
                </div>
            {/if}
            <!-- Families to ring, not a number to add: these bookings were taken before the
                 question existed, so nobody has ever been asked. -->
            {#if rooms.notAskedParties > 0}
                <p class="pl-2 text-xs text-amber-700 dark:text-amber-400">
                    {rooms.notAskedParties}
                    {rooms.notAskedParties === 1 ? 'party was' : 'parties were'} never asked
                </p>
            {/if}
        </div>
    {/if}
</div>
