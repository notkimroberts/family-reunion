<script lang="ts">
import PageTitle from '$lib/components/PageTitle.svelte'

let { data } = $props()
let selectedEventId = $state('all')

let filteredPhotos = $derived(
    selectedEventId === 'all'
        ? data.photos
        : data.photos.filter((p) => p.eventId === selectedEventId),
)
</script>

<PageTitle title="Gallery" />

<div class="max-w-6xl mx-auto p-6">
    <div class="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 class="text-3xl font-bold">Photo Gallery</h1>
        <div class="flex gap-3 items-center">
            <select class="select select-sm" bind:value={selectedEventId}>
                <option value="all">All Years</option>
                {#each data.events as event}
                    <option value={event.id}>{event.title} ({event.year})</option>
                {/each}
            </select>
            <a href="/gallery/upload" class="btn btn-primary btn-sm">Upload Photos</a>
        </div>
    </div>

    {#if filteredPhotos.length === 0}
        <div class="text-center py-12">
            <p class="text-base-content/60 text-lg">No photos yet.</p>
            <a href="/gallery/upload" class="btn btn-primary mt-4">Be the first to upload!</a>
        </div>
    {:else}
        <div class="columns-1 sm:columns-2 md:columns-3 gap-4 space-y-4">
            {#each filteredPhotos as photo}
                <div class="break-inside-avoid">
                    <div class="card bg-base-100 shadow-xs overflow-hidden">
                        <figure>
                            <img
                                src={photo.url}
                                alt={photo.caption ?? 'Family reunion photo'}
                                class="w-full"
                                loading="lazy" />
                        </figure>
                        {#if photo.caption}
                            <div class="p-3">
                                <p class="text-sm">{photo.caption}</p>
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
