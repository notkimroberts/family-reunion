<script lang="ts">
import { Check, ImageOff, Trash2, X } from '@lucide/svelte'
import { enhance } from '$app/forms'
import { Button } from '$lib/components/ui/button'
import type { ModerationPhoto } from '$lib/server/photos'

type Props = { photos: ModerationPhoto[] }
let { photos }: Props = $props()
</script>

{#if photos.length === 0}
    <div
        class="border-border text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
        <ImageOff class="size-8" />
        <p>Nothing waiting. Contributed photos land here before anyone can see them.</p>
    </div>
{:else}
    <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each photos as photo (photo.id)}
            <li class="border-border flex flex-col gap-3 rounded-lg border p-3">
                <!-- The admin variant of the byte proxy serves pending photos; the public one does
                     not. An organiser cannot decide on something they are not allowed to see. -->
                <img
                    src="/api/photos/{photo.id}/display"
                    alt={photo.caption ?? 'Contributed photograph awaiting review'}
                    class="bg-muted max-h-64 w-full rounded object-contain"
                    loading="lazy" />

                <div class="flex flex-col gap-1 text-sm">
                    {#if photo.caption}
                        <p class="break-words">{photo.caption}</p>
                    {/if}
                    <p class="text-muted-foreground text-xs">
                        {photo.contributorName ?? 'Anonymous'} · {photo.width}×{photo.height}
                    </p>
                </div>

                <div class="flex flex-wrap gap-2">
                    <form method="POST" action="?/moderate_photo" use:enhance>
                        <input type="hidden" name="photoId" value={photo.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <Button type="submit" size="sm">
                            <Check class="size-3.5" />
                            Approve
                        </Button>
                    </form>
                    <form method="POST" action="?/moderate_photo" use:enhance>
                        <input type="hidden" name="photoId" value={photo.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <Button type="submit" size="sm" variant="outline">
                            <X class="size-3.5" />
                            Reject
                        </Button>
                    </form>
                    <form method="POST" action="?/moderate_photo" use:enhance>
                        <input type="hidden" name="photoId" value={photo.id} />
                        <input type="hidden" name="decision" value="delete" />
                        <Button type="submit" size="sm" variant="ghost">
                            <Trash2 class="size-3.5" />
                            Delete
                        </Button>
                    </form>
                </div>
            </li>
        {/each}
    </ul>
{/if}
