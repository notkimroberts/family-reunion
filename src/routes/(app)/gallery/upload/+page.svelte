<script lang="ts">
import { enhance } from '$app/forms'
import { Alert, AlertDescription } from '$lib/components/ui/alert'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'

let { data, form } = $props()
</script>

{#if form?.error}
    <div class="col-span-12">
        <Alert variant="destructive">
            <AlertDescription>{form.error}</AlertDescription>
        </Alert>
    </div>
{/if}

<section class="col-span-12 xl:col-span-6">
    <Card>
        <CardHeader>
            <CardTitle>Upload Photo</CardTitle>
        </CardHeader>
        <CardContent>
            {#if data.events.length === 0}
                <Alert>
                    <AlertDescription>No active events to upload photos to.</AlertDescription>
                </Alert>
            {:else}
                <form method="POST" enctype="multipart/form-data" use:enhance class="space-y-4">
                    <div class="space-y-2">
                        <label for="eventId" class="text-sm font-medium">Event</label>
                        <select
                            id="eventId"
                            name="eventId"
                            class="w-full border rounded-md px-3 py-2 text-sm bg-background"
                            required>
                            {#each data.events as event}
                                <option value={event.id}>{event.title} ({event.year})</option>
                            {/each}
                        </select>
                    </div>

                    <div class="space-y-2">
                        <label for="photo" class="text-sm font-medium">Photo</label>
                        <Input
                            id="photo"
                            name="photo"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            required />
                        <p class="text-xs text-muted-foreground">
                            Max 10MB. JPEG, PNG, WebP, or GIF.
                        </p>
                    </div>

                    <div class="space-y-2">
                        <label for="caption" class="text-sm font-medium">Caption (optional)</label>
                        <Input
                            id="caption"
                            name="caption"
                            type="text"
                            placeholder="Describe this photo..." />
                    </div>

                    <div class="flex gap-4">
                        <Button href="/gallery" variant="ghost">Cancel</Button>
                        <Button type="submit" class="grow">Upload</Button>
                    </div>
                </form>
            {/if}
        </CardContent>
    </Card>
</section>
