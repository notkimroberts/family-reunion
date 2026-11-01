<script lang="ts">
import type { Snippet } from 'svelte'

/* One question and its answer, always open. An accordion would hide the answers behind a tap and from
   the browser's find-in-page, and the readers this page is for are the ones least likely to try either. */
let { question, children }: { question: string; children: Snippet } = $props()
</script>

<article class="flex flex-col gap-2 p-5 md:p-6">
    <h3>{question}</h3>
    <div class="text-foreground/80 flex flex-col gap-3 text-base leading-relaxed">
        {@render children()}
    </div>
</article>
