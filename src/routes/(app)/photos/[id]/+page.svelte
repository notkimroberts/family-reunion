<script lang="ts">
import { ArrowLeft, ChevronLeft, ChevronRight, Download } from '@lucide/svelte'
import { goto, preloadData } from '$app/navigation'
import { page } from '$app/state'
import { Button } from '$lib/components/ui/button'
import { APP_NAME } from '$lib/general/constants'
import type { PageData } from './$types'

type Props = { data: PageData }
let { data }: Props = $props()

let title = $derived(data.photo.caption ?? `Photograph from the ${APP_NAME}`)
/* Absolute, because og:image is fetched by a crawler with no page context to resolve against. */
let imageUrl = $derived(new URL(`/api/photos/${data.photo.id}/display`, page.url.origin).href)

/* The year filter rides along, so arrows walk the set the visitor was actually looking at. */
let suffix = $derived(data.year ? `?year=${data.year}` : '')
let previousHref = $derived(
    data.neighbours.previousId ? `/photos/${data.neighbours.previousId}${suffix}` : undefined,
)
let nextHref = $derived(
    data.neighbours.nextId ? `/photos/${data.neighbours.nextId}${suffix}` : undefined,
)
let galleryHref = $derived(`/photos${suffix}`)

/* Warm the neighbours so an arrow tap is instant rather than a visible load. preloadData fetches
   the page data only; the browser then has the <img> URL early enough to start it too. */
$effect(() => {
    for (const href of [previousHref, nextHref]) {
        if (href) {
            void preloadData(href)
        }
    }
})

function handleKeydown(event: KeyboardEvent) {
    /* Ignore while a field has focus, or the arrows would fight the caret. */
    const target = event.target as HTMLElement | null
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return
    }
    if (event.key === 'ArrowLeft' && previousHref) {
        void goto(previousHref)
    }
    if (event.key === 'ArrowRight' && nextHref) {
        void goto(nextHref)
    }
}

/* Swipe, because this is mostly read on a phone and reaching for a small arrow with one thumb is
   worse than the gesture everyone already expects from a photo viewer. Horizontal only, and only
   past a threshold, so a vertical scroll is never mistaken for a swipe. */
const SWIPE_THRESHOLD_PX = 60
let touchStartX = 0
let touchStartY = 0

function handleTouchStart(event: TouchEvent) {
    touchStartX = event.changedTouches[0].screenX
    touchStartY = event.changedTouches[0].screenY
}

function handleTouchEnd(event: TouchEvent) {
    const deltaX = event.changedTouches[0].screenX - touchStartX
    const deltaY = event.changedTouches[0].screenY - touchStartY
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaY) > Math.abs(deltaX)) {
        return
    }
    const href = deltaX < 0 ? nextHref : previousHref
    if (href) {
        void goto(href)
    }
}
</script>

<svelte:head>
    <title>{title}</title>
    <meta name="description" content={title} />
    <meta property="og:type" content="article" />
    <meta property="og:title" content={title} />
    <meta property="og:image" content={imageUrl} />
    <meta property="og:image:width" content={String(data.photo.width)} />
    <meta property="og:image:height" content={String(data.photo.height)} />
    <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<section class="col-span-12 flex flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
        <a
            href={galleryHref}
            class="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm">
            <ArrowLeft class="size-4" />
            All photos{data.year ? ` · ${data.year}` : ''}
        </a>
        <p class="text-muted-foreground text-sm tabular-nums">
            {data.neighbours.position} of {data.neighbours.total}
        </p>
    </div>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="relative" ontouchstart={handleTouchStart} ontouchend={handleTouchEnd}>
        <img
            src="/api/photos/{data.photo.id}/display"
            alt={data.photo.caption ?? 'Family reunion photograph'}
            width={data.photo.width}
            height={data.photo.height}
            class="bg-muted max-h-[75vh] w-full rounded-lg object-contain" />

        <!-- Overlaid on desktop where there is room beside the photo; the pair below carries
             mobile, where an overlay would sit under a thumb mid-swipe. -->
        {#if previousHref}
            <a
                href={previousHref}
                aria-label="Previous photo"
                class="bg-background/80 hover:bg-background absolute top-1/2 left-2 hidden -translate-y-1/2 rounded-full border p-2 shadow-sm sm:block">
                <ChevronLeft class="size-5" />
            </a>
        {/if}
        {#if nextHref}
            <a
                href={nextHref}
                aria-label="Next photo"
                class="bg-background/80 hover:bg-background absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-full border p-2 shadow-sm sm:block">
                <ChevronRight class="size-5" />
            </a>
        {/if}
    </div>

    <div class="flex items-center justify-between gap-2">
        <Button
            href={previousHref}
            variant="outline"
            size="sm"
            disabled={!previousHref}
            aria-label="Previous photo">
            <ChevronLeft class="size-4" />
            Previous
        </Button>

        <Button href="/api/photos/{data.photo.id}/display?download" size="sm">
            <Download class="size-4" />
            Download
        </Button>

        <Button
            href={nextHref}
            variant="outline"
            size="sm"
            disabled={!nextHref}
            aria-label="Next photo">
            Next
            <ChevronRight class="size-4" />
        </Button>
    </div>

    {#if data.photo.caption || data.photo.contributorName || data.photo.takenYear}
        <div class="flex flex-col gap-1">
            {#if data.photo.caption}
                <p class="break-words">{data.photo.caption}</p>
            {/if}
            <p class="text-muted-foreground text-sm">
                {#if data.photo.takenYear}{data.photo.takenYear}{/if}
                {#if data.photo.takenYear && data.photo.contributorName}·{/if}
                {#if data.photo.contributorName}Shared by {data.photo.contributorName}{/if}
            </p>
        </div>
    {/if}
</section>
