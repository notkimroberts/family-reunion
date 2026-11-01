<script lang="ts">
import { NotebookPen } from '@lucide/svelte'
import { SvelteMap } from 'svelte/reactivity'
import { enhance } from '$app/forms'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Textarea } from '$lib/components/ui/textarea'
import type { RegistrationNote } from '$lib/server/registrations'
import { formatViewerDateTime } from '$lib/utils'
import { NOTE_MAX_LENGTH } from './schema'

/* Organizer notes on this booking: what a family was told, what they promised. Organizers only — the
   registrant never sees them. Append-only, so a correction is a new note.

   Plain use:enhance on purpose: its reset on success is what should happen here, as on add_tier — the
   field empties for the next note. */
interface Props {
    notes: RegistrationNote[]
    error: string | undefined
}

let { notes, error }: Props = $props()

/* In the reader's zone, after mount — see RegistrationHistory for why not during SSR. */
let formattedTimes = new SvelteMap<string, string>()

$effect(() => {
    for (const note of notes) {
        formattedTimes.set(note.id, formatViewerDateTime(note.createdAt))
    }
})
</script>

<Card>
    <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base">
            <NotebookPen class="text-muted-foreground size-4" />
            Notes
        </CardTitle>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
        <form method="POST" action="?/add_note" use:enhance class="flex flex-col gap-2">
            <Textarea
                name="body"
                rows={2}
                maxlength={NOTE_MAX_LENGTH}
                required
                aria-label="New note"
                aria-invalid={error ? true : undefined}
                placeholder="e.g. Called Nov 3 — check is in the mail" />
            {#if error}
                <p class="text-destructive text-sm">{error}</p>
            {/if}
            <p class="text-muted-foreground text-xs">Only organizers see notes.</p>
            <Button type="submit" size="sm" variant="outline" class="self-end">Add note</Button>
        </form>

        {#if notes.length > 0}
            <ul class="flex flex-col gap-3">
                {#each notes as note (note.id)}
                    {@const iso = new Date(note.createdAt).toISOString()}
                    <li class="flex flex-col gap-0.5 border-l-2 pl-3 text-sm">
                        <p class="whitespace-pre-line">{note.body}</p>
                        <span class="text-muted-foreground text-xs">
                            <time datetime={iso}>{formattedTimes.get(note.id) ?? iso}</time>
                            · {note.authorName ?? 'a removed account'}
                        </span>
                    </li>
                {/each}
            </ul>
        {/if}
    </CardContent>
</Card>
