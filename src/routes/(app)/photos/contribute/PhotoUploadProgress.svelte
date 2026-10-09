<script lang="ts">
import { RotateCcw } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import { Progress } from '$lib/components/ui/progress'
import PhotoUploadRow from './PhotoUploadRow.svelte'
import type { PhotoUpload } from './types'

type Props = { uploads: PhotoUpload[]; sending: boolean; onRetry: () => void }
let { uploads, sending, onRetry }: Props = $props()

/* A finished file counts in full whether it arrived or not, so the bar reaches the end. */
function settledBytes(upload: PhotoUpload): number {
    if (upload.status === 'uploading') {
        return upload.sentBytes
    }
    return upload.status === 'queued' ? 0 : upload.file.size
}

const totalBytes = $derived(uploads.reduce((sum, upload) => sum + upload.file.size, 0))
const sentBytes = $derived(uploads.reduce((sum, upload) => sum + settledBytes(upload), 0))
const doneCount = $derived(uploads.filter((upload) => upload.status === 'done').length)
const failedCount = $derived(uploads.filter((upload) => upload.status === 'failed').length)
const retryableCount = $derived(
    uploads.filter((upload) => upload.status === 'failed' && upload.retryable).length,
)
const position = $derived(
    uploads.findIndex((upload) => upload.status === 'uploading') + 1 || doneCount + failedCount,
)

function plural(count: number): string {
    return `${count} photo${count === 1 ? '' : 's'}`
}

const summary = $derived.by(() => {
    if (sending) {
        return `Sending ${position} of ${uploads.length}…`
    }
    if (failedCount === 0) {
        return `Thank you — ${plural(doneCount)} received. An organizer will review them soon.`
    }
    if (doneCount === 0) {
        return `None of the photos were sent.`
    }
    return `${plural(doneCount)} received. ${plural(failedCount)} could not be sent.`
})
</script>

<div class="flex flex-col gap-3 rounded-lg border p-4">
    <p class="text-sm font-medium" role="status" aria-live="polite">{summary}</p>
    <Progress
        value={totalBytes > 0 ? (sentBytes / totalBytes) * 100 : 0}
        max={100}
        aria-label="Upload progress" />
    <ul class="divide-y">
        {#each uploads as upload (upload.id)}
            <PhotoUploadRow {upload} />
        {/each}
    </ul>
    {#if !sending && retryableCount > 0}
        <Button variant="outline" class="w-fit" onclick={onRetry}>
            <RotateCcw class="size-4" />
            Try {retryableCount === 1 ? 'it' : `those ${retryableCount}`} again
        </Button>
    {/if}
</div>
