<script lang="ts" generics="T extends string">
import { ChevronDown } from '@lucide/svelte'
import type { Snippet } from 'svelte'
import { cn } from '$lib/utils.js'

/* A native <select> styled to match Input, used in place of bits-ui's Select for form fields.

   bits-ui renders its trigger as a <button>, and Safari omits buttons from the Tab order unless
   "Press Tab to highlight each item on a webpage" is enabled — off by default. Every Select in the
   registration form was therefore unreachable by Tab in Safari, including four required fields, so
   a keyboard user tabbed past them and met a submit button that stayed disabled with no
   explanation. A <select> is a Tab stop in every browser.

   appearance-none plus our own chevron, because the native arrow cannot be restyled. The caller
   supplies the options, so it decides whether an empty one is a disabled placeholder or a real
   selectable value. */
let {
    value = $bindable(),
    id,
    name,
    class: className,
    children,
}: {
    value: T
    id?: string
    name?: string
    class?: string
    children: Snippet
} = $props()
</script>

<div class="relative">
    <select
        {id}
        {name}
        bind:value
        data-slot="native-select"
        class={cn(
            'dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 h-9 w-full appearance-none rounded-md border bg-transparent py-1 pr-8 pl-2.5 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-3 aria-invalid:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            className,
        )}
        class:text-muted-foreground={!value}>
        {@render children()}
    </select>
    <ChevronDown
        class="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2" />
</div>
