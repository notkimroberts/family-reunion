<script lang="ts">
import { Progress } from '$lib/components/ui/progress'
import { DONATION_GOAL_CENTS } from '$lib/general/constants'
import { formatUsdHeadline } from '$lib/utils'

/* "$75 raised of $1,000 goal", over a bar filling toward it — the public total, on the home page and
   on /donate.

   PAID gifts only, which is the query's job (getPublicDonationTotal), not this component's: a
   pending row is an abandoned checkout, and counting it would let anyone inflate the figure by
   opening a checkout and walking away.

   Renders NOTHING before the first gift. "$0 raised" over an empty bar is a worse invitation than
   silence, and both callers previously wrapped this in the same {#if} to avoid it.

   The bar is a meter, not a chart: one ratio against a limit. It stops at the goal; the figure
   above it does not, so a gift past the goal is still counted. */

type Props = {
    /* Gross, in cents. */
    totalCents: number
    giftCount: number
    class?: string
}

let { totalCents, giftCount, class: className }: Props = $props()

const goal = formatUsdHeadline(DONATION_GOAL_CENTS)

let reached = $derived(totalCents >= DONATION_GOAL_CENTS)
</script>

{#if giftCount > 0}
    <div class="flex w-full flex-col gap-2 {className ?? ''}">
        <div class="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <p>
                <span class="text-lg font-semibold">{formatUsdHeadline(totalCents)}</span>
                <span class="text-muted-foreground">
                    {#if reached}
                        raised — goal of {goal} reached
                    {:else}
                        raised of {goal} goal
                    {/if}
                </span>
            </p>
            <p class="text-muted-foreground">
                {giftCount}
                {giftCount === 1 ? 'gift' : 'gifts'}
            </p>
        </div>
        <Progress
            value={Math.min(totalCents, DONATION_GOAL_CENTS)}
            max={DONATION_GOAL_CENTS}
            aria-label="Gifts raised toward the {goal} goal"
            class="h-2.5" />
    </div>
{/if}
