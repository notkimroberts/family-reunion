<script lang="ts">
import { ArrowLeft, Upload } from '@lucide/svelte'
import { enhance } from '$app/forms'
import { Button } from '$lib/components/ui/button'
import * as Field from '$lib/components/ui/field'
import { Input } from '$lib/components/ui/input'
import { Textarea } from '$lib/components/ui/textarea'
import type { ActionData, PageData } from './$types'

type Props = { data: PageData; form: ActionData }
let { data, form }: Props = $props()

let submitting = $state(false)

const maxMb = $derived(Math.floor(data.maxBytes / (1024 * 1024)))
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
        use:enhance={() => {
            submitting = true
            return async ({ update }) => {
                submitting = false
                await update()
            }
        }}>
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

        <Button type="submit" disabled={submitting} class="w-fit">
            <Upload class="size-4" />
            {submitting ? 'Uploading…' : 'Send photos'}
        </Button>
    </form>
</section>
