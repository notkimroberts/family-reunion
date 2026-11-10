<script module lang="ts">
import { formatUsd } from '$lib/utils'

const CELL = 'border-b border-neutral-400 px-1.5 py-1 text-[10px]'
const WRITE_IN = 'inline-block h-4 w-[0.55in] border-b border-neutral-700 align-bottom'
const AMOUNT = 'flex items-end justify-end gap-1'
</script>

<script lang="ts">
import type { TierOption } from '../types'

/* A worksheet that adds places and gift into the one amount to pay. A row per tier, so a reader
   multiplies a printed price instead of looking one up and adding a column of figures in their
   head. */
let { tiers }: { tiers: TierOption[] } = $props()
</script>

<table class="w-full border-collapse self-start">
    <thead>
        <tr class="text-left text-[8px] tracking-widest text-neutral-500 uppercase">
            <th class="px-1.5 pb-0.5 font-semibold">Item</th>
            <th class="px-1.5 pb-0.5 text-right font-semibold">Price</th>
            <th class="px-1.5 pb-0.5 text-center font-semibold">People, with you</th>
            <th class="px-1.5 pb-0.5 text-right font-semibold">Amount</th>
        </tr>
    </thead>
    <tbody>
        {#each tiers as tier (tier.id)}
            <tr>
                <td class={CELL}>{tier.label}</td>
                <td class="{CELL} text-right">{formatUsd(tier.priceCents)}</td>
                <td class="{CELL} text-center">× <span class={WRITE_IN}></span></td>
                <td class={CELL}>
                    <span class={AMOUNT}>= $ <span class={WRITE_IN}></span></span>
                </td>
            </tr>
        {/each}
        <tr>
            <td class={CELL} colspan="3">Gift to the reunion</td>
            <td class={CELL}>
                <span class={AMOUNT}>$ <span class={WRITE_IN}></span></span>
            </td>
        </tr>
        <tr class="font-bold">
            <td class="px-1.5 pt-1.5 text-[11px] uppercase" colspan="3">Total to pay</td>
            <td class="px-1.5 pt-1.5 text-[11px]">
                <span class={AMOUNT}
                    >$ <span
                        class="inline-block h-5 w-[0.55in] border-b-2 border-black align-bottom"
                    ></span
                    ></span>
            </td>
        </tr>
    </tbody>
</table>
