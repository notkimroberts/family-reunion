<script lang="ts">
import { ExternalLink, Trash2 } from '@lucide/svelte'
import { enhance } from '$app/forms'
import { Button } from '$lib/components/ui/button'
import type { ModerationPhoto } from '$lib/server/photos'

/* Photos already published for this year.

   Distinct from the moderation queue above it, which is the pending inbox. This exists because
   without it the lens said "nothing waiting" beside 290 live photos, which reads as data loss —
   and because there was no way at all to take something down once approved. Denser than the queue
   on purpose: these need scanning, not deciding. */

type Props = { photos: ModerationPhoto[] }
let { photos }: Props = $props()
</script>

<div class="flex flex-col gap-3">
    <div class="flex items-baseline justify-between gap-3">
        <h2 class="text-sm font-medium">
            Published · {photos.length}
            {photos.length === 1 ? 'photo' : 'photos'}
        </h2>
        <a
            href="/photos"
            target="_blank"
            rel="noopener"
            class="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
            View the gallery
            <ExternalLink class="size-3" />
        </a>
    </div>

    <ul class="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {#each photos as photo (photo.id)}
            <li class="group relative">
                <a href="/photos/{photo.id}" target="_blank" rel="noopener">
                    <img
                        src="/api/photos/{photo.id}/thumb"
                        alt={photo.caption ?? 'Published photograph'}
                        class="bg-muted aspect-square w-full rounded object-cover"
                        loading="lazy" />
                </a>
                <!-- Unpublish rather than delete: it is the reversible one, and an organiser
                     reaching for this in a hurry should not need to be sure. Deleting for good is
                     still available from the queue once it lands back there as rejected. -->
                <form
                    method="POST"
                    action="?/moderate_photo"
                    use:enhance
                    class="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <input type="hidden" name="photoId" value={photo.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <Button
                        type="submit"
                        size="icon"
                        variant="secondary"
                        class="size-7"
                        title="Take down"
                        aria-label="Take this photo down">
                        <Trash2 class="size-3.5" />
                    </Button>
                </form>
            </li>
        {/each}
    </ul>
</div>
