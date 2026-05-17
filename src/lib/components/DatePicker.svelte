<script lang="ts">
import { parseDate, today, getLocalTimeZone, type DateValue } from '@internationalized/date'
import { CalendarIcon } from '@lucide/svelte'
import { Button } from '$lib/components/ui/button'
import { Calendar } from '$lib/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover'

type Props = {
    value?: string
    onchange?: (value: string | undefined) => void
    placeholder?: string
    disabled?: boolean
    id?: string
}

let {
    value = $bindable(undefined),
    onchange,
    placeholder = 'Pick a date',
    disabled = false,
    id,
}: Props = $props()

let open = $state(false)

let calendarDate = $derived.by((): DateValue | undefined => {
    if (!value) return undefined
    try {
        return parseDate(value)
    } catch {
        return undefined
    }
})

let displayValue = $derived(
    calendarDate
        ? calendarDate.toDate('UTC').toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
          })
        : undefined,
)

function handleSelect(date: DateValue | undefined) {
    const str = date?.toString()
    value = str
    onchange?.(str)
    open = false
}
</script>

<Popover bind:open>
    <PopoverTrigger
        {id}
        type="button"
        {disabled}
        class="border-input bg-background ring-offset-background flex h-9 w-full items-center justify-start gap-2 rounded-md border px-3 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 {!displayValue
            ? 'text-muted-foreground'
            : ''}">
        <CalendarIcon class="h-4 w-4 shrink-0 opacity-50" />
        {displayValue ?? placeholder}
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
        <Calendar
            type="single"
            value={calendarDate}
            onValueChange={handleSelect}
            captionLayout="dropdown"
            maxValue={today(getLocalTimeZone())} />
    </PopoverContent>
</Popover>
