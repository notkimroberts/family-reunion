<script lang="ts">
import { CreditCard, ShieldCheck } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import { WARNING_SURFACE_CLASS, ZELLE_RECIPIENT } from '$lib/general/constants'
import { quoteAmountDue } from '$lib/general/pricing'
import { OWED_CARD_PITCH, STRIPE_CHECKOUT_NOTE, owedOtherWays } from '$lib/general/scamSafety'
import { cn, formatPrice } from '$lib/utils'
import type { RegistrationViewMember } from './types'

/* The money still owed on a paid booking, for people an organizer added after it was paid.

   A filled panel with one big button, because the card is the route that settles itself: the webhook
   marks the place paid and emails a receipt, while Zelle and checks wait for an organizer to notice
   the money. The other two ways still follow in a smaller line — every request for money names all
   three (scamSafety), and a relative without a card must not think there is no other way.

   The button is a link, not a form: /register/view posts nothing. /register/pay re-reads what is owed
   and opens Stripe from there. Renders nothing when nobody is owed — the view load only flags owed
   people on a paid booking. */
let { members }: { members: RegistrationViewMember[] } = $props()

let quote = $derived(quoteAmountDue(members))
let names = $derived(quote.lines.map((line) => line.name).join(', '))
</script>

{#if quote.lines.length > 0}
    <section
        role="status"
        class={cn(
            'col-span-12 flex flex-col gap-5 rounded-xl border-2 p-5 shadow-sm md:p-6',
            WARNING_SURFACE_CLASS,
        )}>
        <div class="flex flex-col gap-1">
            <p class="text-xs font-semibold tracking-wider uppercase">Payment needed</p>
            <p class="text-2xl font-bold tabular-nums">
                ${formatPrice(quote.netCents)} still to pay
            </p>
            <p class="text-base">
                An organizer added {names} to your party.
                {quote.lines.length === 1 ? 'Their place is' : 'Their places are'} not paid for yet.
            </p>
        </div>

        <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <Button href="/register/pay" size="lg" class="w-full md:w-auto">
                <CreditCard class="size-5" />
                Pay ${formatPrice(quote.cardTotalCents)} by card
            </Button>
            <div class="flex flex-col gap-1 text-sm">
                <p>
                    {OWED_CARD_PITCH} Includes a ${formatPrice(quote.feeCents)} card processing fee.
                </p>
                <p class="flex items-start gap-1.5 text-xs">
                    <ShieldCheck class="size-3.5 shrink-0 translate-y-0.5" />
                    {STRIPE_CHECKOUT_NOTE}
                </p>
            </div>
        </div>

        <p class="border-t border-amber-300 pt-3 text-sm dark:border-amber-800">
            {owedOtherWays(quote.netCents, ZELLE_RECIPIENT)}
        </p>
    </section>
{/if}
