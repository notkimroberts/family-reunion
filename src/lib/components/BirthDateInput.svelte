<script lang="ts">
import { Select as BitsSelect } from 'bits-ui'
import { Input } from '$lib/components/ui/input'
import * as Select from '$lib/components/ui/select'

const MONTHS = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
]

type Props = {
    /* Three-way bound — caller controls year/month/day independently. */
    year: number | null
    month: number | null
    day: number | null
    idPrefix: string
    yearRequired?: boolean
}

let {
    year = $bindable(null),
    month = $bindable(null),
    day = $bindable(null),
    idPrefix,
    yearRequired = false,
}: Props = $props()

const currentYear = new Date().getFullYear()

let yearStr = $state(year ? String(year) : '')
let monthStr = $state(month ? String(month) : '')
let dayStr = $state(day ? String(day) : '')

$effect(() => {
    const n = parseInt(yearStr, 10)
    year = Number.isFinite(n) && n > 0 && n <= currentYear ? n : null
})
$effect(() => {
    const n = parseInt(monthStr, 10)
    month = Number.isFinite(n) && n >= 1 && n <= 12 ? n : null
})
$effect(() => {
    const n = parseInt(dayStr, 10)
    day = Number.isFinite(n) && n >= 1 && n <= 31 ? n : null
})

/* Disable month if no year, day if no month — surfaces the prefix-consistency rule. */
let monthDisabled = $derived(year === null)
let dayDisabled = $derived(month === null)
</script>

<div class="grid grid-cols-3 gap-3">
    <div class="space-y-1">
        <label for="{idPrefix}-month" class="text-xs font-medium text-muted-foreground"
            >Month</label>
        <Select.Root
            type="single"
            value={monthStr}
            onValueChange={(v) => {
                monthStr = v
                if (!v) {
                    dayStr = ''
                }
            }}
            disabled={monthDisabled}>
            <Select.Trigger id="{idPrefix}-month" class="w-full">
                <BitsSelect.Value placeholder="Unknown" />
            </Select.Trigger>
            <Select.Content>
                <Select.Item value="" label="Unknown" />
                {#each MONTHS as m (m.value)}
                    <Select.Item value={m.value} label={m.label} />
                {/each}
            </Select.Content>
        </Select.Root>
    </div>
    <div class="space-y-1">
        <label for="{idPrefix}-day" class="text-xs font-medium text-muted-foreground">Day</label>
        <Input
            id="{idPrefix}-day"
            type="number"
            inputmode="numeric"
            bind:value={dayStr}
            min="1"
            max="31"
            placeholder="—"
            disabled={dayDisabled} />
    </div>
    <div class="space-y-1">
        <label for="{idPrefix}-year" class="text-xs font-medium text-muted-foreground">
            Year{yearRequired ? ' *' : ''}
        </label>
        <Input
            id="{idPrefix}-year"
            type="number"
            inputmode="numeric"
            bind:value={yearStr}
            min="1"
            max={currentYear}
            placeholder="1880"
            required={yearRequired} />
    </div>
</div>
