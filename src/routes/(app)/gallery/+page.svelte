<script lang="ts">
let { data } = $props()
let selectedEventId = $state('all')

let filteredPhotos = $derived(
    selectedEventId === 'all'
        ? data.photos
        : data.photos.filter((p) => p.eventId === selectedEventId),
)
</script>

<section class="card bg-base-100 col-span-12 shadow-xs">
    <div class="card-body">
        <div class="flex justify-between items-center flex-wrap gap-4">
            <div class="flex gap-3 items-center">
                <select class="select select-sm" bind:value={selectedEventId}>
                    <option value="all">All Years</option>
                    {#each data.events as event}
                        <option value={event.id}>{event.title} ({event.year})</option>
                    {/each}
                </select>
            </div>
            <a href="/gallery/upload" class="btn btn-primary btn-sm">Upload Photos</a>
        </div>
    </div>
</section>

{#if filteredPhotos.length === 0}
    <section class="col-span-12 text-center py-12">
        <p class="text-base-content/60 text-lg">No photos yet.</p>
        <a href="/gallery/upload" class="btn btn-primary mt-4">Be the first to upload!</a>
    </section>
{:else}
    <section class="col-span-12">
        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {#each filteredPhotos as photo}
                <div class="card bg-base-100 shadow-xs overflow-hidden">
                    <figure>
                        <img
                            src={photo.url}
                            alt={photo.caption ?? 'Family reunion photo'}
                            class="aspect-square w-full object-cover"
                            loading="lazy" />
                    </figure>
                    {#if photo.caption}
                        <div class="p-2">
                            <p class="text-xs text-base-content/70 truncate">{photo.caption}</p>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </section>
{/if}
