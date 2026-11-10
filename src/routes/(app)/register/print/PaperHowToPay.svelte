<script module lang="ts">
import { ZELLE_RECIPIENT, zelleQrCodeValue } from '$lib/general/constants'
import { offlinePaymentMethods } from '$lib/general/scamSafety'

const NOTE = 'text-[9px] leading-snug text-neutral-600'
</script>

<!-- The only ways to pay, beside the total they pay. Prices are in the total's worksheet. -->
<div class="flex flex-col gap-2">
    <p class="text-[10px] leading-snug">
        Pay {offlinePaymentMethods(ZELLE_RECIPIENT)}. Never make a check out to a person.
    </p>
    <!-- Paper is where the code earns its place: the reader holds the sheet and scans it with the
         phone that pays. -->
    <div class="flex items-center gap-2">
        <img src={zelleQrCodeValue.qrPath} alt={zelleQrCodeValue.alt} class="size-[0.75in]" />
        <div class="flex max-w-[1.5in] flex-col gap-0.5">
            <img src={zelleQrCodeValue.logoPath} alt="Zelle" class="h-4 w-auto self-start" />
            <p class={NOTE}>{zelleQrCodeValue.scanHint}</p>
            <p class="text-[10px] font-semibold">{zelleQrCodeValue.accountName}</p>
        </div>
    </div>
</div>
