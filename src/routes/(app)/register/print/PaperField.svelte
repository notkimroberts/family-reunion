<script lang="ts">
import { cn } from '$lib/utils'

/* One labelled write-on blank. The label sits above the rule rather than beside it so the whole
   width of the field is writable, and the rule is 0.35in tall — a hand-written capital is about
   0.2in, and the first draft's 22px left no room for a descender or a shaky line. */
let { label, class: className = '' }: { label: string; class?: string } = $props()
</script>

<div class={cn('flex flex-col gap-0.5', className)}>
    <span class="text-[9px] font-semibold tracking-widest text-neutral-500 uppercase">
        {label}
    </span>
    <div class="h-8.5 border-b border-neutral-500"></div>
</div>
