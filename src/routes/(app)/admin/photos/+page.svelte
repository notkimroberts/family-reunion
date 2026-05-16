<script lang="ts">
import { enhance } from '$app/forms'
import { Button } from '$lib/components/ui/button'

let { data } = $props()
</script>

<svelte:head>
    <title>Manage Photos — Admin</title>
</svelte:head>

{#if data.photos.length === 0}
    <section class="col-span-12">
        <p class="text-muted-foreground">No photos uploaded yet.</p>
    </section>
{:else}
    <section class="col-span-12">
        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {#each data.photos as photo}
                <div class="rounded-lg border bg-card overflow-hidden shadow-xs">
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
                        <form method="POST" action="?/delete_photo" use:enhance>
                            <input type="hidden" name="photoId" value={photo.id} />
                            <input type="hidden" name="r2Key" value={photo.r2Key} />
                            <Button type="submit" variant="destructive" size="sm" class="w-full">
                                Delete
                            </Button>
                        </form>
                    </div>
                </div>
            {/each}
        </div>
    </section>
{/if}
