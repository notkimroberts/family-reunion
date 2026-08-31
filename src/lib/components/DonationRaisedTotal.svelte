<script lang="ts">
import { formatUsd } from '$lib/utils'

/* "$300.00 raised from 4 gifts so far." — the public total, on the home page and on /donate.

   PAID gifts only, which is the query's job (getPublicDonationTotal), not this component's: a
   pending row is an abandoned checkout, and counting it would let anyone inflate the figure by
   opening a checkout and walking away.

   Renders NOTHING before the first gift. "$0.00 raised from 0 gifts" is a worse invitation than
   silence, and both callers previously wrapped this in the same {#if} to avoid it. */

type Props = {
    /* Gross, in cents. */
    totalCents: number
    giftCount: number
    class?: string
}

let { totalCents, giftCount, class: className }: Props = $props()
</script>

{#if giftCount > 0}
    <p class="text-sm {className ?? ''}">
        <span class="font-semibold tabular-nums">{formatUsd(totalCents)}</span>
        raised from {giftCount}
        {giftCount === 1 ? 'gift' : 'gifts'} so far.
    </p>
{/if}
