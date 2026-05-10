<script lang="ts">
import { enhance } from '$app/forms'
import PageTitle from '$lib/components/PageTitle.svelte'

let { data, form } = $props()
</script>

<PageTitle title="Upload Photos" />

<div class="max-w-lg mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Upload Photo</h1>

    {#if form?.error}
        <div class="alert alert-error mb-4">
            <span>{form.error}</span>
        </div>
    {/if}

    {#if data.events.length === 0}
        <div class="alert alert-warning">
            <span>No active events to upload photos to.</span>
        </div>
    {:else}
        <form method="POST" enctype="multipart/form-data" use:enhance class="space-y-4">
            <fieldset class="fieldset w-full">
                <legend class="fieldset-legend">Event</legend>
                <select name="eventId" class="select w-full" required>
                    {#each data.events as event}
                        <option value={event.id}>{event.title} ({event.year})</option>
                    {/each}
                </select>
            </fieldset>

            <fieldset class="fieldset w-full">
                <legend class="fieldset-legend">Photo</legend>
                <input
                    name="photo"
                    type="file"
                    class="file-input w-full"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    required />
                <p class="fieldset-label">Max 10MB. JPEG, PNG, WebP, or GIF.</p>
            </fieldset>

            <fieldset class="fieldset w-full">
                <legend class="fieldset-legend">Caption (optional)</legend>
                <input
                    name="caption"
                    type="text"
                    class="input w-full"
                    placeholder="Describe this photo..." />
            </fieldset>

            <button type="submit" class="btn btn-primary w-full">Upload</button>
        </form>
    {/if}

    <div class="mt-4">
        <a href="/gallery" class="btn btn-ghost">&larr; Back to Gallery</a>
    </div>
</div>
