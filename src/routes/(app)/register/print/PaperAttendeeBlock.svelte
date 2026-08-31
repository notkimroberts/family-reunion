<script module lang="ts">
import { ADULT_SHIRT_SIZES, YOUTH_SHIRT_SIZES } from '$lib/general/constants'

/* Display only — "XXXL" beside a tick box reads as a run of Xs at this size, and a shirt order
   sheet writes it 3XL anyway. Nothing reads these back. */
const printSizeLabel = (size: string) =>
    size.replace(/^X(X+)L$/, (_, extra: string) => `${extra.length + 1}XL`)

const GROUP_LABEL = 'text-[9px] font-semibold uppercase tracking-widest text-neutral-500'
const DATE_PART = 'flex flex-col items-center gap-0.5'
const DATE_RULE = 'h-8.5 w-full border-b border-neutral-500'
const DATE_CAPTION = 'text-[7px] uppercase tracking-widest text-neutral-400'
</script>

<script lang="ts">
import type { TierOption } from '../types'
import PaperCheckbox from './PaperCheckbox.svelte'

type Props = {
    index: number
    tiers: TierOption[]
    /* Attendee 1 is the person who filled in section 1. */
    isContact?: boolean
}

/* One attendee, written into a block rather than a table row. The table this replaced fitted five
   people on one page by giving each name 150px and each answer an unlabelled 22px cell — legible
   to read, unwritable to fill in with a pen. A block gives the name a 4in rule and every answer a
   labelled tick box, and the sheet is allowed to run to a second page. */
let { index, tiers, isContact = false }: Props = $props()

/* The contact is attendee 1, and the block says so on its own name label rather than in a caption
   line of its own: section 3 starts on a fresh page sized for exactly five blocks, and an extra
   line in each would be the difference between five on a page and four.

   It has to be said HERE and not only in the section heading. The contact writes their name in
   section 1, so line 1 reads as the first GUEST unless something on the line contradicts that —
   which is how a form that collects everyone's birth date looked like it collected everyone's but
   theirs. */
let nameLabel = $derived(isContact ? 'Full name — you, the person we contact' : 'Full name')
</script>

<!-- data-paper-attendee: the print rules in app.css re-assert break-inside-avoid against this
     attribute, because the Tailwind class alone was ignored while this div was a flex item. -->
<div
    data-paper-attendee
    class="flex break-inside-avoid flex-col gap-2 border border-neutral-500 px-2 py-1.5">
    <div class="flex items-end gap-2">
        <span
            class="flex h-[18px] w-[18px] shrink-0 items-center justify-center border border-neutral-700 text-[10px] font-bold">
            {index}
        </span>
        <div class="flex flex-1 flex-col gap-0.5">
            <span class={GROUP_LABEL}>{nameLabel}</span>
            <div class="h-8.5 border-b border-neutral-500"></div>
        </div>
        <div class="flex w-[1.9in] shrink-0 flex-col gap-0.5">
            <span class={GROUP_LABEL}>Birth date</span>
            <div class="flex items-end gap-1">
                <div class="{DATE_PART} w-[0.44in]">
                    <div class={DATE_RULE}></div>
                    <span class={DATE_CAPTION}>Month</span>
                </div>
                <span class="pb-3 text-[11px] text-neutral-400">/</span>
                <div class="{DATE_PART} w-[0.44in]">
                    <div class={DATE_RULE}></div>
                    <span class={DATE_CAPTION}>Day</span>
                </div>
                <span class="pb-3 text-[11px] text-neutral-400">/</span>
                <div class="{DATE_PART} w-[0.72in]">
                    <div class={DATE_RULE}></div>
                    <span class={DATE_CAPTION}>Year</span>
                </div>
            </div>
        </div>
    </div>

    <div class="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <span class="flex items-center gap-2">
            <span class={GROUP_LABEL}>Age group</span>
            {#each tiers as tier (tier.id)}
                <PaperCheckbox label={tier.label} />
            {/each}
        </span>
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

    <div class="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <span class="flex items-center gap-2">
            <span class={GROUP_LABEL}>T-shirt · youth</span>
            {#each YOUTH_SHIRT_SIZES as size (size)}
                <PaperCheckbox label={size} />
            {/each}
        </span>
        <span class="flex items-center gap-2">
            <span class={GROUP_LABEL}>Adult</span>
            {#each ADULT_SHIRT_SIZES as size (size)}
                <PaperCheckbox label={printSizeLabel(size)} />
            {/each}
        </span>
    </div>
</div>
