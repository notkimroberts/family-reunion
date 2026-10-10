<script lang="ts">
import { now } from '@internationalized/date'
import { CalendarClock, CalendarPlus, X } from '@lucide/svelte'
import { tick, untrack } from 'svelte'
import { Button } from '$lib/components/ui/button'
import * as Field from '$lib/components/ui/field'
import { Input } from '$lib/components/ui/input'
import { REUNION_TIME_ZONE } from '$lib/general/constants'
import { formatReunionDateTime, parseReunionWallClock, toReunionWallClock } from '$lib/utils'

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
   print "7:00 AM" under a box reading 09:00 and read as a bug.

   NO DATE, NO BOX. An empty datetime-local is worse than blank on desktop Safari: it draws the
   current date and time as if set, beside a note saying nothing is set. So an unset date shows only
   the note and a Set button, and a set one gets a Clear button. A hidden box posts an explicit ''
   under `name`, which every action reads as "clear".

   `onValueChange` reports what the form would post, so the form can decide whether its Save has
   anything to save and whether the dates make sense together. Save lives on the form, not here: two
   cards hold two dates each behind one Save. */
let {
    id,
    name,
    label,
    value,
    emptyNote,
    disabled = false,
    onValueChange,
}: {
    id: string
    name: string
    label: string
    value: string
    emptyNote: string
    disabled?: boolean
    onValueChange?: (posted: string) => void
} = $props()

/* A local copy so the echo tracks what is typed rather than what was last saved. Seeded from the
   prop at mount and never re-read from it: after use:enhance re-runs the load this component is not
   remounted, and keeping the typed text is what we want either way — on success it equals what was
   saved, and on a rejected save the owner does not lose their edit. The form MUST enhance with
   keepValuesOnSave: a default reset sets this to '' after every successful save. */
let current = $state(untrack(() => value))
let isShown = $state(untrack(() => Boolean(value)))
let input = $state<HTMLInputElement | null>(null)

/* Seeded with the next whole hour rather than left empty: Safari keeps an empty box's value '' until
   every segment is typed, so editing only the day of its placeholder would post a blank. */
async function handleSet() {
    current = toReunionWallClock(
        now(REUNION_TIME_ZONE).add({ hours: 1 }).set({ minute: 0 }).toDate(),
    )
    isShown = true
    await tick()
    input?.focus()
}

function handleClear() {
    current = ''
    isShown = false
}

$effect(() => {
    onValueChange?.(isShown ? current : '')
})

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
    {#if isShown}
        <div class="flex items-center gap-2">
            <Input
                {id}
                {name}
                {disabled}
                type="datetime-local"
                bind:value={current}
                bind:ref={input} />
            <Button type="button" variant="outline" size="sm" {disabled} onclick={handleClear}>
                <X class="size-4" />
                Clear
            </Button>
        </div>
        <Field.Description>{echo ?? emptyNote}</Field.Description>
    {:else}
        <input type="hidden" {name} value="" />
        <Field.Description>{emptyNote}</Field.Description>
        <div>
            <Button type="button" variant="outline" size="sm" {disabled} onclick={handleSet}>
                <CalendarPlus class="size-4" />
                Set date
            </Button>
        </div>
    {/if}
</Field.Field>
