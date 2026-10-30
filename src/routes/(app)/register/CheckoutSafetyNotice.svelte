<script lang="ts">
import { CircleX, ShieldCheck } from '@lucide/svelte'
import { onMount, tick } from 'svelte'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import { WARNING_SURFACE_CLASS, ZELLE_RECIPIENT } from '$lib/general/constants'
import { REGISTRATION_STATUS_STYLES } from '$lib/general/constants/REGISTRATION_STATUS_STYLES'
import {
    ZELLE_RECIPIENT_PLACEHOLDER,
    paymentMethods,
    paymentSafetyCopyValue,
} from '$lib/general/scamSafety'
import { cn } from '$lib/utils'

/* PaymentSafetyNotice in one column, for the 22rem column under the order summary. Same copy
   source, so no payment method is written here. It sat full-width in the form, between the gift
   card and Pay — on a phone, a screen of warnings in the way of paying. Beside the order summary it
   is next to the money it is about; on a phone it comes before the summary, so it is read before
   Pay.

   No Zelle QR code: in this width it squeezes the scan hint into a narrow strip. The full notice on / and
   /donate keeps it. */

/* Green once ticked — the Paid badge's colors — so the box visibly changes state. */
const ACKNOWLEDGED_CLASS = REGISTRATION_STATUS_STYLES.paid.class

/* requireAcknowledgment adds a checkbox the registrant must tick before paying on /register — the
   notice only protects someone who has read it. Off by default: the same card sits on /register/pay,
   where nothing is gated on it. */
let {
    requireAcknowledgment = false,
    acknowledged = $bindable(false),
    error,
}: {
    requireAcknowledgment?: boolean
    acknowledged?: boolean
    error?: string
} = $props()

let zelleRecipient = $state(ZELLE_RECIPIENT_PLACEHOLDER)
let checkbox = $state<HTMLInputElement>()
let card = $state<HTMLDivElement | null>(null)
/* Ticked means read, so the notice shrinks to its heading and the ticked box — on a phone it is a
   screen tall, between the reader and the order summary under it. "Show again" re-opens it. */
let expanded = $state(false)
let collapsed = $derived(requireAcknowledgment && acknowledged && !expanded)

/* Collapsing shrinks the page above the reader, who is at the checkbox, its foot; without a scroll
   they land past the summary. Bring the card's top back into view, with the summary below it. */
async function handleAcknowledgedChange() {
    if (!acknowledged) {
        return
    }
    expanded = false
    await tick()
    card?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* Brings the checkbox into view and focuses it, for CheckoutBar's "Read the safety notice" — on a
   phone the notice is a screen below the button. */
export function reveal() {
    checkbox?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    checkbox?.focus({ preventScroll: true })
}

onMount(() => {
    zelleRecipient = ZELLE_RECIPIENT
})

let methods = $derived(paymentMethods(zelleRecipient))
</script>

<!-- scroll-mt clears the sticky AppHeader (h-16, md:h-20). -->
<Card bind:ref={card} class="scroll-mt-20 md:scroll-mt-24">
    <CardContent class="flex flex-col gap-4">
        <div class="flex items-start gap-2.5">
            <ShieldCheck class="text-primary size-5 shrink-0" />
            <div class="flex flex-col gap-0.5">
                <span class="text-sm font-semibold">{paymentSafetyCopyValue.heading}</span>
                {#if !collapsed}
                    <span class="text-muted-foreground text-xs">{paymentSafetyCopyValue.lede}</span>
                {/if}
            </div>
            {#if collapsed}
                <Button
                    type="button"
                    variant="link"
                    size="sm"
                    class="ml-auto h-auto p-0"
                    onclick={() => (expanded = true)}>
                    Show again
                </Button>
            {/if}
        </div>
        {#if !collapsed}
            <div class="flex flex-col gap-2">
                <p
                    class="text-xs font-semibold tracking-wider text-green-800 uppercase dark:text-green-300">
                    {paymentSafetyCopyValue.acceptedHeading}
                </p>
                <ul class="flex flex-col gap-1.5 text-sm">
                    {#each methods as method (method.kind)}
                        <li>
                            <span class="font-semibold">{method.label}</span>
                            <span class="text-muted-foreground break-all">{method.detail}</span>
                        </li>
                    {/each}
                </ul>
            </div>
            <div class="flex flex-col gap-2">
                <p
                    class="text-xs font-semibold tracking-wider text-red-800 uppercase dark:text-red-300">
                    {paymentSafetyCopyValue.neverHeading}
                </p>
                <ul class="flex flex-col gap-1.5">
                    {#each paymentSafetyCopyValue.neverAskedFor as item (item)}
                        <li class="flex items-start gap-2 text-sm">
                            <CircleX
                                class="size-4 shrink-0 translate-y-0.5 text-red-600 dark:text-red-400" />
                            <span>{item}</span>
                        </li>
                    {/each}
                </ul>
            </div>
            <div class="text-muted-foreground flex flex-col gap-2 border-t pt-3 text-xs">
                <p>{paymentSafetyCopyValue.verifyLine}</p>
                <p>{paymentSafetyCopyValue.statementLine}</p>
            </div>
        {/if}
        {#if requireAcknowledgment}
            <div class="flex flex-col gap-1.5">
                <!-- The label is the tap target, at 44px; the box itself opts out of the 44px
                     input minimum in app.css, which would stretch it. -->
                <label
                    class={cn(
                        'flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border-2 p-3 text-sm font-medium',
                        acknowledged ? ACKNOWLEDGED_CLASS : WARNING_SURFACE_CLASS,
                    )}>
                    <input
                        bind:this={checkbox}
                        type="checkbox"
                        bind:checked={acknowledged}
                        onchange={handleAcknowledgedChange}
                        aria-invalid={error ? true : undefined}
                        class="accent-primary mt-0.5 size-5 min-h-0 shrink-0" />
                    <span>{paymentSafetyCopyValue.acknowledgment}</span>
                </label>
                {#if error}
                    <p role="alert" class="text-destructive text-xs">{error}</p>
                {/if}
            </div>
        {/if}
    </CardContent>
</Card>
