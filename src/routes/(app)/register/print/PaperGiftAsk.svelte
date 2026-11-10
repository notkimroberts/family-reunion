<script module lang="ts">
import { DONATION_GOAL_CENTS, DONATION_LEDE, DONATION_PRESET_CENTS } from '$lib/general/constants'
import { formatUsdHeadline } from '$lib/utils'

const SUGGESTED_GIFTS = DONATION_PRESET_CENTS.map(formatUsdHeadline).join(' · ')
</script>

<script lang="ts">
/* The ask for a gift, on page 1 where it is read before the total is added up on page 2. Its reason
   is DONATION_LEDE, the same sentence the site gives. */
let { totalSection }: { totalSection: number } = $props()
</script>

<div class="flex flex-col gap-1 border-2 border-black px-2.5 py-2">
    <p class="text-[12px] font-bold">Consider adding a gift</p>
    <p class="text-[10px] leading-snug">{DONATION_LEDE}</p>
    <p class="text-[10px] leading-snug">
        Suggested: <span class="font-semibold">{SUGGESTED_GIFTS}</span> — or any amount. Our goal is {formatUsdHeadline(
            DONATION_GOAL_CENTS,
        )} in gifts. Include it in the same check or Zelle payment, and add it to your total in section
        {totalSection}.
    </p>
</div>
