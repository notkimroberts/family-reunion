<script lang="ts">
import { ArrowLeft, Eye, Send, TriangleAlert } from '@lucide/svelte'
import type { SubmitFunction } from '@sveltejs/kit'
import { enhance } from '$app/forms'
import { Alert, AlertDescription } from '$lib/components/ui/alert'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'
import * as Field from '$lib/components/ui/field'
import { Input } from '$lib/components/ui/input'
import { Textarea } from '$lib/components/ui/textarea'
import AnnouncementHistory from './AnnouncementHistory.svelte'
import { BODY_MAX_LENGTH, SUBJECT_MAX_LENGTH } from './schema'

/* The owner's email to every family. Preview and test first; Send asks for the count to be ticked,
   so the number of inboxes about to be filled is read, not assumed. */
const AUDIENCES = [
    { value: 'confirmed', label: 'Families coming', hint: 'Paid and covered bookings' },
    {
        value: 'everyone_active',
        label: 'Everyone still in',
        hint: 'Adds bookings not yet paid',
    },
] as const

let { data, form } = $props()

let audience = $state<(typeof AUDIENCES)[number]['value']>('confirmed')
let confirmed = $state(false)
/* True while any action is in flight, so a second press of Send cannot start a second announcement. */
let submitting = $state(false)
let recipientCount = $derived(data.recipientCounts[audience])
let archived = $derived(data.event.status === 'archived')

/* Keeps what was typed after every action — preview and test are steps towards a send, not the end
   of one. The confirmation is cleared after a send so a second one has to be ticked again. */
const handleSubmit: SubmitFunction = ({ action }) => {
    submitting = true
    return async ({ update }) => {
        await update({ reset: false })
        submitting = false
        if (action.search === '?/send') {
            confirmed = false
        }
    }
}
</script>

<svelte:head>
    <title>Email families — {data.event.title}</title>
</svelte:head>

<section class="col-span-12 flex flex-col gap-4 xl:col-span-8">
    <nav aria-label="Breadcrumb" class="text-muted-foreground flex items-center gap-2 text-sm">
        <a href="/admin" class="hover:text-foreground transition-colors">Reunions</a>
        <span aria-hidden="true">/</span>
        <a
            href="/admin/event/{data.event.id}/registrations"
            class="hover:text-foreground transition-colors">
            {data.event.year}
        </a>
        <span aria-hidden="true">/</span>
        <span class="text-foreground">Email families</span>
    </nav>

    <h1>Email families</h1>

    <Alert>
        <TriangleAlert class="size-4" />
        <AlertDescription>
            Every email already says the only three ways to pay. Never ask for money any other way
            here — families are told that any message which does is a scam.
        </AlertDescription>
    </Alert>

    {#if form?.error}
        <Alert variant="destructive">
            <AlertDescription>{form.error}</AlertDescription>
        </Alert>
    {:else if form?.testSentTo}
        <Alert><AlertDescription>Test sent to {form.testSentTo}.</AlertDescription></Alert>
    {:else if form?.sent}
        <Alert variant={form.sent.finished ? 'default' : 'destructive'}>
            <AlertDescription>
                {form.sent.finished
                    ? `Sent to ${form.sent.total} families.`
                    : `Stopped after ${form.sent.sentCount} of ${form.sent.total} families. Use “Send to the rest” below to finish.`}
            </AlertDescription>
        </Alert>
    {/if}

    <Card>
        <CardContent>
            <form method="POST" use:enhance={handleSubmit} class="flex flex-col gap-4">
                <Field.Set>
                    <Field.Legend>Send to</Field.Legend>
                    <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {#each AUDIENCES as option (option.value)}
                            <label
                                class="has-checked:border-primary flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm">
                                <input
                                    type="radio"
                                    name="audience"
                                    value={option.value}
                                    bind:group={audience}
                                    class="accent-primary mt-0.5 min-h-0" />
                                <span class="flex flex-col">
                                    <span class="font-medium">
                                        {option.label} ({data.recipientCounts[option.value]})
                                    </span>
                                    <span class="text-muted-foreground text-xs">{option.hint}</span>
                                </span>
                            </label>
                        {/each}
                    </div>
                </Field.Set>

                <Field.Field>
                    <Field.Label for="subject">Subject</Field.Label>
                    <Input id="subject" name="subject" maxlength={SUBJECT_MAX_LENGTH} required />
                </Field.Field>

                <Field.Field>
                    <Field.Label for="body">Message</Field.Label>
                    <Textarea
                        id="body"
                        name="body"
                        rows={10}
                        maxlength={BODY_MAX_LENGTH}
                        required />
                    <Field.Description>
                        Plain text. Leave a blank line between paragraphs.
                    </Field.Description>
                </Field.Field>

                <div class="flex flex-wrap gap-2">
                    <Button type="submit" formaction="?/preview" variant="outline" size="sm">
                        <Eye class="size-4" />
                        Preview
                    </Button>
                    <Button type="submit" formaction="?/send_test" variant="outline" size="sm">
                        Send me a test
                    </Button>
                </div>

                {#if !archived}
                    <div class="flex flex-col gap-3 border-t pt-4">
                        <input type="hidden" name="confirmCount" value={recipientCount} />
                        <label class="flex items-start gap-2 text-sm">
                            <input
                                type="checkbox"
                                bind:checked={confirmed}
                                class="accent-primary mt-0.5 size-5 min-h-0 shrink-0" />
                            <span>Send this to {recipientCount} families now.</span>
                        </label>
                        <Button
                            type="submit"
                            formaction="?/send"
                            disabled={!confirmed || recipientCount === 0 || submitting}
                            class="self-start">
                            <Send class="size-4" />
                            Send
                        </Button>
                    </div>
                {/if}
            </form>
        </CardContent>
    </Card>

    {#if form?.previewHtml}
        <!-- sandbox with no permissions: the preview runs no script and follows no link. -->
        <iframe
            title="Email preview"
            sandbox=""
            srcdoc={form.previewHtml}
            class="h-[40rem] w-full rounded-lg border bg-white"></iframe>
    {/if}

    <AnnouncementHistory announcements={data.announcements} {archived} />

    <Button href="/admin/event/{data.event.id}/registrations" variant="outline" class="self-start">
        <ArrowLeft class="size-4" />
        Back to registrations
    </Button>
</section>
