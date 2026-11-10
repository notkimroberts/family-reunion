<script module lang="ts">
import {
    CHECK_PAYEE,
    MAILING_ADDRESS,
    ZELLE_RECIPIENT,
    zelleQrCodeValue,
} from '$lib/general/constants'
import { offlinePaymentMethods } from '$lib/general/scamSafety'

const NOTE = 'text-[9px] leading-snug text-neutral-600'
</script>

<script lang="ts">
/* Where to send the finished form and the only ways to pay, beside the total they pay. Last on the
   sheet because it is the last thing the reader does. `deadline` is " by <day>", or '' when the
   event has no lock date. */
let { deadline }: { deadline: string } = $props()
</script>

<div class="flex flex-col gap-2">
    <p class="text-[10px] leading-snug font-semibold">
        Mail this signed form to {CHECK_PAYEE}, {MAILING_ADDRESS}{deadline}.
    </p>
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
