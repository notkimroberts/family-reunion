<script lang="ts">
import { getContext } from 'svelte'
import { enhance } from '$app/forms'
import { Button } from '$lib/components/ui/button'
import type { AdminContext } from '$lib/types/adminContext'
import { getAdminPhotos } from '../getAdminPhotos.remote'

const adminCtx = getContext<AdminContext>('admin')
const photosQuery = getAdminPhotos()
</script>

<svelte:head>
    <title>Manage Photos — Admin</title>
</svelte:head>

<section class="col-span-12">
    <h1>Photos</h1>
</section>

{#await photosQuery then photos}
    {@const filteredPhotos =
        adminCtx.selectedEventId === 'all'
            ? photos
            : photos.filter((p) => p.eventId === adminCtx.selectedEventId)}

    {#if filteredPhotos.length === 0}
        <section class="col-span-12">
            <p class="text-muted-foreground">No photos for the selected year.</p>
        </section>
    {:else}
        <section class="col-span-12">
            <div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {#each filteredPhotos as photo}
                    <div class="overflow-hidden rounded-lg border bg-card shadow-xs">
                        <figure>
                            <img
                                src={photo.url}
                                alt={photo.caption ?? 'Photo'}
                                class="w-full aspect-square object-cover" />
                        </figure>
                        <div class="p-3 space-y-2">
                            <p class="text-xs text-muted-foreground">{photo.eventTitle}</p>
                            {#if photo.caption}
                                <p class="text-sm truncate">{photo.caption}</p>
                            {/if}
                            <form
                                method="POST"
                                action="?/delete_photo"
                                use:enhance={() => {
                                    return async () => {
                                        photosQuery.refresh()
                                    }
                                }}>
                                <input type="hidden" name="photoId" value={photo.id} />
                                <input type="hidden" name="r2Key" value={photo.r2Key} />
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    size="sm"
                                    class="w-full">
                                    Delete
                                </Button>
                            </form>
                        </div>
                    </div>
                {/each}
            </div>
        </section>
    {/if}
{/await}
