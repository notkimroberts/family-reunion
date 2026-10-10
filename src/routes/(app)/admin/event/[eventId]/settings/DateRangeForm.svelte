<script lang="ts">
import { Save } from '@lucide/svelte'
import { untrack } from 'svelte'
import { enhance } from '$app/forms'
import { DateTimeField } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import { keepValuesOnSave, parseReunionWallClock, toReunionWallClock } from '$lib/utils'

/* Two dates in order behind one Save: the registration window and the reunion's own dates.

   Save is HIDDEN while there is nothing to save — no date open and none stored — and DISABLED while
   nothing differs from what is stored, while the two dates are out of order, or while `disabled`
   (an archived year). The server refuses the same order, so this is a courtesy, not the guard. */
type DateFieldConfig = {
    name: string
    label: string
    stored: Date | string | null
    emptyNote: string
}

let {
    action,
    first,
    second,
    allowEqual,
    orderError,
    disabled = false,
    warn,
}: {
    action: string
    first: DateFieldConfig
    second: DateFieldConfig
    allowEqual: boolean
    orderError: string
    disabled?: boolean
    warn?: (firstValue: string, secondValue: string) => string | undefined
} = $props()

const storedFirst = $derived(toReunionWallClock(first.stored))
const storedSecond = $derived(toReunionWallClock(second.stored))

/* What each field would post. Seeded once like DateTimeField's own copy, then reported by it. */
let firstValue = $state(untrack(() => toReunionWallClock(first.stored)))
let secondValue = $state(untrack(() => toReunionWallClock(second.stored)))

const isDirty = $derived(firstValue !== storedFirst || secondValue !== storedSecond)
const hasAnything = $derived(Boolean(firstValue || secondValue || storedFirst || storedSecond))

const isOutOfOrder = $derived.by(() => {
    const firstDate = parseReunionWallClock(firstValue)
    const secondDate = parseReunionWallClock(secondValue)
    if (!firstDate || !secondDate) {
        return false
    }
    return allowEqual ? secondDate < firstDate : secondDate <= firstDate
})

const warning = $derived(warn?.(firstValue, secondValue))
</script>

<form method="POST" {action} use:enhance={keepValuesOnSave} class="flex flex-col gap-4">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DateTimeField
            id={first.name}
            name={first.name}
            label={first.label}
            value={storedFirst}
            emptyNote={first.emptyNote}
            {disabled}
            onValueChange={(posted) => (firstValue = posted)} />
        <DateTimeField
            id={second.name}
            name={second.name}
            label={second.label}
            value={storedSecond}
            emptyNote={second.emptyNote}
            {disabled}
            onValueChange={(posted) => (secondValue = posted)} />
    </div>
    {#if isOutOfOrder}
        <p class="text-destructive text-sm">{orderError}</p>
    {:else if warning}
        <p class="text-sm text-amber-700 dark:text-amber-400">{warning}</p>
    {/if}
    {#if hasAnything}
        <div>
            <Button
                type="submit"
                size="sm"
                variant="secondary"
                disabled={disabled || !isDirty || isOutOfOrder}>
                <Save class="size-4" />
                Save dates
            </Button>
        </div>
    {/if}
</form>
