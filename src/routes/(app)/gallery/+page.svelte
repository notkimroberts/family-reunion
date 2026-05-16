<script lang="ts">
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'

let { data } = $props()
let selectedEventId = $state('all')

let filteredPhotos = $derived(
    selectedEventId === 'all'
        ? data.photos
        : data.photos.filter((p) => p.eventId === selectedEventId),
)
</script>

<section class="col-span-12">
    <Card>
        <CardContent class="pt-4">
            <div class="flex justify-between items-center flex-wrap gap-4">
                <select
                    class="border rounded-md px-3 py-1.5 text-sm bg-background"
                    bind:value={selectedEventId}>
                    <option value="all">All Years</option>
                    {#each data.events as event}
                        <option value={event.id}>{event.title} ({event.year})</option>
                    {/each}
                </select>
                <Button href="/gallery/upload" size="sm">Upload Photos</Button>
            </div>
        </CardContent>
    </Card>
</section>

{#if filteredPhotos.length === 0}
    <section class="col-span-12 text-center py-12">
        <p class="text-muted-foreground text-lg">No photos yet.</p>
        <Button href="/gallery/upload" class="mt-4">Be the first to upload!</Button>
    </section>
{:else}
    <section class="col-span-12">
        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {#each filteredPhotos as photo}
                <Card class="overflow-hidden">
                    <img
                        src={photo.url}
                        alt={photo.caption ?? 'Family reunion photo'}
                        class="aspect-square w-full object-cover"
                        loading="lazy" />
                    {#if photo.caption}
                        <CardContent class="py-2 px-3">
                            <p class="text-xs text-muted-foreground truncate">{photo.caption}</p>
                        </CardContent>
                    {/if}
                </Card>
            {/each}
        </div>
    </section>
{/if}
