<script lang="ts">
import { CalendarClock } from '@lucide/svelte'
import * as Field from '$lib/components/ui/field'
import { Input } from '$lib/components/ui/input'
import { formatReunionDateTime, parseReunionWallClock } from '$lib/utils'

/* A datetime-local field that says what it holds even when it holds nothing.

   WHY THIS EXISTS. On iOS Safari an empty <input type="datetime-local"> draws no placeholder and no
   picker glyph, so the lock date rendered as a blank rounded box with nothing to say it was a date
   field at all. Start and End looked fine only because they happened to have values. The control
   itself is the right one — a native wheel picker, a Tab stop in every browser, no JavaScript — so
   this puts the affordance around it rather than replacing it.

   NOT the DatePicker component: that one is date-only and carries maxValue={today()}, because it
   exists for birthdays. Every date on this page is a future datetime, so DatePicker could not express
   any of them.

   `echo` reads the value back with the same pair the server and the public pages use —
   parseReunionWallClock in, formatReunionDateTime out — so the box, the saved instant and the deadline
   shown to the family cannot describe three different times. Formatting in the reader's zone would
   print "7:00 AM" under a box reading 09:00 and read as a bug. */
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
    /* The same reading the server will give the posted value. Seconds are optional in the box's value
       and valid either way. */
    const parsed = parseReunionWallClock(current)
    return parsed ? formatReunionDateTime(parsed, 'short') : undefined
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
