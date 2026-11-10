<script module lang="ts">
import { ADULT_SHIRT_SIZES, YOUTH_SHIRT_SIZES } from '$lib/general/constants'

/* Display only — "XXXL" beside a tick box reads as a run of Xs at this size, and a shirt order
   sheet writes it 3XL anyway. Nothing reads these back. */
const printSizeLabel = (size: string) =>
    size.replace(/^X(X+)L$/, (_, extra: string) => `${extra.length + 1}XL`)

const GROUP_LABEL = 'text-[9px] font-semibold uppercase tracking-widest text-neutral-500'
const SUB_LABEL = 'text-[8px] uppercase tracking-wider text-neutral-500'
</script>

<script lang="ts">
import type { TierOption } from '../types'
import PaperCheckbox from './PaperCheckbox.svelte'

/* The answers collected for every attendee: tier, meal, 2025 attendance, shirt size. The tier group
   is left out when there is only one tier to choose — a single box asks nothing. */
let { tiers }: { tiers: TierOption[] } = $props()
</script>

<!-- One line, or page 2 overflows: a wrap here adds a line to all five blocks. Tier labels carry
     age ranges ("Adult 14–74 · Child 4–13 · Senior 75+"), which measured 723px against 692px
     available, so the caption is "Age" and the gap is tighter — 666px. -->
<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
    {#if tiers.length > 1}
        <span class="flex items-center gap-2">
            <span class={GROUP_LABEL}>Age</span>
            {#each tiers as tier (tier.id)}
                <PaperCheckbox label={tier.label} />
            {/each}
        </span>
    {/if}
    <span class="flex items-center gap-2">
        <span class={GROUP_LABEL}>Vegetarian meal</span>
        <PaperCheckbox label="Yes" />
        <PaperCheckbox label="No" />
    </span>
    <span class="flex items-center gap-2">
        <span class={GROUP_LABEL}>At the 2025 reunion</span>
        <PaperCheckbox label="Yes" />
        <PaperCheckbox label="No" />
    </span>
</div>

<!-- One outlined group, youth and adult inside it, so the two runs read as one question with one
     answer. As two labeled rows, readers ticked a youth AND an adult size. -->
<div class="flex items-center gap-2">
    <span class={GROUP_LABEL}>T-shirt · mark one</span>
    <span class="flex items-center gap-2 rounded-full border border-neutral-500 px-2 py-0.5">
        <span class={SUB_LABEL}>Youth</span>
        {#each YOUTH_SHIRT_SIZES as size (size)}
            <PaperCheckbox label={size} />
        {/each}
        <span class="h-3 border-l border-neutral-400"></span>
        <span class={SUB_LABEL}>Adult</span>
        {#each ADULT_SHIRT_SIZES as size (size)}
            <PaperCheckbox label={printSizeLabel(size)} />
        {/each}
    </span>
</div>
