<script lang="ts">
import { CheckCircle2, CreditCard, KeyRound, LoaderCircle } from '@lucide/svelte'
import { enhance } from '$app/forms'
import { invalidate } from '$app/navigation'
import { PriceWithCardFee } from '$lib/components'
import { Alert, AlertDescription } from '$lib/components/ui/alert'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Separator } from '$lib/components/ui/separator'
import { APP_NAME } from '$lib/general/constants'
import { STRIPE_CHECKOUT_NOTE } from '$lib/general/scamSafety'
import { formatPrice } from '$lib/utils'
import CheckoutSafetyNotice from '../CheckoutSafetyNotice.svelte'
import { AMOUNT_DUE_DEPENDENCY } from './AMOUNT_DUE_DEPENDENCY'

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 30000

let { data, form } = $props()

let isOwed = $derived(data.quote.lines.length > 0)
/* Back from Stripe with places still owed: the webhook has not landed yet. */
let awaitingWebhook = $derived(data.confirming && isOwed)
let timedOut = $state(false)
let submitting = $state(false)

/* Re-runs the load until the webhook settles the places, as /register/view polls for a new booking.
   The load rather than a status endpoint, since it already answers "what is still owed" — and only
   this load, through its dependency key, not the layouts above it. */
$effect(() => {
    if (!awaitingWebhook) {
        return
    }
    const start = Date.now()
    const interval = setInterval(() => {
        if (Date.now() - start > POLL_TIMEOUT_MS) {
            timedOut = true
            clearInterval(interval)
            return
        }
        invalidate(AMOUNT_DUE_DEPENDENCY)
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
})
</script>

<svelte:head>
    <title>Pay for your party — {APP_NAME}</title>
</svelte:head>

<section class="col-span-12 mx-auto flex w-full max-w-md flex-col gap-4">
    {#if !data.hasRegistration}
        <Card>
            <CardHeader>
                <CardTitle class="flex items-center gap-2">
                    <KeyRound class="text-muted-foreground h-5 w-5" />
                    Find your registration
                </CardTitle>
            </CardHeader>
            <CardContent class="flex flex-col gap-4">
                <p class="text-muted-foreground text-sm">
                    Open the link in your registration email first, then come back to pay. If you
                    cannot find it, we can email you a fresh one.
                </p>
                <Button href="/register/recover">Resend registration link</Button>
            </CardContent>
        </Card>
    {:else if awaitingWebhook && !timedOut}
        <div class="py-12 text-center">
            <LoaderCircle class="text-primary mx-auto mb-4 h-10 w-10 animate-spin" />
            <p class="text-lg font-semibold">Confirming your payment…</p>
        </div>
    {:else if awaitingWebhook}
        <div class="flex flex-col items-center gap-4 py-12 text-center">
            <p class="text-lg font-semibold">Your payment is processing</p>
            <p class="text-muted-foreground text-sm">
                This is taking longer than usual. You will get an email when it is confirmed, so
                there is no need to pay again.
            </p>
            <Button href="/register/view">View your registration</Button>
        </div>
    {:else if !isOwed}
        <div class="flex flex-col items-center gap-4 py-12 text-center">
            <CheckCircle2 class="h-12 w-12 text-green-500" />
            <p class="text-lg font-semibold">
                {data.confirming ? 'Payment received. Thank you!' : 'Nothing to pay'}
            </p>
            <p class="text-muted-foreground text-sm">
                {data.confirming
                    ? 'A confirmation email is on its way.'
                    : 'Everyone in your party is paid for.'}
            </p>
            <Button href="/register/view">View your registration</Button>
        </div>
    {:else}
        <Card>
            <CardHeader>
                <CardTitle>Pay for your party</CardTitle>
            </CardHeader>
            <CardContent class="flex flex-col gap-4">
                <p class="text-muted-foreground text-sm">
                    An organizer added these people to your registration. Their places are not paid
                    for yet.
                </p>
                <ul class="flex flex-col gap-2 text-sm">
                    {#each data.quote.lines as line (line.memberId)}
                        <li class="flex items-baseline justify-between gap-3">
                            <span>
                                {line.name}
                                <span class="text-muted-foreground">({line.tierLabel})</span>
                            </span>
                            <PriceWithCardFee
                                priceCents={line.grossCents}
                                cardFeeCents={line.grossCents - line.netCents} />
                        </li>
                    {/each}
                </ul>
                <Separator />
                <div class="flex items-baseline justify-between gap-3 font-semibold">
                    <span>Total by card</span>
                    <span class="tabular-nums">${formatPrice(data.quote.cardTotalCents)}</span>
                </div>
                <p class="text-muted-foreground text-xs">
                    By Zelle or check it is ${formatPrice(data.quote.netCents)}, with no card fee,
                    and an organizer marks it paid when it arrives.
                </p>

                {#if form?.error}
                    <Alert variant="destructive">
                        <AlertDescription>{form.error}</AlertDescription>
                    </Alert>
                {/if}

                <!-- Enhanced only to show that something is happening: the action redirects to Stripe,
                     and a second tap while it does would otherwise look necessary. -->
                <form
                    method="POST"
                    use:enhance={() => {
                        submitting = true
                        return async ({ update }) => {
                            await update()
                            submitting = false
                        }
                    }}>
                    <Button type="submit" class="w-full" disabled={submitting}>
                        {#if submitting}
                            <LoaderCircle class="size-4 animate-spin" /> Opening payment page…
                        {:else}
                            <CreditCard class="size-4" /> Pay ${formatPrice(
                                data.quote.cardTotalCents,
                            )} by card
                        {/if}
                    </Button>
                </form>
                <p class="text-muted-foreground text-center text-xs">{STRIPE_CHECKOUT_NOTE}</p>
            </CardContent>
        </Card>

        <CheckoutSafetyNotice />
    {/if}
</section>
