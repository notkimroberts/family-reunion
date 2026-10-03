<script lang="ts">
import { ChevronDown, type IconProps } from '@lucide/svelte'
import type { Component, Snippet } from 'svelte'

/* A collapsed, labelled section of a location card — room rates, parking. Native <details>, so it
   opens with no JavaScript and is keyboard- and screen-reader-operable as is. */
let {
    label,
    icon: Icon,
    children,
}: {
    label: string
    icon: Component<IconProps>
    children: Snippet
} = $props()
</script>

<details class="group rounded-lg border">
    <summary
        class="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span class="inline-flex items-center gap-1.5">
            <Icon class="text-muted-foreground size-4" />
            {label}
        </span>
        <ChevronDown
            class="text-muted-foreground size-4 transition-transform group-open:rotate-180" />
    </summary>
    <div class="border-t px-3 py-3">
        {@render children()}
    </div>
</details>
