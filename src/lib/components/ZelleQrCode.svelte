<script lang="ts">
import { zelleQrCodeValue } from '$lib/general/constants'
import { cn } from '$lib/utils'

/* The Zelle QR code with the Zelle logo and the account name the payer's bank will show. Always on
   white, in both themes: a scanner needs dark modules on a light ground, and the logo is purple on
   transparent. */
let { class: className = '' }: { class?: string } = $props()
</script>

<div class={cn('flex items-center gap-4 rounded-lg bg-white p-3 text-neutral-900', className)}>
    <img
        src={zelleQrCodeValue.qrPath}
        alt={zelleQrCodeValue.alt}
        width="128"
        height="128"
        class="size-32 shrink-0" />
    <div class="flex min-w-0 flex-col gap-1.5">
        <img
            src={zelleQrCodeValue.logoPath}
            alt="Zelle"
            width="70"
            height="31"
            class="h-7 w-auto self-start" />
        <p class="text-sm">{zelleQrCodeValue.scanHint}</p>
        <p class="text-sm font-semibold">{zelleQrCodeValue.accountName}</p>
    </div>
</div>
