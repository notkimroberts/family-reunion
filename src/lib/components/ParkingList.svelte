<script lang="ts">
import type { ParkingOption } from '$lib/general/constants'

let { options }: { options: ParkingOption[] } = $props()

/* Address, walk and note on one muted line under the name — the price is the fact people compare,
   so it gets the right-hand column to itself. */
function secondaryLine(option: ParkingOption): string {
    return [option.address, option.walk, option.note].filter(Boolean).join(' · ')
}
</script>

<ul class="flex flex-col gap-3 text-sm">
    {#each options as option (option.name)}
        <li class="flex flex-col gap-0.5">
            <div class="flex items-baseline justify-between gap-3">
                <span class="font-medium">{option.name}</span>
                <span class="shrink-0 font-medium">{option.price}</span>
            </div>
            {#if secondaryLine(option)}
                <span class="text-muted-foreground">{secondaryLine(option)}</span>
            {/if}
        </li>
    {/each}
</ul>
