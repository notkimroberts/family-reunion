<script lang="ts">
import { CircleX, ShieldCheck } from '@lucide/svelte'
import { onMount } from 'svelte'
import { Card, CardContent } from '$lib/components/ui/card'
import { ZELLE_RECIPIENT } from '$lib/general/constants'
import {
    ZELLE_RECIPIENT_PLACEHOLDER,
    paymentMethods,
    paymentSafetyCopyValue,
} from '$lib/general/scamSafety'

/* PaymentSafetyNotice in one column, for the 22rem column under the order summary. Same copy
   source, so no payment method is written here. It sat full-width in the form, between the gift
   card and Pay — on a phone, a screen of warnings in the way of paying. Under checkout it is beside
   the money it is about and after the Pay button on a phone.

   No Zelle QR code: in this width it squeezes the scan hint into a narrow strip. The full notice on / and
   /donate keeps it. */

let zelleRecipient = $state(ZELLE_RECIPIENT_PLACEHOLDER)

onMount(() => {
    zelleRecipient = ZELLE_RECIPIENT
})

let methods = $derived(paymentMethods(zelleRecipient))
</script>

<Card>
    <CardContent class="flex flex-col gap-4">
        <div class="flex items-start gap-2.5">
            <ShieldCheck class="text-primary size-5 shrink-0" />
            <div class="flex flex-col gap-0.5">
                <span class="text-sm font-semibold">{paymentSafetyCopyValue.heading}</span>
                <span class="text-muted-foreground text-xs">{paymentSafetyCopyValue.lede}</span>
            </div>
        </div>
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
    </CardContent>
</Card>
