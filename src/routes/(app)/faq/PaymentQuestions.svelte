<script lang="ts">
import { CreditCard, PenLine, ShieldCheck, Smartphone, Wallet } from '@lucide/svelte'
import { onMount } from 'svelte'
import { ZELLE_RECIPIENT } from '$lib/general/constants'
import {
    ZELLE_RECIPIENT_PLACEHOLDER,
    paymentMethods,
    paymentSafetyCopyValue,
    type PaymentMethod,
} from '$lib/general/scamSafety'
import FaqItem from './FaqItem.svelte'
import FaqSection from './FaqSection.svelte'

const methodIconValue = {
    card: CreditCard,
    zelle: Smartphone,
    check: PenLine,
} satisfies Record<PaymentMethod['kind'], typeof CreditCard>

/* The ways to pay and the never-list come from scamSafety, like every other surface that asks for
   money. The Zelle address is filled in after mount, as PaymentSafetyNotice does. */
let zelleRecipient = $state(ZELLE_RECIPIENT_PLACEHOLDER)

onMount(() => {
    zelleRecipient = ZELLE_RECIPIENT
})

let methods = $derived(paymentMethods(zelleRecipient))
</script>

<FaqSection id="paying" title="Paying" icon={Wallet}>
    <FaqItem question="How can I pay?">
        <p>There are only three ways to pay:</p>
        <!-- A sentence per way, not label-and-value columns: the Zelle address cannot break, and a
             column too narrow for it split it mid-word. -->
        <ul class="bg-muted/50 flex flex-col divide-y rounded-xl border">
            {#each methods as method (method.kind)}
                {@const Icon = methodIconValue[method.kind]}
                <li class="flex items-start gap-3 px-4 py-3">
                    <Icon class="text-primary mt-1 size-4 shrink-0" />
                    <span class="wrap-anywhere">
                        <strong class="text-foreground">{method.label}</strong>
                        {method.detail}
                    </span>
                </li>
            {/each}
        </ul>
    </FaqItem>

    <FaqItem question="How do I know a message asking for money is really from you?">
        <p>{paymentSafetyCopyValue.lede} We never ask for:</p>
        <ul class="flex list-disc flex-col gap-1 ps-5">
            {#each paymentSafetyCopyValue.neverAskedFor as item (item)}
                <li>{item}</li>
            {/each}
        </ul>
        <p class="flex gap-2">
            <ShieldCheck class="text-primary mt-1 size-4 shrink-0" />
            <span>{paymentSafetyCopyValue.verifyLine}</span>
        </p>
    </FaqItem>
</FaqSection>
