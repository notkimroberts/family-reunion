<script lang="ts">
import { Download } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import { photoFilename } from '$lib/general/photos'

type Props = { photoId: string }
let { photoId }: Props = $props()

/* A touch device, where the share sheet's "Save Image" reaches the photo library. A desktop share
   sheet offers no save, so a desktop keeps the plain download. */
const COARSE_POINTER_QUERY = '(pointer: coarse)'

let downloadHref = $derived(`/api/photos/${photoId}/display?download`)
let shareableFile = $state<File | undefined>(undefined)

/* Fetch the file before the tap: Safari refuses share() once the tap's activation has expired,
   which an await on the network can outlast. Same URL as the <img>, so the private cache usually
   answers it with no extra transfer. */
$effect(() => {
    shareableFile = undefined
    if (!window.matchMedia(COARSE_POINTER_QUERY).matches || !navigator.canShare) {
        return
    }
    const controller = new AbortController()
    const id = photoId
    fetch(`/api/photos/${id}/display`, { signal: controller.signal })
        .then((response) => (response.ok ? response.blob() : undefined))
        .then((blob) => {
            if (!blob) {
                return
            }
            const file = new File([blob], photoFilename(id), { type: blob.type })
            if (navigator.canShare({ files: [file] })) {
                shareableFile = file
            }
        })
        .catch(() => {})
    return () => controller.abort()
})

/* Until the file is ready, or where sharing files is unsupported, the link downloads as before. */
async function handleClick(event: MouseEvent) {
    if (!shareableFile) {
        return
    }
    event.preventDefault()
    try {
        await navigator.share({ files: [shareableFile] })
    } catch (error) {
        // AbortError is the visitor closing the sheet; anything else falls back to the download
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
            window.location.href = downloadHref
        }
    }
}
</script>

<Button href={downloadHref} size="sm" onclick={handleClick}>
    <Download class="size-4" />
    {shareableFile ? 'Save' : 'Download'}
</Button>
