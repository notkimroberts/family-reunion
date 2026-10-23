<script module lang="ts">
import { ZELLE_RECIPIENT, zelleQrCodeValue } from '$lib/general/constants'
import { offlinePaymentMethods } from '$lib/general/scamSafety'
import { formatPrice } from '$lib/utils'

const NOTE = 'text-[9px] leading-snug text-neutral-600'
</script>

<script lang="ts">
import type { TierOption } from '../types'

/* What a place costs and the only ways to pay for one. The total is written on page 2, under the
   attendees it adds up. */
let { tiers }: { tiers: TierOption[] } = $props()
</script>

<div class="flex items-center justify-between gap-6">
    <div class="flex min-w-0 flex-col gap-1">
        <ul class="flex flex-wrap gap-x-5 gap-y-0.5 text-[10px]">
            {#each tiers as tier (tier.id)}
                <li class="whitespace-nowrap">
                    <span class="font-semibold">{tier.label}</span>
                    · ${formatPrice(tier.priceCents)} per person
                </li>
            {/each}
        </ul>
        <p class={NOTE}>
            Pay {offlinePaymentMethods(ZELLE_RECIPIENT)}. Never make a check out to a person.
        </p>
    </div>
    <!-- Paper is where the code earns its place: the reader holds the sheet and scans it with the
         phone that pays. -->
    <div class="flex shrink-0 items-center gap-2">
        <img src={zelleQrCodeValue.qrPath} alt={zelleQrCodeValue.alt} class="size-[0.85in]" />
        <div class="flex max-w-[1.5in] flex-col gap-0.5">
            <img src={zelleQrCodeValue.logoPath} alt="Zelle" class="h-4 w-auto self-start" />
            <p class={NOTE}>{zelleQrCodeValue.scanHint}</p>
            <p class="text-[10px] font-semibold">{zelleQrCodeValue.accountName}</p>
        </div>
    </div>
</div>
