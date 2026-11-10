<script lang="ts">
/* A mark-one circle with its answer printed beside it. A circle, not a square: every group on the
   sheet takes one answer, and a row of circles is the paper convention for "pick one" where squares
   read as "tick all that apply". Replaces the first draft's unlabeled grid cells: a column of 22px
   cells under an "XS S M L…" header asks the reader to count across to find their size. */
let { label }: { label: string } = $props()
</script>

<span class="inline-flex items-center gap-1 whitespace-nowrap">
    <span class="inline-block h-[13px] w-[13px] shrink-0 rounded-full border border-neutral-700"
    ></span>
    <span class="text-[10px] leading-none">{label}</span>
</span>
