<script module lang="ts">
const GROUP_LABEL = 'text-[9px] font-semibold uppercase tracking-widest text-neutral-500'
const DATE_PART = 'flex flex-col items-center gap-0.5'
const DATE_RULE = 'h-7 w-full border-b border-neutral-500'
const DATE_CAPTION = 'text-[7px] uppercase tracking-widest text-neutral-400'
</script>

<!-- Month / day / year blanks. Optional, as on the online form. -->
<div class="flex w-[1.9in] shrink-0 flex-col gap-0.5">
    <span class={GROUP_LABEL}>Birth date (optional)</span>
    <div class="flex items-end gap-1">
        <div class="{DATE_PART} w-[0.44in]">
            <div class={DATE_RULE}></div>
            <span class={DATE_CAPTION}>Month</span>
        </div>
        <span class="pb-3 text-[11px] text-neutral-400">/</span>
        <div class="{DATE_PART} w-[0.44in]">
            <div class={DATE_RULE}></div>
            <span class={DATE_CAPTION}>Day</span>
        </div>
        <span class="pb-3 text-[11px] text-neutral-400">/</span>
        <div class="{DATE_PART} w-[0.72in]">
            <div class={DATE_RULE}></div>
            <span class={DATE_CAPTION}>Year</span>
        </div>
    </div>
</div>
