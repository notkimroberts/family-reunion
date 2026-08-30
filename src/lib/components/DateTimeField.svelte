<script lang="ts" module>
import { CalendarClock } from '@lucide/svelte'
import * as Field from '$lib/components/ui/field'
import { Input } from '$lib/components/ui/input'

/* Formatted in UTC deliberately — see the note on `echo` below. Built once, at module load, which is
   safe only because timeZone is explicit: without it Intl would resolve to the environment's zone and
   render one string on the server and another in the browser. */
const DISPLAY_FORMAT = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
})
</script>

<script lang="ts">
/* A datetime-local field that says what it holds even when it holds nothing.

   WHY THIS EXISTS. On iOS Safari an empty <input type="datetime-local"> draws no placeholder and no
   picker glyph, so the lock date rendered as a blank rounded box with nothing to say it was a date
   field at all. Start and End looked fine only because they happened to have values. The control
   itself is the right one — a native wheel picker, a Tab stop in every browser, no JavaScript — so
   this puts the affordance around it rather than replacing it.

   NOT the DatePicker component: that one is date-only and carries maxValue={today()}, because it
   exists for birthdays. Every date on this page is a future datetime, so DatePicker could not express
   any of them.

   `echo` is formatted in UTC to match the digits in the box, not in the reader's zone. datetime-local
   posts a bare wall-clock string with no offset and the server parses it in its own zone, so the
   instant stored IS the typed digits read as UTC on Railway. Formatting the echo locally would print
   "9:00 AM" under a box reading 16:00 and read as a bug. */
let {
    id,
    name,
    label,
    value,
    emptyNote,
}: {
    id: string
    name: string
    label: string
    value: string
    emptyNote: string
} = $props()

/* A local copy so the echo tracks what is typed rather than what was last saved. Seeded from the
   prop at mount and never re-read from it: after use:enhance re-runs the load this component is not
   remounted, and keeping the typed text is what we want either way — on success it equals what was
   saved, and on a rejected save the owner does not lose their edit. */
let current = $state(value)

let echo = $derived.by(() => {
    if (!current) {
        return undefined
    }
    /* Appending Z reads the wall-clock digits as UTC. Seconds are optional in the value and valid
       either way. */
    const parsed = new Date(`${current}Z`)
    return Number.isNaN(parsed.getTime()) ? undefined : DISPLAY_FORMAT.format(parsed)
})
</script>

<Field.Field class="gap-2">
    <Field.Label for={id} class="flex items-center gap-1.5">
        <CalendarClock class="text-muted-foreground size-4 shrink-0" />
        {label}
    </Field.Label>
    <Input {id} {name} type="datetime-local" bind:value={current} />
    <Field.Description>
        {#if echo}
            {echo}
        {:else}
            {emptyNote}
        {/if}
    </Field.Description>
</Field.Field>
