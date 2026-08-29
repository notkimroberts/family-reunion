<script lang="ts">
import { ExternalLink } from '@lucide/svelte'
import type { RegistrationSummary } from '$lib/server/registrations'
import { getPaymentState, stripePaymentUrl } from '$lib/utils'

/* The note under a booking's name: what to do about it, or what already happened.

   Amber for the two pending states, which need opposite follow-ups — one family thinks their payment
   failed, the other owes money by post. Green for money in, with the day it arrived and, when the
   registration came through Checkout, a link to the payment in the Stripe dashboard.

   `paidLabel` arrives as a PROP rather than being formatted here. formatViewerDateTime resolves the
   reader's own timezone and must not run during SSR — on Railway that is Node in UTC, and Svelte does not
   recompute template text on hydration, so the server's zone would simply stay on screen. A payment at
   23:30 Pacific is the next DAY in UTC, so that is a wrong-date bug, not a wrong-clock one. The page owns
   one $effect that fills these in after mount, the same shape RegistrationHistory uses.

   The date itself comes from registrations.paidAt, not updatedAt: any later edit bumps updatedAt, so it
   drifts away from the payment date the moment anyone corrects a shirt size. Registrations paid before
   that column existed have no date, and this says so rather than printing a wrong one. */
const CHASE_COPY = {
    checkout_incomplete: 'Started paying online and stopped — they may think it failed',
    awaiting_payment: 'Entered from a paper form; the money has not arrived',
}

let {
    registration,
    stripeTestMode,
    paidLabel,
}: {
    registration: RegistrationSummary
    stripeTestMode: boolean
    /* Undefined until the page's effect has run, and for a row with no recorded date. */
    paidLabel: string | undefined
} = $props()

let paymentState = $derived(getPaymentState(registration))
let chase = $derived(CHASE_COPY[paymentState as keyof typeof CHASE_COPY])
let isPaid = $derived(paymentState === 'paid_online' || paymentState === 'paid_offline')
let paymentUrl = $derived(stripePaymentUrl(registration.stripePaymentIntentId, stripeTestMode))
</script>

{#if chase}
    <p class="text-xs text-amber-700 dark:text-amber-400">{chase}</p>
{:else if isPaid}
    <p class="flex flex-wrap items-center gap-x-1.5 text-xs text-green-700 dark:text-green-400">
        {#if registration.paidAt}
            <!-- The machine-readable instant is always right, and carries the value until the page's
                 effect fills in the reader's own zone. -->
            <span>
                Paid <time datetime={new Date(registration.paidAt).toISOString()}>
                    {paidLabel ?? ''}
                </time>
            </span>
        {:else}
            <span>Paid — date not recorded</span>
        {/if}
        {#if paymentUrl}
            <!-- Opens Stripe, so it says so, and does not hand over the referrer. -->
            <a
                href={paymentUrl}
                target="_blank"
                rel="noreferrer noopener"
                class="inline-flex items-center gap-1 underline underline-offset-2 hover:no-underline">
                View in Stripe
                <ExternalLink class="size-3" />
            </a>
        {/if}
    </p>
{/if}
