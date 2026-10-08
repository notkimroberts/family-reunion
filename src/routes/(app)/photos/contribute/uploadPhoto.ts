import type { ActionResult } from '@sveltejs/kit'
import { deserialize } from '$app/forms'
import { toUploadOutcome } from './toUploadOutcome'
import type { PhotoUploadOutcome } from './types'

type UploadPhotoInput = {
    action: string
    file: File
    caption: string
    contributorName: string
    onProgress: (sentBytes: number) => void
}

/* The body is not always an action result: a proxy's error page, or nothing at all. */
function readResult(responseText: string): ActionResult | undefined {
    try {
        return deserialize(responseText)
    } catch {
        return undefined
    }
}

/* Posts ONE photo to the form action, with the same headers `use:enhance` sends. One file per
   request keeps each body inside BODY_SIZE_LIMIT (20M on Railway), which the whole batch in one
   request did not. XMLHttpRequest, not fetch, because fetch reports no upload progress.

   Never rejects: every failure resolves to an outcome, so one bad file cannot stop the batch. */
export function uploadPhoto({
    action,
    file,
    caption,
    contributorName,
    onProgress,
}: UploadPhotoInput): Promise<PhotoUploadOutcome> {
    const body = new FormData()
    body.append('photos', file)
    body.append('caption', caption)
    body.append('contributorName', contributorName)

    return new Promise((resolve) => {
        const request = new XMLHttpRequest()
        const handleFailure = () => {
            resolve(toUploadOutcome(0, undefined))
        }

        request.open('POST', action)
        request.setRequestHeader('accept', 'application/json')
        request.setRequestHeader('x-sveltekit-action', 'true')
        // `loaded` counts the multipart framing too, so it can pass the file's own size.
        request.upload.addEventListener('progress', (event) => {
            onProgress(Math.min(event.loaded, file.size))
        })
        request.addEventListener('load', () => {
            resolve(toUploadOutcome(request.status, readResult(request.responseText)))
        })
        request.addEventListener('error', handleFailure)
        request.addEventListener('abort', handleFailure)
        request.addEventListener('timeout', handleFailure)
        request.send(body)
    })
}
