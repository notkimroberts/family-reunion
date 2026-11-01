<script lang="ts">
import type { CircleHelp } from '@lucide/svelte'
import type { Snippet } from 'svelte'

/* One group of questions: an icon and a heading, then the questions in one card, ruled apart. The id
   is the jump-nav target; scroll-mt clears the site header and the sticky jump bar. */
let {
    id,
    title,
    icon: Icon,
    children,
}: { id: string; title: string; icon: typeof CircleHelp; children: Snippet } = $props()
</script>

<section {id} class="flex scroll-mt-36 flex-col gap-4 md:scroll-mt-40">
    <div class="flex items-center gap-3">
        <span
            class="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Icon class="size-5" />
        </span>
        <h2>{title}</h2>
    </div>
    <div class="bg-card divide-y rounded-2xl border">
        {@render children()}
    </div>
</section>
