<script lang="ts">
import { Camera, ImageOff } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import type { PageData } from './$types'

type Props = { data: PageData }
let { data }: Props = $props()

let lightboxId = $state<string | undefined>(undefined)

const lightboxPhoto = $derived(data.photos.find((photo) => photo.id === lightboxId))

function handleClose() {
    lightboxId = undefined
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
                {data.photos.length}
                {data.photos.length === 1 ? 'photograph' : 'photographs'} from reunions past and present.
            </p>
        </div>
        <Button href="/photos/contribute" class="shrink-0">
            <Camera class="size-4" />
            Add your photos
        </Button>
    </div>

    {#if data.photos.length === 0}
        <div
            class="border-border text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
            <ImageOff class="size-8" />
            <p>No photos yet. Be the first to add one.</p>
        </div>
    {:else}
        <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {#each data.photos as photo (photo.id)}
                <li>
                    <button
                        type="button"
                        class="focus-visible:ring-ring bg-muted block w-full overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                        onclick={() => (lightboxId = photo.id)}>
                        <img
                            src="/api/photos/{photo.id}/thumb"
                            alt={photo.caption ?? 'Family reunion photograph'}
                            width={photo.width}
                            height={photo.height}
                            loading="lazy"
                            decoding="async"
                            class="aspect-square w-full object-cover transition-opacity hover:opacity-90" />
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</section>

{#if lightboxPhoto}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4"
        onclick={handleClose}>
        <img
            src="/api/photos/{lightboxPhoto.id}/display"
            alt={lightboxPhoto.caption ?? 'Family reunion photograph'}
            class="max-h-[80vh] max-w-full rounded-lg object-contain" />
        {#if lightboxPhoto.caption || lightboxPhoto.contributorName || lightboxPhoto.takenYear}
            <p class="max-w-prose text-center text-sm text-white">
                {#if lightboxPhoto.caption}{lightboxPhoto.caption}{/if}
                {#if lightboxPhoto.takenYear}
                    <span class="text-white/70">({lightboxPhoto.takenYear})</span>
                {/if}
                {#if lightboxPhoto.contributorName}
                    <span class="text-white/70">— {lightboxPhoto.contributorName}</span>
                {/if}
            </p>
        {/if}
        <Button variant="secondary" onclick={handleClose}>Close</Button>
    </div>
{/if}
