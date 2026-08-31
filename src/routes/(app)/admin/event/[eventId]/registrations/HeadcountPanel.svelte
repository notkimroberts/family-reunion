<script lang="ts">
import { Info } from '@lucide/svelte'
import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip'
import { formatPrice } from '$lib/utils'
import type { RegistrationTotals } from './registrationTotals'

/* How many people, as distinct from how much money.

   These counts used to be interleaved with the money — People, Parties, Collected in three
   identical rows — so neither scanned: three different units stacked the same way, and the biggest
   figure on the panel was a head count printed twice for two different fives.

   Coming is the catering number and carries the weight here. The party count is secondary text
   under its own head count rather than a labelled row of its own, which is what removes four rows
   from the old layout. */

/* Matches the subheadings on the event settings page, so the two admin surfaces read as one design. */
const SUBHEAD_CLASS = 'text-muted-foreground text-xs font-semibold tracking-wide uppercase'

const partyLabel = (count: number) => `${count} ${count === 1 ? 'party' : 'parties'}`

let { totals }: { totals: RegistrationTotals } = $props()
</script>

<div class="flex flex-col gap-3">
    <p class={SUBHEAD_CLASS}>People</p>

    <div class="flex items-baseline justify-between gap-3">
        <div class="flex flex-col">
            <span class="text-sm">Coming</span>
            <span class="text-muted-foreground text-xs">{partyLabel(totals.partyCount)}</span>
        </div>
        <span class="text-2xl font-bold tabular-nums">{totals.attendingCount}</span>
    </div>

    <!-- Shown even at zero, unlike the money rows: "Not paid 0" is the answer to a question an
         organiser is actively asking, and its absence would read as a missing section. -->
    <div class="flex items-baseline justify-between gap-3">
        <div class="flex flex-col">
            <span class="text-sm">Not paid</span>
            <span class="text-muted-foreground text-xs">
                {partyLabel(totals.pendingPartyCount)}
            </span>
        </div>
        <span class="text-lg font-semibold tabular-nums">{totals.pendingPeopleCount}</span>
    </div>

    <!-- Comped places are why Coming can exceed what the money accounts for. The explanation is
         behind the label rather than printed under it: this is a column of figures an organiser
         scans, and prose in the middle of it is what made the old panel unreadable. -->
    {#if totals.waivedPartyCount > 0}
        <div class="flex items-center justify-between gap-3">
            <Tooltip>
                <TooltipTrigger
                    class="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors">
                    Comped
                    <Info class="size-3.5" />
                </TooltipTrigger>
                <TooltipContent class="max-w-xs">
                    {totals.waivedPartyCount}
                    {totals.waivedPartyCount === 1 ? 'party is' : 'parties are'} attending free, worth
                    ${formatPrice(totals.waivedCents)}. Counted in Coming, and in none of the money
                    — comped places bring in nothing.
                </TooltipContent>
            </Tooltip>
            <span class="text-lg font-semibold tabular-nums">{totals.waivedPeopleCount}</span>
        </div>
    {/if}
</div>
