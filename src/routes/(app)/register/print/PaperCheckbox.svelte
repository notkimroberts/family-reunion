<script lang="ts">
/* A tick box with its answer printed beside it. Replaces the first draft's unlabelled grid cells:
   a column of 22px cells under an "XS S M L…" header asks the reader to count across to find
   their size, which is exactly the kind of thing that goes wrong on paper. */
let { label }: { label: string } = $props()
</script>

<span class="inline-flex items-center gap-1 whitespace-nowrap">
    <span class="inline-block h-[13px] w-[13px] shrink-0 border border-neutral-700"></span>
    <span class="text-[10px] leading-none">{label}</span>
</span>
