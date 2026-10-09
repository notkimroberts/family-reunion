<script lang="ts">
import {
    CircleX,
    CreditCard,
    PenLine,
    Receipt,
    SearchCheck,
    ShieldCheck,
    Smartphone,
} from '@lucide/svelte'
import { onMount } from 'svelte'
import { Card, CardContent } from '$lib/components/ui/card'
import { ZELLE_RECIPIENT } from '$lib/general/constants'
import { paymentMethods, paymentSafetyCopyValue, type PaymentMethod } from '$lib/general/scamSafety'
import ZelleQrCode from './ZelleQrCode.svelte'

const methodIconValue = {
    card: CreditCard,
    zelle: Smartphone,
    check: PenLine,
} satisfies Record<PaymentMethod['kind'], typeof CreditCard>

/* Until mount, the Zelle line names no address. */
const ZELLE_RECIPIENT_PLACEHOLDER = 'the reunion email address'

/* How the reunion asks for money, and what it never asks for. Many visitors are elders, the people
   a fake "organizer" message is aimed at, so this sits on every page that takes money.

   Two panels rather than a list of sentences: the accepted ways to pay and the never-list are
   different kinds of fact, and green beside red says which is which before a word is read.

   The Zelle address is the reunion email, filled in after mount like the home page's contact
   details, so plain HTML scrapers never see it. */
let { class: className = '' }: { class?: string } = $props()

let zelleRecipient = $state(ZELLE_RECIPIENT_PLACEHOLDER)

onMount(() => {
    zelleRecipient = ZELLE_RECIPIENT
})

let methods = $derived(paymentMethods(zelleRecipient))
</script>

<Card class={className}>
    <CardContent class="flex flex-col gap-5">
        <div class="flex items-start gap-3">
            <div
                class="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                <ShieldCheck class="size-5" />
            </div>
            <div class="flex flex-col gap-1">
                <h3>{paymentSafetyCopyValue.heading}</h3>
                <p class="text-muted-foreground text-base">{paymentSafetyCopyValue.lede}</p>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div
                class="flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/40">
                <p
                    class="text-xs font-semibold tracking-wider text-green-800 uppercase dark:text-green-300">
                    {paymentSafetyCopyValue.acceptedHeading}
                </p>
                <ul class="flex flex-col gap-3">
                    {#each methods as method (method.kind)}
                        {@const Icon = methodIconValue[method.kind]}
                        <li class="flex items-center gap-3">
                            <div
                                class="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                <Icon class="size-4" />
                            </div>
                            <div class="flex min-w-0 flex-col">
                                <span class="text-base font-semibold">{method.label}</span>
                                <span class="text-muted-foreground text-sm break-all"
                                    >{method.detail}</span>
                            </div>
                        </li>
                    {/each}
                </ul>
                <ZelleQrCode />
            </div>

            <div
                class="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
                <p
                    class="text-xs font-semibold tracking-wider text-red-800 uppercase dark:text-red-300">
                    {paymentSafetyCopyValue.neverHeading}
                </p>
                <ul class="flex flex-col gap-2.5">
                    {#each paymentSafetyCopyValue.neverAskedFor as item (item)}
                        <li class="flex items-start gap-2.5 text-base">
                            <CircleX
                                class="size-5 shrink-0 translate-y-0.5 text-red-600 dark:text-red-400" />
                            <span>{item}</span>
                        </li>
                    {/each}
                </ul>
            </div>
        </div>

        <div class="flex flex-col gap-2 border-t pt-4">
            <p class="flex items-start gap-2.5 text-base">
                <SearchCheck class="text-primary size-5 shrink-0 translate-y-0.5" />
                <span>{paymentSafetyCopyValue.verifyLine}</span>
            </p>
            <p class="text-muted-foreground flex items-start gap-2.5 text-sm">
                <Receipt class="size-5 shrink-0" />
                <span>{paymentSafetyCopyValue.statementLine}</span>
            </p>
        </div>
    </CardContent>
</Card>
