<script lang="ts">
import { enhance } from '$app/forms'

let { data, form } = $props()
</script>

{#if form?.error}
    <div class="alert alert-error col-span-12">
        <span>{form.error}</span>
    </div>
{/if}

<section class="card bg-base-100 col-span-12 xl:col-span-6 shadow-xs">
    <div class="card-body">
        <h2 class="card-title">Upload Photo</h2>

        {#if data.events.length === 0}
            <div class="alert alert-warning">
                <span>No active events to upload photos to.</span>
            </div>
        {:else}
            <form method="POST" enctype="multipart/form-data" use:enhance class="space-y-4">
                <fieldset class="fieldset w-full">
                    <label class="label">Event</label>
                    <select name="eventId" class="select w-full" required>
                        {#each data.events as event}
                            <option value={event.id}>{event.title} ({event.year})</option>
                        {/each}
                    </select>
                </fieldset>

                <fieldset class="fieldset w-full">
                    <label class="label">Photo</label>
                    <input
                        name="photo"
                        type="file"
                        class="file-input w-full"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        required />
                    <p class="text-xs text-base-content/50 mt-1">
                        Max 10MB. JPEG, PNG, WebP, or GIF.
                    </p>
                </fieldset>

                <fieldset class="fieldset w-full">
                    <label class="label">Caption (optional)</label>
                    <input
                        name="caption"
                        type="text"
                        class="input w-full"
                        placeholder="Describe this photo..." />
                </fieldset>

                <div class="flex gap-4">
                    <a href="/gallery" class="btn btn-ghost">Cancel</a>
                    <button type="submit" class="btn btn-primary grow">Upload</button>
                </div>
            </form>
        {/if}
    </div>
</section>
