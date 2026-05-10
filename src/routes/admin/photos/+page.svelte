<script lang="ts">
import { enhance } from '$app/forms'

let { data } = $props()
</script>

<svelte:head>
    <title>Manage Photos — Admin</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Manage Photos</h1>

    {#if data.photos.length === 0}
        <p class="text-base-content/60">No photos uploaded yet.</p>
    {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {#each data.photos as photo}
                <div class="card bg-base-100 shadow-xs">
                    <figure>
                        <img
                            src={photo.url}
                            alt={photo.caption ?? 'Photo'}
                            class="w-full h-48 object-cover" />
                    </figure>
                    <div class="card-body p-3">
                        <p class="text-xs text-base-content/60">{photo.eventTitle}</p>
                        {#if photo.caption}
                            <p class="text-sm">{photo.caption}</p>
                        {/if}
                        <form method="POST" action="?/delete_photo" use:enhance>
                            <input type="hidden" name="photoId" value={photo.id} />
                            <input type="hidden" name="r2Key" value={photo.r2Key} />
                            <button type="submit" class="btn btn-error btn-xs">Delete</button>
                        </form>
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    <div class="mt-4">
        <a href="/admin" class="btn btn-ghost">&larr; Back to Dashboard</a>
    </div>
</div>
