<script lang="ts">
import { FileText } from '@lucide/svelte'
import { StripeIcon } from '$lib/components'
import { cn } from '$lib/utils'

/* How a booking arrived: through Stripe Checkout, or typed in from a paper form.

   Keyed on the presence of a Stripe session rather than on payment status, because those answer
   different questions. Status says whether the money is in; this says which route it came by, and the
   two combine — "Stripe · Pending" is a family who opened Checkout and stopped, "Paper · Pending" is a
   cheque that has not arrived. The list's chase note spells out which, and they need opposite chasing.

   Labelled as well as iconned. An icon alone in a money column is a guess, and the two cases are the
   ones an organiser must not confuse. */
let { stripeSessionId, class: className }: { stripeSessionId: string | null; class?: string } =
    $props()

let viaStripe = $derived(stripeSessionId !== null)
</script>

<span
    class={cn('text-muted-foreground inline-flex items-center gap-1.5 text-xs', className)}
    title={viaStripe
        ? 'Registered online through Stripe Checkout'
        : 'Entered by hand from a paper form'}>
    {#if viaStripe}
        <StripeIcon class="size-3.5 shrink-0" />
        Stripe
    {:else}
        <FileText class="size-3.5 shrink-0" />
        Paper
    {/if}
</span>
