<script lang="ts">
import { CreditCard, FlaskConical } from '@lucide/svelte'
import { formatReunionDateTime } from '$lib/utils'

/* Stripe's test card. Any future expiry date and any CVC work with it. */
const TEST_CARD_NUMBER = '4242 4242 4242 4242'

/* Shown above the form to a tester who opened the preview link before registration opens. It names
   the Stripe mode, because the same link charges a real card once the live key is on Railway. */
let { opensAt, stripeTestMode }: { opensAt: Date | string; stripeTestMode: boolean } = $props()
</script>

<div
    role="status"
    class="col-span-12 flex items-start gap-3 rounded-md border px-4 py-3 text-sm {stripeTestMode
        ? 'bg-card'
        : 'border-destructive bg-destructive/5'}">
    {#if stripeTestMode}
        <FlaskConical class="text-primary size-5 shrink-0" />
        <p>
            <span class="font-semibold">Preview for testers.</span>
            Registration opens to the family on {formatReunionDateTime(opensAt, 'day')}. Payments
            are in test mode: pay with card
            <span class="font-mono whitespace-nowrap">{TEST_CARD_NUMBER}</span>, any future date and
            any CVC. No money is charged.
        </p>
    {:else}
        <CreditCard class="text-destructive size-5 shrink-0" />
        <p>
            <span class="font-semibold">Preview for testers, with real payments.</span>
            Registration opens to the family on {formatReunionDateTime(opensAt, 'day')}. Payments
            are live: your card is charged. The organizers will refund it.
        </p>
    {/if}
</div>
