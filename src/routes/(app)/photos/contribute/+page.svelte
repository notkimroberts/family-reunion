<script lang="ts">
import { ArrowLeft, Upload } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import * as Field from '$lib/components/ui/field'
import { Input } from '$lib/components/ui/input'
import { Textarea } from '$lib/components/ui/textarea'
import type { ActionData, PageData } from './$types'
import PhotoUploadProgress from './PhotoUploadProgress.svelte'
import type { PhotoUpload } from './types'
import { uploadPhoto } from './uploadPhoto'

type Props = { data: PageData; form: ActionData }
let { data, form }: Props = $props()

const BYTES_PER_MB = 1024 * 1024

let sending = $state(false)
let uploads = $state<PhotoUpload[]>([])
let selectionError = $state<string | undefined>()
// Caption and name as they were on submit, so a retry sends what the first attempt sent.
let batchFields = { action: '', caption: '', contributorName: '' }
let formElement: HTMLFormElement | undefined = $state()

const maxMb = $derived(Math.floor(data.maxBytes / BYTES_PER_MB))

function readText(formData: FormData, name: string): string {
    const value = formData.get(name)
    return typeof value === 'string' ? value : ''
}

/* A file over the cap is failed here rather than sent: the server would refuse it anyway, and the
   whole body would cross the network first. */
function toUpload(file: File, id: number): PhotoUpload {
    const oversized = file.size > data.maxBytes
    return {
        id,
        file,
        status: oversized ? 'failed' : 'queued',
        sentBytes: 0,
        error: oversized ? `Larger than ${maxMb} MB.` : undefined,
        retryable: false,
    }
}

/* Sends each photo in its own request, one after another. A failure is recorded on that row and
   the loop moves on, so one bad file never costs the rest of the batch. Sequential, not parallel:
   each request is decoded by sharp on a small container, and memory is the constraint there. */
async function send(targets: PhotoUpload[]) {
    sending = true
    targets.forEach((upload) => {
        upload.status = 'queued'
        upload.sentBytes = 0
        upload.error = undefined
    })
    for (const upload of targets) {
        upload.status = 'uploading'
        const outcome = await uploadPhoto({
            ...batchFields,
            file: upload.file,
            onProgress: (sentBytes) => {
                upload.sentBytes = sentBytes
            },
        })
        if (outcome.ok) {
            upload.status = 'done'
        } else {
            upload.status = 'failed'
            upload.error = outcome.message
            upload.retryable = outcome.retryable
        }
    }
    sending = false
    // Clear the form only when nothing is left to retry, or pressing Send again duplicates photos.
    if (uploads.every((upload) => upload.status === 'done')) {
        formElement?.reset()
    }
}

function handleSubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault()
    if (sending) {
        return
    }
    const formData = new FormData(event.currentTarget)
    const files = formData
        .getAll('photos')
        .filter((entry): entry is File => entry instanceof File && entry.size > 0)

    if (files.length > data.maxPerRequest) {
        selectionError = `Please choose at most ${data.maxPerRequest} photos at a time.`
        return
    }
    selectionError = undefined
    batchFields = {
        action: event.currentTarget.action,
        caption: readText(formData, 'caption'),
        contributorName: readText(formData, 'contributorName'),
    }
    uploads = files.map(toUpload)
    void send(uploads.filter((upload) => upload.status === 'queued'))
}

function handleRetry() {
    void send(uploads.filter((upload) => upload.status === 'failed' && upload.retryable))
}
</script>

<svelte:head>
    <title>Add photos · Patterson Family Reunion</title>
</svelte:head>

<section class="col-span-12 flex flex-col gap-6 xl:col-span-8">
    <div class="flex flex-col gap-2">
        <a
            href="/photos"
            class="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm">
            <ArrowLeft class="size-4" />
            Back to the gallery
        </a>
        <h1>Add your photos</h1>
        <p class="text-muted-foreground">
            Photographs are checked by an organiser before they appear in the gallery, so it may be
            a day or two before yours shows up.
        </p>
    </div>

    {#if form?.message}
        <p
            class="rounded-lg border p-4 text-sm {form.accepted
                ? 'border-primary/30 bg-primary/5'
                : 'border-destructive/30 bg-destructive/5 text-destructive'}"
            role="status">
            {form.message}
        </p>
    {/if}

    <form
        method="POST"
        enctype="multipart/form-data"
        class="flex flex-col gap-6"
        bind:this={formElement}
        onsubmit={handleSubmit}>
        <Field.Group>
            <Field.Field>
                <Field.Label for="photos">Photos</Field.Label>
                <input
                    id="photos"
                    name="photos"
                    type="file"
                    accept="image/*"
                    multiple
                    required
                    class="border-input bg-background file:text-foreground w-full rounded-md border p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-transparent file:text-sm" />
                <Field.Description>
                    Up to {data.maxPerRequest} at a time, {maxMb} MB each. Location data is removed from
                    every photo before it is stored.
                </Field.Description>
                {#if selectionError}
                    <p class="text-destructive text-sm" role="alert">{selectionError}</p>
                {/if}
            </Field.Field>

            <Field.Field>
                <Field.Label for="contributorName">Your name (optional)</Field.Label>
                <Input id="contributorName" name="contributorName" maxlength={80} />
            </Field.Field>

            <Field.Field>
                <Field.Label for="caption">Caption (optional)</Field.Label>
                <Textarea id="caption" name="caption" maxlength={280} rows={3} />
                <Field.Description
                    >Who is in the photograph, or which reunion it is from.</Field.Description>
            </Field.Field>
        </Field.Group>

        <Button type="submit" disabled={sending} class="w-fit">
            <Upload class="size-4" />
            {sending ? 'Sending…' : 'Send photos'}
        </Button>
    </form>

    {#if uploads.length > 0}
        <PhotoUploadProgress {uploads} {sending} onRetry={handleRetry} />
    {/if}
</section>
