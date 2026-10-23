<script module lang="ts">
import { QrCode } from '$lib/components'
import { REGISTER_ADDRESS } from './REGISTER_ADDRESS'
</script>

<!-- The sheet's first job is to send its reader online: a booking made there is paid, confirmed and
     counted without an organizer retyping it. The address is printed whole beside the code for a
     reader with no camera. A div, not a section: the print rules in app.css flatten every section
     of the sheet to block layout, which would stack the code above the text. -->
<div class="flex break-inside-avoid items-center gap-4 border-2 border-black p-3">
    <QrCode
        value="https://{REGISTER_ADDRESS}"
        label="QR code for {REGISTER_ADDRESS}"
        class="size-[1.2in] shrink-0 rounded-none" />
    <div class="flex min-w-0 flex-col gap-1">
        <p class="text-[11px] font-bold tracking-widest uppercase">
            The fastest way to register is online
        </p>
        <p class="text-[24px] leading-tight font-bold wrap-break-word">{REGISTER_ADDRESS}</p>
        <p class="text-[11px] leading-snug">
            Point your phone's camera at the code, or type the address into a web browser. Pay by
            card, and your confirmation arrives by email right away. A relative can register your
            whole party for you.
        </p>
        <p class="text-[10px] font-semibold">
            Use this paper form only if you cannot register online.
        </p>
    </div>
</div>
