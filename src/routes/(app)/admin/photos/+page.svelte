<script lang="ts">
import { enhance } from '$app/forms'

let { data } = $props()
</script>

<svelte:head>
    <title>Manage Photos — Admin</title>
</svelte:head>

{#if data.photos.length === 0}
    <section class="col-span-12">
        <p class="text-base-content/60">No photos uploaded yet.</p>
    </section>
{:else}
    <section class="col-span-12">
        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {#each data.photos as photo}
                <div class="card bg-base-100 shadow-xs overflow-hidden">
                    <figure>
                        <img
                            src={photo.url}
                            alt={photo.caption ?? 'Photo'}
                            class="w-full aspect-square object-cover" />
                    </figure>
                    <div class="card-body p-3">
                        <p class="text-xs text-base-content/60">{photo.eventTitle}</p>
                        {#if photo.caption}
                            <p class="text-sm truncate">{photo.caption}</p>
                        {/if}
                        <form method="POST" action="?/delete_photo" use:enhance>
                            <input type="hidden" name="photoId" value={photo.id} />
                            <input type="hidden" name="r2Key" value={photo.r2Key} />
                            <button type="submit" class="btn btn-error btn-xs w-full"
                                >Delete</button>
                        </form>
                    </div>
                </div>
            {/each}
        </div>
    </section>
{/if}
