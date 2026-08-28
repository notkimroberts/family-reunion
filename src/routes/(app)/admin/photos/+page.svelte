<script lang="ts">
import { CalendarDays, Images, Trash2 } from '@lucide/svelte'
import { enhance } from '$app/forms'
import { Button } from '$lib/components/ui/button'
import { getAdminPhotos } from '../getAdminPhotos.remote'

/* Remove-only. This page has exactly one action, delete_photo — uploading lives on /gallery, which
   attaches the file to the open reunion. Nothing here may read as an upload control. */

const photosQuery = getAdminPhotos()

/* Delete takes the file out of R2 as well, with no undo, so a card is armed before it can be submitted.
   Ids are unique, so an armed id left over after the grid refreshes points at a card that is already
   gone — harmless, and the reason no reset is needed in the enhance callback. */
let armedPhotoId = $state<string | undefined>(undefined)
</script>

<svelte:head>
    <title>Manage Photos — Admin</title>
</svelte:head>

<section class="col-span-12 flex flex-col gap-1 xl:col-span-8">
    <div class="text-muted-foreground flex items-center gap-2 text-sm">
        <a href="/admin/setup" class="transition-colors hover:text-foreground">Setup</a>
        <span>/</span>
        <span class="text-foreground font-medium">Photos</span>
    </div>
    <h1>Photos</h1>
    <p class="text-muted-foreground text-sm">
        Every photo in the gallery, all reunion years together. Photos are added on the
        <a href="/gallery" class="underline underline-offset-4 hover:text-foreground"
            >gallery page</a
        >; here you can only remove them. Removing a photo also deletes the stored file and cannot
        be undone.
    </p>
</section>

{#await photosQuery then photos}
    {#if photos.length === 0}
        <section class="col-span-12 xl:col-span-8">
            <div
                class="text-muted-foreground flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
                <Images class="size-4 shrink-0" />
                <p class="text-sm">
                    No photos yet. Add the first one from the
                    <a href="/gallery" class="underline underline-offset-4 hover:text-foreground"
                        >gallery page</a
                    >.
                </p>
            </div>
        </section>
    {:else}
        <section class="col-span-12">
            <!-- Two up at 375px on purpose: these are thumbnails to recognise, not data columns, and one
                 per row would be a 343px-tall card each. -->
            <div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {#each photos as photo (photo.id)}
                    <div class="flex flex-col overflow-hidden rounded-lg border bg-card">
                        <img
                            src={photo.url}
                            alt={photo.caption ?? 'Gallery photo'}
                            loading="lazy"
                            class="aspect-square w-full object-cover" />
                        <div class="flex flex-1 flex-col justify-between gap-3 p-3">
                            <div class="flex flex-col gap-1">
                                <div
                                    class="text-muted-foreground flex items-center gap-1.5 text-xs">
                                    <CalendarDays class="size-3 shrink-0" />
                                    <span class="truncate">{photo.eventTitle}</span>
                                </div>
                                {#if photo.caption}
                                    <p class="line-clamp-2 text-sm">{photo.caption}</p>
                                {/if}
                            </div>

                            <form
                                method="POST"
                                action="?/delete_photo"
                                use:enhance={() => {
                                    return async () => {
                                        photosQuery.refresh()
                                    }
                                }}>
                                <input type="hidden" name="photoId" value={photo.id} />
                                <!-- r2Key is what makes the server call deleteFile. Drop it and the row
                                     goes while the object stays in R2 with nothing left pointing at it. -->
                                <input type="hidden" name="r2Key" value={photo.r2Key} />
                                {#if armedPhotoId === photo.id}
                                    <div class="flex flex-col gap-2">
                                        <Button type="submit" variant="destructive" size="sm">
                                            Delete for good
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onclick={() => (armedPhotoId = undefined)}>
                                            Cancel
                                        </Button>
                                    </div>
                                {:else}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        class="text-muted-foreground w-full hover:text-destructive"
                                        onclick={() => (armedPhotoId = photo.id)}>
                                        <Trash2 class="size-4" />
                                        Delete
                                    </Button>
                                {/if}
                            </form>
                        </div>
                    </div>
                {/each}
            </div>
        </section>
    {/if}
{/await}
