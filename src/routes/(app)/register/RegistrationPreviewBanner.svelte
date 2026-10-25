<script lang="ts">
import { CreditCard, FlaskConical } from '@lucide/svelte'
import { WARNING_SURFACE_CLASS } from '$lib/general/constants'
import { cn, formatReunionDateTime } from '$lib/utils'

/* Stripe's test card. Any future expiry date, any CVC and any ZIP work with it. */
const TEST_CARD_NUMBER = '4242 4242 4242 4242'

/* Real money is a danger, not a deadline, so live mode takes the destructive colors rather than the
   amber of a test run. */
const LIVE_SURFACE_CLASS = 'border-destructive bg-destructive/10 text-foreground'

/* The first thing a tester sees on /register after opening the preview link: a filled panel above
   the event card, so nobody mistakes the preview for the open registration. It names the Stripe
   mode, because the same link charges a real card once the live key is on Railway. */
let { opensAt, stripeTestMode }: { opensAt: Date | string; stripeTestMode: boolean } = $props()

let opensOn = $derived(formatReunionDateTime(opensAt, 'day'))
</script>

<section
    role="status"
    class={cn(
        'col-span-12 flex flex-col gap-4 rounded-xl border-2 p-5 shadow-sm md:flex-row md:items-center md:p-6',
        stripeTestMode ? WARNING_SURFACE_CLASS : LIVE_SURFACE_CLASS,
    )}>
    <div
        class={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-full',
            stripeTestMode
                ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100'
                : 'bg-destructive text-white',
        )}>
        {#if stripeTestMode}
            <FlaskConical class="size-6" />
        {:else}
            <CreditCard class="size-6" />
        {/if}
    </div>

    <div class="flex min-w-0 flex-1 flex-col gap-1">
        <p class="text-xs font-semibold tracking-wider uppercase">Not open to the family yet</p>
        <p class="text-xl font-bold">
            {stripeTestMode ? 'Preview for testers' : 'Preview with real payments'}
        </p>
        <p class="text-base">
            Registration opens to everyone on {opensOn}.
            {#if stripeTestMode}
                Payments are in test mode, so no money is charged.
            {:else}
                Payments are live: your card is charged. The organizers will refund it.
            {/if}
        </p>
    </div>

    {#if stripeTestMode}
        <div
            class="flex shrink-0 flex-col gap-1 rounded-lg border border-amber-300 bg-white px-4 py-3 text-amber-950 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-100">
            <p class="text-xs font-semibold tracking-wider uppercase">Pay with this test card</p>
            <p class="font-mono text-lg font-semibold whitespace-nowrap">{TEST_CARD_NUMBER}</p>
            <p class="text-sm">Any future date, any CVC, any ZIP</p>
        </div>
    {/if}
</section>
