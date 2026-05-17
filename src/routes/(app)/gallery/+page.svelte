<script lang="ts">
import { Plus } from '@lucide/svelte'
import { enhance } from '$app/forms'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '$lib/components/ui/dialog'
import { Input } from '$lib/components/ui/input'
import { APP_NAME } from '$lib/general/constants'

let { data, form } = $props()
let selectedEventId = $state(data.events[0]?.id ?? 'all')
let uploadOpen = $state(false)
let uploading = $state(false)

let latestEventId = $derived(data.events[0]?.id ?? '')

let filteredPhotos = $derived(
    selectedEventId === 'all'
        ? data.photos
        : data.photos.filter((p) => p.eventId === selectedEventId),
)

$effect(() => {
    if (form?.success) {
        uploadOpen = false
    }
})
</script>

<svelte:head>
    <title>Gallery — {APP_NAME}</title>
</svelte:head>
<section class="col-span-12">
    <div class="flex items-center gap-3">
        <div class="flex gap-2 overflow-x-auto pb-1 flex-1 scrollbar-none">
            <button
                class="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors {selectedEventId ===
                'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'}"
                onclick={() => (selectedEventId = 'all')}>
                All
            </button>
            {#each data.events as event}
                <button
                    class="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors {selectedEventId ===
                    event.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'}"
                    onclick={() => (selectedEventId = event.id)}>
                    {event.year}
                </button>
            {/each}
        </div>
        {#if latestEventId}
            <Button
                size="sm"
                class="hidden md:flex shrink-0 gap-1.5"
                onclick={() => (uploadOpen = true)}>
                <Plus class="h-4 w-4" />
                Upload
            </Button>
        {/if}
    </div>
</section>

{#if filteredPhotos.length === 0}
    <section class="col-span-12 text-center py-12">
        <p class="text-muted-foreground text-lg">No photos yet.</p>
        {#if latestEventId}
            <Button class="mt-4" onclick={() => (uploadOpen = true)}>
                Be the first to upload!
            </Button>
        {/if}
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

<!-- Mobile FAB -->
{#if latestEventId}
    <button
        class="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:hidden"
        onclick={() => (uploadOpen = true)}>
        <Plus class="h-6 w-6" />
    </button>
{/if}

<!-- Upload dialog -->
<Dialog bind:open={uploadOpen}>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Upload Photo</DialogTitle>
        </DialogHeader>
        <form
            method="POST"
            action="?/upload"
            enctype="multipart/form-data"
            use:enhance={() => {
                uploading = true
                return ({ update }) => {
                    uploading = false
                    update()
                }
            }}
            class="space-y-4 pt-2">
            {#if form?.error}
                <p class="text-sm text-destructive">{form.error}</p>
            {/if}
            <div class="space-y-2">
                <label for="uploadPhoto" class="text-sm font-medium">
                    Photo <span class="text-destructive">*</span>
                </label>
                <Input
                    id="uploadPhoto"
                    name="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    required />
                <p class="text-xs text-muted-foreground">Max 10MB. JPEG, PNG, WebP, or GIF.</p>
            </div>
            <div class="space-y-2">
                <label for="uploadCaption" class="text-sm font-medium">Caption (optional)</label>
                <Input
                    id="uploadCaption"
                    name="caption"
                    type="text"
                    placeholder="Describe this photo…" />
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onclick={() => (uploadOpen = false)}>
                    Cancel
                </Button>
                <Button type="submit" disabled={uploading}>
                    {uploading ? 'Uploading…' : 'Upload'}
                </Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>
