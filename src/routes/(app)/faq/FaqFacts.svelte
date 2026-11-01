<script lang="ts">
/* Label-and-value rows inside an answer — prices, room rates — so the figure people compare sits in its
   own column instead of mid-sentence. */
let { rows }: { rows: { label: string; value: string }[] } = $props()
</script>

<dl class="bg-muted/50 flex flex-col divide-y rounded-xl border">
    {#each rows as row (row.label)}
        <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-3">
            <dt class="text-foreground">{row.label}</dt>
            <dd class="text-foreground font-semibold wrap-anywhere tabular-nums">{row.value}</dd>
        </div>
    {/each}
</dl>
