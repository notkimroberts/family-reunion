/* Where one file is in a contribution batch. */
export type PhotoUploadStatus = 'queued' | 'uploading' | 'done' | 'failed'

/* One file in a contribution batch. Each file is its own request, so each fails on its own. */
export type PhotoUpload = {
    id: number
    file: File
    status: PhotoUploadStatus
    sentBytes: number
    /* Why it failed, worded for the visitor. */
    error?: string
    /* False when sending the same bytes again cannot succeed: too large, or not a photo. */
    retryable: boolean
}

export type PhotoUploadOutcome = { ok: true } | { ok: false; message: string; retryable: boolean }
