<script lang="ts">
import { Camera, Download, ImageOff } from '@lucide/svelte'
import { page } from '$app/state'
import { Button } from '$lib/components/ui/button'
import { cn } from '$lib/utils'
import type { PageData } from './$types'

type Props = { data: PageData }
let { data }: Props = $props()

/* The filter lives in the URL so a year is shareable and survives the back button out of a photo,
   the same reasoning as the admin lens. Absent means all years. */
let selectedYear = $derived.by(() => {
    const raw = page.url.searchParams.get('year')
    const parsed = Number.parseInt(raw ?? '', 10)
    return Number.isInteger(parsed) ? parsed : undefined
})

let visible = $derived(
    selectedYear ? data.photos.filter((photo) => photo.takenYear === selectedYear) : data.photos,
)

function yearHref(year: number | undefined) {
    const url = new URL(page.url)
    if (year) {
        url.searchParams.set('year', String(year))
    } else {
        url.searchParams.delete('year')
    }
    return url.pathname + url.search
}
</script>

<svelte:head>
    <title>Photos · Patterson Family Reunion</title>
    <meta
        name="description"
        content="Photographs from Patterson family reunions past and present." />
</svelte:head>

<section class="col-span-12 flex flex-col gap-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="flex flex-col gap-2">
            <h1>Family photos</h1>
            <p class="text-muted-foreground">
                {visible.length}
                {visible.length === 1 ? 'photograph' : 'photographs'}{selectedYear
                    ? ` from ${selectedYear}`
                    : ''}.
            </p>
        </div>
        <Button href="/photos/contribute" class="shrink-0">
            <Camera class="size-4" />
            Add your photos
        </Button>
    </div>

    {#if data.years.length > 0}
        <!-- Year chips double as the download control: the zip is per year, so the year you are
             looking at is the year you get. Only rendered when a year exists to pick. -->
        <div class="flex flex-wrap items-center gap-2">
            {#if data.years.length > 1}
                <a
                    href={yearHref(undefined)}
                    class={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        selectedYear
                            ? 'text-muted-foreground'
                            : 'bg-primary text-primary-foreground',
                    )}>
                    All years
                </a>
            {/if}
            {#each data.years as year (year.year)}
                <a
                    href={yearHref(year.year)}
                    class={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        selectedYear === year.year
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                    )}>
                    {year.year}
                    <span class="opacity-70">({year.photoCount})</span>
                </a>
            {/each}

            {#if selectedYear || data.years.length === 1}
                {@const downloadYear = selectedYear ?? data.years[0].year}
                <Button
                    href="/api/photos/year/{downloadYear}/zip"
                    variant="outline"
                    size="sm"
                    class="ml-auto shrink-0"
                    download>
                    <Download class="size-3.5" />
                    Download {downloadYear}
                </Button>
            {/if}
        </div>
    {/if}

    {#if visible.length === 0}
        <div
            class="border-border text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
            <ImageOff class="size-8" />
            <p>No photos yet. Be the first to add one.</p>
        </div>
    {:else}
        <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {#each visible as photo (photo.id)}
                <li>
                    <!-- A real link, not a lightbox: every photo has a shareable URL, and this is
                         what makes it reachable and crawlable. -->
                    <a
                        href="/photos/{photo.id}"
                        class="focus-visible:ring-ring bg-muted block overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:outline-none">
                        <img
                            src="/api/photos/{photo.id}/thumb"
                            alt={photo.caption ?? 'Family reunion photograph'}
                            width={photo.width}
                            height={photo.height}
                            loading="lazy"
                            decoding="async"
                            class="aspect-square w-full object-cover transition-opacity hover:opacity-90" />
                    </a>
                </li>
            {/each}
        </ul>
    {/if}
</section>
